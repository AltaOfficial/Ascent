import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TasksService } from '../tasks/tasks.service';
import { TaskStatus } from '../tasks/entities/task.entity';

@UseGuards(JwtAuthGuard)
@Controller('time-entries')
export class TimeEntriesController {
  constructor(
    private readonly timeEntriesService: TimeEntriesService,
    private readonly tasksService: TasksService,
  ) {}

  @Get()
  async getAllEntries(@Request() req) {
    const entries = await this.timeEntriesService.findAllByUser(
      req.user.userId,
    );
    if (!entries.length) return [];

    const taskIds = [...new Set(entries.map((e) => e.taskId))];
    const tasks = await this.tasksService.findAllByTaskIdsAndUserId(
      req.user.userId,
      taskIds as unknown as [string],
    );
    const taskMap = new Map(tasks.map((t) => [t.id, t.title]));

    return entries.map((e) => ({
      ...e,
      taskTitle: taskMap.get(e.taskId) ?? null,
    }));
  }

  @Post('start')
  async startTimer(@Request() req, @Body() body: { taskId: string }) {
    const timeEntry = await this.timeEntriesService.start(
      req.user.userId,
      body.taskId,
    );
    await this.tasksService.setStatus(
      body.taskId,
      req.user.userId,
      TaskStatus.IN_PROGRESS,
    );
    return timeEntry;
  }

  @Post('stop')
  async stopTimer(@Request() req, @Body() body: { timeEntryId: string }) {
    return this.timeEntriesService.stop(body.timeEntryId, req.user.userId);
  }

  @Get('active')
  async getActiveTimer(@Request() req) {
    return this.timeEntriesService.getActive(req.user.userId);
  }

  @Post('totals')
  async getTaskTotals(@Request() req, @Body() body: { taskIds: string[] }) {
    return this.timeEntriesService.getTotalsByTaskIds(
      body.taskIds ?? [],
      req.user.userId,
    );
  }

  // GET /time-entries/dates?start=YYYY-MM-DD&end=YYYY-MM-DD
  @Post('dates')
  async getEntriesByDateRange(
    @Request() req,
    @Body() body: { start: string; end: string },
  ) {
    return await this.timeEntriesService.getEntriesByDateRange(
      req.user.userId,
      body.start,
      body.end,
    );
  }
}
