import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TasksService } from 'src/tasks/tasks.service';
import { TaskStatus } from 'src/tasks/entities/task.entity';

@UseGuards(JwtAuthGuard)
@Controller('time-entries')
export class TimeEntriesController {
  constructor(
    private readonly timeEntriesService: TimeEntriesService,
    private readonly tasksService: TasksService,
  ) {}

  @Post('start')
  async startTimer(@Request() req, @Body() body: { taskId: string }) {
    const timeEntry = await this.timeEntriesService.start(req.user.userId, body.taskId);
    await this.tasksService.setStatus(body.taskId, req.user.userId, TaskStatus.IN_PROGRESS);
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
}
