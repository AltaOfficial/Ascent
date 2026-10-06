import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import {
  AdvisorMemoryEntity,
  AdvisorMessageEntity,
  AdvisorRole,
  AdvisorThreadEntity,
} from './entities/advisor.entities';
import {
  AdvisorLiveData,
  AdvisorMemory,
  buildLiveDataBlock,
  buildSystemPrompt,
} from './advisor.context';
import { AnalyticsService } from '../analytics/analytics.service';
import { RankingService } from '../ranking/ranking.service';
import { ComplianceService } from '../compliance/compliance.service';
import { TasksService } from '../tasks/tasks.service';
import { TaskStatus } from '../tasks/entities/task.entity';
import { ProjectsService } from '../projects/projects.service';
import { MilestonesService } from '../milestones/milestones.service';
import { addDaysToKey } from '../common/dates';
import { MilestoneStatus } from '../projects/entities/project-milestone.entity';

export const NEW_CHAT_NAME = 'New chat';

// Shown when there's no API key or generation fails
const FALLBACK_SUGGESTIONS = [
  'Am I allocating my time correctly?',
  'What should I focus on this week?',
  'What is my biggest bottleneck right now?',
];

const SuggestionsFormat = jsonSchemaOutputFormat({
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'A 2–5 word title for this conversation, no quotes or emoji',
    },
    suggestions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Exactly three questions the user could ask next',
    },
  },
  required: ['title', 'suggestions'],
  additionalProperties: false,
});

export type ThreadSummary = {
  id: string;
  name: string;
  pinned: boolean;
  createdAt: Date;
  lastMessageAt: Date | null;
  preview: string | null;
  messageCount: number;
};

// Override with ADVISOR_MODEL in backend/.env.
const DEFAULT_MODEL = 'claude-sonnet-5-5';
const HISTORY_LIMIT = 40;
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

@Injectable()
export class AdvisorService {
  private readonly logger = new Logger(AdvisorService.name);
  private client: Anthropic | null = null;

  constructor(
    @InjectRepository(AdvisorThreadEntity)
    private readonly threadRepository: Repository<AdvisorThreadEntity>,
    @InjectRepository(AdvisorMessageEntity)
    private readonly messageRepository: Repository<AdvisorMessageEntity>,
    @InjectRepository(AdvisorMemoryEntity)
    private readonly memoryRepository: Repository<AdvisorMemoryEntity>,
    private readonly analyticsService: AnalyticsService,
    private readonly rankingService: RankingService,
    private readonly complianceService: ComplianceService,
    private readonly tasksService: TasksService,
    private readonly projectsService: ProjectsService,
    private readonly milestonesService: MilestonesService,
  ) {}

  /** True when an Anthropic credential is configured; otherwise replies are mocked. */
  isLive(): boolean {
    return Boolean(
      process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
    );
  }

  private getClient(): Anthropic {
    if (!this.client) this.client = new Anthropic();
    return this.client;
  }

  // ── Threads ───────────────────────────────────────────────────────────

