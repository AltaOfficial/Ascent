import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity, TaskStatus } from './entities/task.entity';
import { SubtaskEntity } from './entities/subtask.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(SubtaskEntity)
    private readonly subtaskRepository: Repository<SubtaskEntity>,
  ) {}

  async findAllByUserId(userId: string): Promise<TaskEntity[]> {
    return await this.taskRepository.findBy({ userId });
  }

  async findByFilter(userId: string, projectId: string | null | undefined, status?: string): Promise<TaskEntity[]> {
    const whereClause: any = { userId };
    if (projectId !== undefined) whereClause.projectId = projectId;
    if (status) whereClause.status = status;
    return await this.taskRepository.findBy(whereClause);
  }

  async create(userId: string, data: Partial<TaskEntity>): Promise<TaskEntity> {
    const task = this.taskRepository.create({ ...data, userId });
    return await this.taskRepository.save(task);
  }

  async update(id: string, userId: string, updates: Partial<TaskEntity>): Promise<TaskEntity | null> {
    await this.taskRepository.update({ id, userId }, updates);
    return await this.taskRepository.findOneBy({ id });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.taskRepository.delete({ id, userId });
  }

  async findSubtasksByTaskId(taskId: string): Promise<SubtaskEntity[]> {
    return await this.subtaskRepository.findBy({ taskId });
  }

  async getSubtaskCounts(taskIds: string[]): Promise<Record<string, { total: number; completed: number }>> {
    if (!taskIds.length) return {};
    const rows = await this.subtaskRepository
      .createQueryBuilder('s')
      .select('s.taskId', 'taskId')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN s.completed = true THEN 1 ELSE 0 END)', 'completed')
      .where('s.taskId IN (:...taskIds)', { taskIds })
      .groupBy('s.taskId')
      .getRawMany();
    return Object.fromEntries(
      rows.map((r) => [r.taskId, { total: parseInt(r.total, 10), completed: parseInt(r.completed, 10) }]),
    );
  }

  async createSubtask(taskId: string, title: string): Promise<SubtaskEntity> {
    const subtask = this.subtaskRepository.create({ taskId, title });
    return await this.subtaskRepository.save(subtask);
  }

  async updateSubtask(subtaskId: string, taskId: string, updates: Partial<SubtaskEntity>): Promise<SubtaskEntity | null> {
    await this.subtaskRepository.update({ id: subtaskId, taskId }, updates);
    return await this.subtaskRepository.findOneBy({ id: subtaskId });
  }

  async deleteSubtask(subtaskId: string, taskId: string): Promise<void> {
    await this.subtaskRepository.delete({ id: subtaskId, taskId });
  }

  async setStatus(id: string, userId: string, status: TaskStatus): Promise<void> {
    await this.taskRepository.update({ id, userId }, { status });
  }
}
