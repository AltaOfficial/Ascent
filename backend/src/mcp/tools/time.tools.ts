import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import type { Context } from '@rekog/mcp-nest';
import { z } from 'zod';
import { TasksService } from '../../tasks/tasks.service';
import { TaskStatus } from '../../tasks/entities/task.entity';
import { TimeEntriesService } from '../../time-entries/time-entries.service';
import type { McpRequestWithUser } from '@rekog/mcp-nest';
import { id } from './tool-utils';

const MAX_SESSION_MS = 24 * 3_600_000;

@Injectable()
export class TimeTools {
  constructor(
    private readonly tasksService: TasksService,
    private readonly timeEntriesService: TimeEntriesService,
  ) {}

  @Tool({
    name: 'start_timer',
    description:
      'Start tracking time on a task. Any running timer is stopped first.',
    parameters: z.object({ taskId: id }),
  })
  async startTimer(
    { taskId }: { taskId: string },
    _context: Context,
    request: McpRequestWithUser,
  ) {
    const userId = request.user.sub;
    const task = await this.tasksService.findOneById(taskId, userId);
    if (!task) throw new NotFoundException('Task not found');
    await this.timeEntriesService.stopActive(userId);
    const entry = await this.timeEntriesService.start(userId, taskId);
    await this.tasksService.setStatus(taskId, userId, TaskStatus.IN_PROGRESS);
    return {
      timeEntryId: entry.id,
      taskTitle: task.title,
      startedAt: entry.startedAt,
    };
  }

  @Tool({
    name: 'stop_timer',
    description: 'Stop the running timer, if any.',
  })
  async stopTimer(
    _args: object,
    _context: Context,
    request: McpRequestWithUser,
  ) {
    const stopped = await this.timeEntriesService.stopActive(request.user.sub);
    if (!stopped) return 'No timer was running.';
    const minutes = Math.round(
      (stopped.endedAt.getTime() - stopped.startedAt.getTime()) / 60_000,
    );
    return { timeEntryId: stopped.id, taskId: stopped.taskId, minutes };
  }

  @Tool({
    name: 'log_time',
    description:
      'Record a session that already happened. Give startedAt (ISO 8601) and either endedAt or minutes.',
    parameters: z.object({
      taskId: id,
      startedAt: z.string().describe('ISO 8601 timestamp'),
      endedAt: z.string().optional().describe('ISO 8601 timestamp'),
      minutes: z
        .number()
        .positive()
        .max(24 * 60)
        .optional(),
    }),
  })
  async logTime(
    {
      taskId,
      startedAt,
      endedAt,
      minutes,
    }: {
      taskId: string;
      startedAt: string;
      endedAt?: string;
      minutes?: number;
    },
    _context: Context,
    request: McpRequestWithUser,
  ) {
    const userId = request.user.sub;
    const task = await this.tasksService.findOneById(taskId, userId);
    if (!task) throw new NotFoundException('Task not found');

    const start = new Date(startedAt);
    const end = endedAt
      ? new Date(endedAt)
      : minutes
        ? new Date(start.getTime() + minutes * 60_000)
        : null;
    if (Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
      throw new BadRequestException(
        'Provide a valid startedAt and either endedAt or minutes.',
      );
    }
    if (end <= start) {
      throw new BadRequestException('endedAt must be after startedAt.');
    }
    if (end.getTime() > Date.now() + 60_000) {
      throw new BadRequestException('Cannot log time in the future.');
    }
    if (end.getTime() - start.getTime() > MAX_SESSION_MS) {
      throw new BadRequestException('A single session cannot exceed 24 hours.');
    }

    const entry = await this.timeEntriesService.createCompleted(
      userId,
      taskId,
      start,
      end,
    );
    return {
      timeEntryId: entry.id,
      taskTitle: task.title,
      minutes: Math.round((end.getTime() - start.getTime()) / 60_000),
    };
  }
}
