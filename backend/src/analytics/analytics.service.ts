import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TimeEntriesService } from '../time-entries/time-entries.service';
import { TasksService } from '../tasks/tasks.service';
import { ProjectsService } from '../projects/projects.service';
import { AnalyticsSummary, computeAnalytics } from './analytics.compute';

// Covers every window the analytics page shows (90-day heatmap, 4 months of
// estimation accuracy) with some slack.
const LOOKBACK_DAYS = 150;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly timeEntriesService: TimeEntriesService,
    private readonly tasksService: TasksService,
    private readonly projectsService: ProjectsService,
  ) {}

  async getSummary(
    userId: string,
    now = new Date(),
  ): Promise<AnalyticsSummary> {
    const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);
    const [user, sessions, tasks, projects] = await Promise.all([
      this.usersService.findOneById(userId),
      this.timeEntriesService.findCompletedByUserSince(userId, since),
      this.tasksService.findAllByUserId(userId),
      this.projectsService.findAllByUserId(userId),
    ]);
    return computeAnalytics({
      timezone: user?.timezone ?? 'UTC',
      weekStart: user?.weekStart ?? 'monday',
      now,
      sessions,
      tasks,
      projects,
    });
  }
}