  /** Chats for the sidebar: pinned first, then most recently active. */
  async getThreads(userId: string): Promise<ThreadSummary[]> {
    const threads = await this.threadRepository.find({ where: { userId } });
    if (!threads.length) return [];
    const stats: {
      threadId: string;
      count: string;
      preview: string | null;
      lastAt: Date;
    }[] = await this.messageRepository.query(
      `SELECT DISTINCT ON (m."threadId")
         m."threadId",
         COUNT(*) OVER (PARTITION BY m."threadId") AS count,
         LEFT(m.content, 140) AS preview,
         m."createdAt" AS "lastAt"
       FROM advisor_messages m
       WHERE m."userId" = $1
       ORDER BY m."threadId", m."createdAt" DESC`,
      [userId],
    );
    const byThread = new Map(stats.map((row) => [row.threadId, row]));
    // Chats created before lastMessageAt existed fall back to their newest message
    const lastActivity = (t: AdvisorThreadEntity): Date =>
      t.lastMessageAt ?? byThread.get(t.id)?.lastAt ?? t.createdAt;
    return threads
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          new Date(lastActivity(b)).getTime() -
            new Date(lastActivity(a)).getTime(),
      )
      .map((thread) => ({
        id: thread.id,
        name: thread.name,
        pinned: thread.pinned,
        createdAt: thread.createdAt,
        lastMessageAt: lastActivity(thread),
        preview: byThread.get(thread.id)?.preview ?? null,
        messageCount: Number(byThread.get(thread.id)?.count ?? 0),
      }));
  }

  async createThread(
    userId: string,
    name?: string,
  ): Promise<AdvisorThreadEntity> {
    return this.threadRepository.save(
      this.threadRepository.create({
        userId,
        name: name?.trim().slice(0, 80) || NEW_CHAT_NAME,
      }),
    );
  }

  private async getThread(
    userId: string,
    threadId: string,
  ): Promise<AdvisorThreadEntity> {
    const thread = await this.threadRepository.findOneBy({
      id: threadId,
      userId,
    });
    if (!thread) throw new NotFoundException('Thread not found');
    return thread;
  }

  async updateThread(
    userId: string,
    threadId: string,
    updates: { name?: string; pinned?: boolean },
  ): Promise<AdvisorThreadEntity> {
    const thread = await this.getThread(userId, threadId);
    if (typeof updates.name === 'string') {
      thread.name = updates.name.trim().slice(0, 80) || thread.name;
    }
    if (typeof updates.pinned === 'boolean') thread.pinned = updates.pinned;
    return this.threadRepository.save(thread);
  }

  async deleteThread(userId: string, threadId: string): Promise<void> {
    await this.getThread(userId, threadId);
    await this.messageRepository.delete({ threadId, userId });
    await this.threadRepository.delete({ id: threadId, userId });
  }

  async getMessages(
    userId: string,
    threadId: string,
  ): Promise<AdvisorMessageEntity[]> {
    await this.getThread(userId, threadId);
    return this.messageRepository.find({
      where: { threadId, userId },
      order: { createdAt: 'ASC' },
    });
  }

  // ── Memory ────────────────────────────────────────────────────────────

  async getMemory(userId: string): Promise<AdvisorMemory> {
    const memory = await this.memoryRepository.findOneBy({ userId });
    return {
      stage: memory?.stage ?? '',
      priority: memory?.priority ?? '',
      projects: memory?.projects ?? '',
      bottleneck: memory?.bottleneck ?? '',
      constraints: memory?.constraints ?? '',
    };
  }

  async saveMemory(
    userId: string,
    updates: Partial<AdvisorMemory>,
  ): Promise<AdvisorMemory> {
    const current = await this.getMemory(userId);
    const next: AdvisorMemory = { ...current };
    for (const key of Object.keys(current) as (keyof AdvisorMemory)[]) {
      if (typeof updates[key] === 'string') {
        next[key] = updates[key].slice(0, 4000);
      }
    }
    await this.memoryRepository.save({ userId, ...next });
    return next;
  }

  // ── Live data ─────────────────────────────────────────────────────────

  async getLiveData(userId: string): Promise<AdvisorLiveData> {
    const [analytics, rank, rules, tasks, projects, milestones] =
      await Promise.all([
        this.analyticsService.getSummary(userId),
        this.rankingService.calculateRank(userId),
        this.complianceService.getRules(userId),
        this.tasksService.findAllByUserId(userId),
        this.projectsService.findAllByUserId(userId),
        this.milestonesService.listDated(userId),
      ]);
    const today = analytics.today;

    const entries = await this.complianceService.getEntries(
      userId,
      addDaysToKey(today, -29),
      today,
    );
    const compliancePct = (days: number) => {
      if (!rules.length) return null;
      const start = addDaysToKey(today, -(days - 1));
      const checked = entries.filter(
        (e) => e.checked && e.date >= start && e.date <= today,
      ).length;
      return Math.round((checked / (rules.length * days)) * 100);
    };

    const projectName = new Map(projects.map((p) => [p.id, p.name]));
    const openTasks = tasks
      .filter((t) => t.status !== TaskStatus.DONE)
      .sort((a, b) => {
        const byPriority =
          (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3);
        if (byPriority) return byPriority;
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return aDue - bDue;
      })
      .slice(0, 15)
      .map((t) => ({
        title: t.title,
        project: t.projectId ? (projectName.get(t.projectId) ?? null) : null,
        priority: t.priority ?? null,
        due: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : null,
        estimatedMinutes: t.estimatedMinutes ?? null,
      }));

    return {
      today,
      analytics,
      rank,
      compliance: {
        rules: rules.map((r) => r.name),
        last7Pct: compliancePct(7),
        last30Pct: compliancePct(30),
      },
      openTasks,
      upcomingMilestones: milestones
        .filter(
          (m) =>
            m.status === MilestoneStatus.OPEN && (m.targetDate ?? '') >= today,
        )
        .slice(0, 8)
        .map((m) => ({
          name: m.name,
          project: m.projectName,
          targetDate: m.targetDate!,
        })),
    };
  }

  // ── Chat ──────────────────────────────────────────────────────────────

  /**
   * Stores the user's message, streams the advisor's reply through `onText`,
   * then stores the reply. Returns the stored assistant message.
   */
  async sendMessage(
    userId: string,
    threadId: string,
    content: string,
    onText: (text: string) => void,
  ): Promise<AdvisorMessageEntity> {
    const thread = await this.getThread(userId, threadId);
    const trimmed = content.trim().slice(0, 8000);

    const history = await this.messageRepository.find({
      where: { threadId, userId },
      order: { createdAt: 'DESC' },
      take: HISTORY_LIMIT,
    });
    history.reverse();

    await this.messageRepository.save(
      this.messageRepository.create({
        threadId,
        userId,
        role: AdvisorRole.USER,
        content: trimmed,
      }),
    );
    await this.threadRepository.update(
      { id: threadId },
      { lastMessageAt: new Date(), suggestions: null },
    );

    const [memory, liveData] = await Promise.all([
      this.getMemory(userId),
      this.getLiveData(userId),
    ]);
    const system = buildSystemPrompt(
      memory,
      thread.name,
      buildLiveDataBlock(liveData),
    );
    const messages: Anthropic.Beta.BetaMessageParam[] = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: trimmed },
    ];

    const reply = this.isLive()
      ? await this.streamFromClaude(system, messages, onText)
      : await this.streamMock(liveData, onText);

    const saved = await this.messageRepository.save(
      this.messageRepository.create({
        threadId,
        userId,
        role: AdvisorRole.ASSISTANT,
        content: reply,
      }),
    );
    await this.threadRepository.update(
      { id: threadId },
      { lastMessageAt: new Date() },
    );
    return saved;
  }

  // ── Suggestions ───────────────────────────────────────────────────────

  async getSuggestions(
    userId: string,
    threadId: string,
  ): Promise<{ name: string; suggestions: string[] }> {
    const thread = await this.getThread(userId, threadId);
    if (thread.suggestions?.length) {
      return { name: thread.name, suggestions: thread.suggestions };
    }
    return this.refreshSuggestions(userId, threadId);
  }

  /**
   * Asks Claude for three next questions grounded in this conversation and
   * the user's live data, and names the chat if it's still "New chat".
   */
  async refreshSuggestions(
    userId: string,
    threadId: string,
  ): Promise<{ name: string; suggestions: string[] }> {
    const thread = await this.getThread(userId, threadId);
    let suggestions = FALLBACK_SUGGESTIONS;
    let name = thread.name;

    if (this.isLive()) {
      try {
        const [history, liveData, memory] = await Promise.all([
          this.messageRepository.find({
            where: { threadId, userId },
            order: { createdAt: 'DESC' },
            take: 8,
          }),
          this.getLiveData(userId),
          this.getMemory(userId),
        ]);
        history.reverse();
        const transcript = history.length
          ? history
              .map(
                (m) =>
                  `${m.role === AdvisorRole.USER ? 'User' : 'Advisor'}: ${m.content.slice(0, 1500)}`,
              )
              .join('\n\n')
          : '(no messages yet)';
        const response = await this.getClient().messages.parse({
          model: process.env.ADVISOR_MODEL || DEFAULT_MODEL,
          max_tokens: 2000,
          output_config: {
            effort: 'low',
            format: SuggestionsFormat,
          },
          system: buildSystemPrompt(
            memory,
            thread.name,
            buildLiveDataBlock(liveData),
          ),
          messages: [
            {
              role: 'user',
              content: `Conversation so far:\n\n${transcript}\n\nWrite exactly three short questions (under 70 characters each) that I, the user, should ask you next. Make them specific to my data and this conversation (name the project, task or number they're about), not generic. Also give this conversation a 2–5 word title.`,
            },
          ],
        });
        const parsed = response.parsed_output;
        if (parsed?.suggestions?.length) {
          suggestions = parsed.suggestions
            .map((q) => q.trim())
            .filter(Boolean)
            .slice(0, 3);
        }
        if (parsed?.title && thread.name === NEW_CHAT_NAME && history.length) {
          name = parsed.title
            .trim()
            .replace(/^["']|["']$/g, '')
            .slice(0, 60);
        }
      } catch (error) {
        this.logger.warn(`Suggestion generation failed: ${String(error)}`);
      }
    }

    await this.threadRepository.update({ id: threadId }, { suggestions, name });
    return { name, suggestions };
  }

  private async streamFromClaude(
    system: string,
    messages: Anthropic.Beta.BetaMessageParam[],
    onText: (text: string) => void,
  ): Promise<string> {
    const stream = this.getClient().beta.messages.stream({
      model: process.env.ADVISOR_MODEL || DEFAULT_MODEL,
      max_tokens: 16000,
      system,
      messages,
      // Short, conversational answers: low effort is plenty and keeps replies fast.
      output_config: { effort: 'low' },
      // If a safety classifier declines, let the API retry on a suitable model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    let text = '';
    stream.on('text', (delta) => {
      text += delta;
      onText(delta);
    });
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') {
      const note = text
        ? '\n\n[The response was cut off by a safety filter.]'
        : 'The advisor declined to answer that.';
      text += note;
      onText(note);
    }
    return text;
  }

  /** Used when no Anthropic credential is configured, so the page still works. */
  private async streamMock(
    data: AdvisorLiveData,
    onText: (text: string) => void,
  ): Promise<string> {
    const { analytics, rank } = data;
    const reply = [
      '[Mock reply — set ANTHROPIC_API_KEY in backend/.env for real advice.]',
      '',
      `Last 7 days: ${analytics.totals.last7}h (${
        Math.round((analytics.totals.last7 / 7) * 10) / 10
      }h/day). Rank: ${rank.rank}.`,
      analytics.highValue.pct === null
        ? 'No hours in the last 30 days to judge allocation.'
        : `${analytics.highValue.pct}% of the last 30 days went to High-priority work.`,
      data.openTasks[0]
        ? `Top open item: ${data.openTasks[0].title}.`
        : 'No open tasks.',
    ].join('\n');
    for (const chunk of reply.match(/.{1,24}/gs) ?? []) {
      onText(chunk);
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    return reply;
  }
}
