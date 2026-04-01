import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
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

  @Patch(':id')
  async updateTask(
    @Request() req,
    @Param('id') id: string,
    @Body() body: Partial<TaskEntity>,
  ) {
    return this.tasksService.update(id, req.user.userId, body);
  }

  @Delete(':id')
  async deleteTask(@Request() req, @Param('id') id: string) {
    await this.tasksService.delete(id, req.user.userId);
  }

  @Post(':id/subtasks')
  async createSubtask(@Param('id') taskId: string, @Body() body: { title: string }) {
    return this.tasksService.createSubtask(taskId, body.title);
  }

  @Patch(':id/subtasks/:subtaskId')
  async updateSubtask(
    @Param('id') taskId: string,
    @Param('subtaskId') subtaskId: string,
    @Body() body: { title?: string; completed?: boolean },
  ) {
    return this.tasksService.updateSubtask(subtaskId, taskId, body);
  }

  @Delete(':id/subtasks/:subtaskId')
  async deleteSubtask(@Param('id') taskId: string, @Param('subtaskId') subtaskId: string) {
    await this.tasksService.deleteSubtask(subtaskId, taskId);
  }
}
