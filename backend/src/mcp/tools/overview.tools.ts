import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import type { Context } from '@rekog/mcp-nest';
import { RankingService } from '../../ranking/ranking.service';
import { AnalyticsService } from '../../analytics/analytics.service';
import { TimeEntriesService } from '../../time-entries/time-entries.service';
import { ComplianceService } from '../../compliance/compliance.service';
import { TasksService } from '../../tasks/tasks.service';
import type { McpRequest } from '../mcp-auth.guard';

@Injectable()
export class OverviewTools {
  constructor(
    private readonly rankingService: RankingService,
    private readonly analyticsService: AnalyticsService,
    private readonly timeEntriesService: TimeEntriesService,
    private readonly complianceService: ComplianceService,
    private readonly tasksService: TasksService,
  ) {}

  @Tool({
    name: 'get_overview',
    description:
      "Today's snapshot: date, rank, recent deep-work hours, high-priority share, active timer and compliance for today. Start here.",
  })
  async getOverview(_args: object, _context: Context, request: McpRequest) {
    const { userId } = request.user;
    const [rank, analytics, active, rules] = await Promise.all([
      this.rankingService.calculateRank(userId),
      this.analyticsService.getSummary(userId),
      this.timeEntriesService.getActive(userId),
      this.complianceService.getRules(userId),
    ]);
    const entries = await this.complianceService.getEntries(
      userId,
      analytics.today,
      analytics.today,
    );
    const activeTask = active
      ? await this.tasksService.findOneById(active.taskId, userId)
      : null;
    return {
      today: analytics.today,
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
        checked: entries.find((e) => e.ruleId === rule.id)?.checked ?? false,
      })),
    };
  }

  @Tool({
    name: 'get_rank',
    description:
      'Full rank breakdown for the current 90-day cycle, including per-day hours, compliance and score.',
  })
  async getRank(_args: object, _context: Context, request: McpRequest) {
    return this.rankingService.calculateRank(request.user.userId);
  }

  @Tool({
    name: 'get_analytics',
    description:
      'Analytics summary: 90 days of daily hours, month comparison, weekly allocation by project, high-priority share, session stats and estimation accuracy.',
  })
  async getAnalytics(_args: object, _context: Context, request: McpRequest) {
    return this.analyticsService.getSummary(request.user.userId);
  }
}
