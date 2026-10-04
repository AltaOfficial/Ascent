import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TasksService } from '../tasks/tasks.service';
import { TaskPriority, TaskStatus } from '../tasks/entities/task.entity';
import { ProjectsService } from '../projects/projects.service';
import { MilestonesService } from '../milestones/milestones.service';
import { TimeEntriesService } from '../time-entries/time-entries.service';
import { ComplianceService } from '../compliance/compliance.service';
import { RankingService } from '../ranking/ranking.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { UsersService } from '../users/users.service';
import { dateKeyInTz } from '../common/dates';

type ToolResult = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

function ok(data: unknown): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

function fail(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

const id = z.string().uuid('Not a valid id');

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .describe('Date as YYYY-MM-DD');

/**
 * Builds an MCP server whose tools act as one Ascent user. A new server is
 * built for every request (stateless transport), bound to the user the API
 * token belongs to. There are deliberately no delete tools.
 */
@Injectable()
export class McpToolsService {
  constructor(
    private readonly tasksService: TasksService,
    private readonly projectsService: ProjectsService,
    private readonly milestonesService: MilestonesService,
    private readonly timeEntriesService: TimeEntriesService,
    private readonly complianceService: ComplianceService,
    private readonly rankingService: RankingService,
    private readonly analyticsService: AnalyticsService,
    private readonly usersService: UsersService,
  ) {}

  private async today(userId: string): Promise<string> {
    const user = await this.usersService.findOneById(userId);
    return dateKeyInTz(new Date(), user?.timezone ?? 'UTC');
  }

  private async taskSummary(userId: string, taskIds: string[]) {
    const totals = await this.timeEntriesService.getTotalsByTaskIds(
      taskIds,
      userId,
    );
    return (
      task: Awaited<ReturnType<TasksService['findAllByUserId']>>[number],
    ) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      projectId: task.projectId,
      sectionId: task.sectionId,
      milestoneId: task.milestoneId,
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().slice(0, 10)
        : null,
      estimatedMinutes: task.estimatedMinutes,
      loggedMinutes: totals[task.id] ?? 0,
      tag: task.categoryTag,
      description: task.description,
    });
  }

  buildServer(userId: string): McpServer {
    const server = new McpServer({ name: 'ascent', version: '1.0.0' });

    // ── Overview ─────────────────────────────────────────────────────────

    server.registerTool(
      'get_overview',
      {
        title: 'Overview',
        description:
          "Today's snapshot: date, rank, recent deep-work hours, high-priority share, active timer and compliance for today. Start here.",
      },
      async () => {
        const today = await this.today(userId);
        const [rank, analytics, active, rules, entries] = await Promise.all([
          this.rankingService.calculateRank(userId),
          this.analyticsService.getSummary(userId),
          this.timeEntriesService.getActive(userId),
          this.complianceService.getRules(userId),
          this.complianceService.getEntries(userId, today, today),
        ]);
        const activeTask = active
          ? await this.tasksService.findOneById(active.taskId, userId)
          : null;
        return ok({
          today,
          rank: {
            rank: rank.rank,
            score: rank.score,
            nextRank: rank.nextRank,
            progressToNext: rank.progressToNext,
            cycle: rank.cycle,
            consistency: rank.consistency,
          },
          hours: analytics.totals,
          last14Days: analytics.dailyHours.slice(-14),
          highPriorityShareLast30Days: analytics.highValue.pct,
          activeTimer: active
            ? {
                timeEntryId: active.id,
                taskId: active.taskId,
                taskTitle: activeTask?.title ?? null,
                startedAt: active.startedAt,
              }
            : null,
          complianceToday: rules.map((rule) => ({
            ruleId: rule.id,
            rule: rule.name,
            checked:
              entries.find((e) => e.ruleId === rule.id)?.checked ?? false,
          })),
        });
      },
    );

    server.registerTool(
      'get_rank',
      {
        title: 'Rank details',
        description:
          'Full rank breakdown for the current 90-day cycle, including per-day hours, compliance and score.',
      },
      async () => ok(await this.rankingService.calculateRank(userId)),
    );

    server.registerTool(
      'get_analytics',
      {
        title: 'Analytics',
        description:
          'Analytics summary: 90 days of daily hours, month comparison, weekly allocation by project, high-priority share, session stats and estimation accuracy.',
      },
      async () => ok(await this.analyticsService.getSummary(userId)),
    );

    // ── Projects ─────────────────────────────────────────────────────────

    server.registerTool(
      'list_projects',
      {
        title: 'List projects',
        description:
          'All projects with their folder path, plus each project’s sections.',
      },
      async () => {
        const [projects, folders] = await Promise.all([
          this.projectsService.findAllByUserId(userId),
          this.projectsService.getFolders(userId),
        ]);
        const folderById = new Map(folders.map((f) => [f.id, f]));
        const pathOf = (folderId: string | null) => {
          const names: string[] = [];
          const seen = new Set<string>();
          let current = folderId ? folderById.get(folderId) : undefined;
          while (current && !seen.has(current.id)) {
            seen.add(current.id);
            names.unshift(current.name);
            current = current.parentId
              ? folderById.get(current.parentId)
              : undefined;
          }
          return names.join(' / ') || null;
        };
        const result = await Promise.all(
          projects.map(async (project) => ({
            id: project.id,
            name: project.name,
            folder: pathOf(project.folderId),
            sections: (
              await this.projectsService.getSections(project.id, userId)
            ).map((s) => ({ id: s.id, name: s.name })),
          })),
        );
        return ok(result);
      },
    );

    server.registerTool(
      'list_milestones',
      {
        title: 'List milestones',
        description: 'Milestones of a project with progress.',
        inputSchema: { projectId: id },
      },
      async ({ projectId }) => {
        try {
          return ok(await this.milestonesService.list(projectId, userId));
        } catch {
          return fail('Project not found');
        }
      },
    );

    server.registerTool(
      'create_milestone',
      {
        title: 'Create milestone',
        description: 'Add a milestone to a project.',
        inputSchema: {
          projectId: id,
          name: z.string().min(1),
          targetDate: dateKey.optional(),
          description: z.string().optional(),
        },
      },
      async ({ projectId, ...fields }) => {
        try {
          return ok(
            await this.milestonesService.create(projectId, userId, fields),
          );
        } catch {
          return fail('Project not found');
        }
      },
    );

    // ── Tasks ────────────────────────────────────────────────────────────

    server.registerTool(
      'list_tasks',
      {
        title: 'List tasks',
        description:
          'List tasks, optionally filtered. Done tasks are excluded unless includeDone is true. Use projectId "inbox" for tasks without a project.',
        inputSchema: {
          projectId: z.union([id, z.literal('inbox')]).optional(),
          status: z.enum(['todo', 'in_progress', 'blocked', 'done']).optional(),
          includeDone: z.boolean().optional(),
          limit: z.number().int().min(1).max(200).optional(),
        },
      },
      async ({ projectId, status, includeDone, limit }) => {
        const tasks = await this.tasksService.findByFilter(
          userId,
          projectId === 'inbox' ? null : projectId,
          status,
        );
        const filtered = tasks
          .filter(
            (t) =>
              includeDone || status === 'done' || t.status !== TaskStatus.DONE,
          )
          .slice(0, limit ?? 100);
        const summarize = await this.taskSummary(
          userId,
          filtered.map((t) => t.id),
        );
        return ok(filtered.map(summarize));
      },
    );

    server.registerTool(
      'get_task',
      {
        title: 'Get task',
        description: 'One task with its subtasks and logged time.',
        inputSchema: { taskId: id },
      },
      async ({ taskId }) => {
        const task = await this.tasksService.findOneById(taskId, userId);
        if (!task) return fail('Task not found');
        const summarize = await this.taskSummary(userId, [task.id]);
        const subtasks = await this.tasksService.findSubtasksByTaskId(task.id);
        return ok({
          ...summarize(task),
          repeat: task.repeatTask
            ? {
                frequency: task.repeatTask.repeatFrequency,
                days: task.repeatTask.repeatDays,
                interval: task.repeatTask.repeatInterval,
                mode: task.repeatTask.repeatMode,
              }
            : null,
          subtasks: subtasks.map((s) => ({
            id: s.id,
            title: s.title,
            completed: s.completed,
          })),
        });
      },
    );

    const taskFields = {
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.enum(['todo', 'in_progress', 'blocked', 'done']).optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      projectId: id.nullable().optional(),
      sectionId: id.nullable().optional(),
      milestoneId: id.nullable().optional(),
      dueDate: dateKey.nullable().optional(),
      estimatedMinutes: z.number().int().min(0).nullable().optional(),
    };

    server.registerTool(
      'create_task',
      {
        title: 'Create task',
        description:
          'Create a task. Without projectId it goes to the inbox. Get project and section ids from list_projects.',
        inputSchema: { ...taskFields, title: z.string().min(1) },
      },
      async (fields) => {
        if (fields.projectId) {
          const project = await this.projectsService.findById(
            fields.projectId,
            userId,
          );
          if (!project) return fail('Project not found');
        }
        const task = await this.tasksService.create(userId, {
          ...fields,
          status: fields.status as TaskStatus | undefined,
          priority: fields.priority as TaskPriority | undefined,
          dueDate: fields.dueDate as unknown as Date,
        });
        const summarize = await this.taskSummary(userId, [task.id]);
        return ok(summarize(task));
      },
    );

    server.registerTool(
      'update_task',
      {
        title: 'Update task',
        description:
          'Change any fields of a task. Omitted fields are left alone.',
        inputSchema: { taskId: id, ...taskFields },
      },
      async ({ taskId, ...fields }) => {
        const task = await this.tasksService.update(taskId, userId, {
          ...fields,
          status: fields.status as TaskStatus | undefined,
          priority: fields.priority as TaskPriority | undefined,
          dueDate: fields.dueDate as unknown as Date,
        });
        if (!task) return fail('Task not found');
        const summarize = await this.taskSummary(userId, [task.id]);
        return ok(summarize(task));
      },
    );

    server.registerTool(
      'complete_task',
      {
        title: 'Complete task',
        description: 'Mark a task done (stops its timer if it is running).',
        inputSchema: { taskId: id },
      },
      async ({ taskId }) => {
        const active = await this.timeEntriesService.getActive(userId);
        if (active?.taskId === taskId) {
          await this.timeEntriesService.stop(active.id, userId);
        }
        const task = await this.tasksService.update(taskId, userId, {
          status: TaskStatus.DONE,
        });
        if (!task) return fail('Task not found');
        return ok(`Completed "${task.title}".`);
      },
    );

    server.registerTool(
      'add_subtask',
      {
        title: 'Add subtask',
        description: 'Add a checklist item to a task.',
        inputSchema: { taskId: id, title: z.string().min(1) },
      },
      async ({ taskId, title }) => {
        const task = await this.tasksService.findOneById(taskId, userId);
        if (!task) return fail('Task not found');
        return ok(await this.tasksService.createSubtask(taskId, title));
      },
    );

    server.registerTool(
      'set_subtask_completed',
      {
        title: 'Check off subtask',
        description: 'Mark a subtask complete or incomplete.',
        inputSchema: {
          taskId: id,
          subtaskId: id,
          completed: z.boolean(),
        },
      },
      async ({ taskId, subtaskId, completed }) => {
        const task = await this.tasksService.findOneById(taskId, userId);
        if (!task) return fail('Task not found');
        const subtask = await this.tasksService.updateSubtask(
          subtaskId,
          taskId,
          { completed },
        );
        return subtask ? ok(subtask) : fail('Subtask not found');
      },
    );

    // ── Time ─────────────────────────────────────────────────────────────

    server.registerTool(
      'start_timer',
      {
        title: 'Start timer',
        description:
          'Start tracking time on a task. Any running timer is stopped first.',
        inputSchema: { taskId: id },
      },
      async ({ taskId }) => {
        const task = await this.tasksService.findOneById(taskId, userId);
        if (!task) return fail('Task not found');
        await this.timeEntriesService.stopActive(userId);
        const entry = await this.timeEntriesService.start(userId, taskId);
        await this.tasksService.setStatus(
          taskId,
          userId,
          TaskStatus.IN_PROGRESS,
        );
        return ok({
          timeEntryId: entry.id,
          taskTitle: task.title,
          startedAt: entry.startedAt,
        });
      },
    );

    server.registerTool(
      'stop_timer',
      {
        title: 'Stop timer',
        description: 'Stop the running timer, if any.',
      },
      async () => {
        const stopped = await this.timeEntriesService.stopActive(userId);
        if (!stopped) return ok('No timer was running.');
        const minutes = Math.round(
          (stopped.endedAt.getTime() - stopped.startedAt.getTime()) / 60_000,
        );
        return ok({ timeEntryId: stopped.id, taskId: stopped.taskId, minutes });
      },
    );

    server.registerTool(
      'log_time',
      {
        title: 'Log time',
        description:
          'Record a session that already happened. Give startedAt (ISO 8601) and either endedAt or minutes.',
        inputSchema: {
          taskId: id,
          startedAt: z.string().describe('ISO 8601 timestamp'),
          endedAt: z.string().optional().describe('ISO 8601 timestamp'),
          minutes: z
            .number()
            .positive()
            .max(24 * 60)
            .optional(),
        },
      },
      async ({ taskId, startedAt, endedAt, minutes }) => {
        const task = await this.tasksService.findOneById(taskId, userId);
        if (!task) return fail('Task not found');
        const start = new Date(startedAt);
        const end = endedAt
          ? new Date(endedAt)
          : minutes
            ? new Date(start.getTime() + minutes * 60_000)
            : null;
        if (
          Number.isNaN(start.getTime()) ||
          !end ||
          Number.isNaN(end.getTime())
        )
          return fail(
            'Provide a valid startedAt and either endedAt or minutes.',
          );
        if (end <= start) return fail('endedAt must be after startedAt.');
        if (end.getTime() > Date.now() + 60_000)
          return fail('Cannot log time in the future.');
        if (end.getTime() - start.getTime() > 24 * 3_600_000)
          return fail('A single session cannot exceed 24 hours.');
        const entry = await this.timeEntriesService.createCompleted(
          userId,
          taskId,
          start,
          end,
        );
        return ok({
          timeEntryId: entry.id,
          taskTitle: task.title,
          minutes: Math.round((end.getTime() - start.getTime()) / 60_000),
        });
      },
    );

    // ── Compliance ───────────────────────────────────────────────────────

    server.registerTool(
      'get_compliance',
      {
        title: 'Compliance for a day',
        description:
          'Compliance rules and whether each was kept on a day (default today).',
        inputSchema: { date: dateKey.optional() },
      },
      async ({ date }) => {
        const day = date ?? (await this.today(userId));
        const [rules, entries] = await Promise.all([
          this.complianceService.getRules(userId),
          this.complianceService.getEntries(userId, day, day),
        ]);
        return ok({
          date: day,
          rules: rules.map((rule) => ({
            ruleId: rule.id,
            rule: rule.name,
            checked:
              entries.find((e) => e.ruleId === rule.id)?.checked ?? false,
          })),
        });
      },
    );

    server.registerTool(
      'mark_compliance',
      {
        title: 'Mark compliance',
        description:
          'Mark a compliance rule as kept (checked: true) or broken (checked: false) for a day (default today).',
        inputSchema: {
          ruleId: id,
          checked: z.boolean(),
          date: dateKey.optional(),
        },
      },
      async ({ ruleId, checked, date }) => {
        const rules = await this.complianceService.getRules(userId);
        if (!rules.some((r) => r.id === ruleId)) return fail('Rule not found');
        const day = date ?? (await this.today(userId));
        await this.complianceService.upsertEntry(userId, ruleId, day, checked);
        return ok({ ruleId, date: day, checked });
      },
    );

    server.registerTool(
      'log_urge',
      {
        title: 'Log an urge',
        description:
          'Record an urge against a compliance rule: intensity 1–10 and what triggered it.',
        inputSchema: {
          ruleId: id,
          intensity: z.number().int().min(1).max(10),
          trigger: z.string().max(200),
          durationSeconds: z.number().int().min(0).optional(),
          whoWhere: z.string().max(200).optional(),
          copingNotes: z.string().max(200).optional(),
          reflection: z.string().max(200).optional(),
        },
      },
      async ({ ruleId, ...fields }) => {
        const rules = await this.complianceService.getRules(userId);
        if (!rules.some((r) => r.id === ruleId)) return fail('Rule not found');
        const log = await this.complianceService.createUrgeLog(
          userId,
          ruleId,
          fields,
        );
        return ok({ urgeLogId: log.id, occurredAt: log.occurredAt });
      },
    );

    return server;
  }
}
