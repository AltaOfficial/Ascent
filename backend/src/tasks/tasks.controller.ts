import { Controller, Get, Post, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskEntity } from './entities/task.entity';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async getAllTasks(@Request() req) {
    return this.tasksService.findAllByUserId(req.user.userId);
  }

  @Post('list')
  async listTasks(
    @Request() req,
    @Body() body: { projectId?: string | null; status?: string },
  ) {
    return this.tasksService.findByFilter(req.user.userId, body.projectId, body.status);
  }

  @Post()
  async createTask(@Request() req, @Body() body: Partial<TaskEntity>) {
    return this.tasksService.create(req.user.userId, body);
  }

  @Post('subtask-counts')
  @HttpCode(200)
  async getSubtaskCounts(@Body() body: { taskIds: string[] }) {
    return this.tasksService.getSubtaskCounts(body.taskIds ?? []);
  }

  @Post(':id/update')
  async updateTask(
    @Request() req,
    @Param('id') id: string,
    @Body() body: Partial<TaskEntity>,
  ) {
    return this.tasksService.update(id, req.user.userId, body);
  }

  @Post(':id/delete')
  async deleteTask(@Request() req, @Param('id') id: string) {
    await this.tasksService.delete(id, req.user.userId);
  }

  @Get(':id/subtasks')
  async getSubtasks(@Param('id') taskId: string) {
    return this.tasksService.findSubtasksByTaskId(taskId);
  }

  @Post(':id/subtasks')
  async createSubtask(@Param('id') taskId: string, @Body() body: { title: string }) {
    return this.tasksService.createSubtask(taskId, body.title);
  }

  @Post(':id/subtasks/:subtaskId/update')
  async updateSubtask(
    @Param('id') taskId: string,
    @Param('subtaskId') subtaskId: string,
    @Body() body: { title?: string; completed?: boolean },
  ) {
    return this.tasksService.updateSubtask(subtaskId, taskId, body);
  }

  @Post(':id/subtasks/:subtaskId/delete')
  async deleteSubtask(@Param('id') taskId: string, @Param('subtaskId') subtaskId: string) {
    await this.tasksService.deleteSubtask(subtaskId, taskId);
  }
}
