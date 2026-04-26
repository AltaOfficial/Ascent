import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository, Timestamp } from 'typeorm';
import { TaskEntity, TaskStatus } from './entities/task.entity';
import { SubtaskEntity } from './entities/subtask.entity';
import { UsersService } from 'src/users/users.service';
import {
  RepeatFrequency,
  RepeatTaskEntity,
} from './entities/repeat-task.entity';
import { Cron } from '@nestjs/schedule';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { addDays, Day, getDay, nextDay } from 'date-fns';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(SubtaskEntity)
    private readonly subtaskRepository: Repository<SubtaskEntity>,
    @InjectRepository(RepeatTaskEntity)
    private readonly repeatTaskRepository: Repository<RepeatTaskEntity>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async getRepeatTaskNextOccurrence(
    userId: string,
    repeatFrequency: RepeatFrequency,
    repeatDays: number[],
    repeatInterval: number,
  ): Promise<Date> {
    const user = await this.usersService.findOneById(userId);
    if (!user) throw new Error('User not found');
    const dateInUserTimezone = toZonedTime(new Date(), user.timezone);
    let nextOccurrence = dateInUserTimezone.setHours(0, 0, 0, 0);
    if (repeatFrequency === RepeatFrequency.DAILY) {
      nextOccurrence = nextDay(nextOccurrence, 1).setHours(0, 0, 0, 0);
    } else if (repeatFrequency === RepeatFrequency.WEEKLY) {
      const dayOfWeek = getDay(dateInUserTimezone);
      for (const day of repeatDays) {
        if (dayOfWeek < day) {
          nextOccurrence = nextDay(nextOccurrence, day as Day).setHours(
            0,
            0,
            0,
            0,
          );
          break;
        }
      }
    } else if (repeatFrequency === RepeatFrequency.CUSTOM) {
      nextOccurrence = addDays(nextOccurrence, repeatInterval).setHours(
        0,
        0,
        0,
        0,
      );
    }
    return fromZonedTime(nextOccurrence, user.timezone);
  }

  @Cron('0 * * * * *')
  async repeatingTaskCron() {
    const repeatTasks = await this.repeatTaskRepository.find({
      where: { nextOccurrence: LessThan(new Date()) },
    });
    repeatTasks.forEach(async (repeatTask) => {
      const nextOccurrence = await this.getRepeatTaskNextOccurrence(
        repeatTask.userId,
        repeatTask.repeatFrequency,
        repeatTask.repeatDays,
        repeatTask.repeatInterval,
      );
      this.repeatTaskRepository.update(
        { id: repeatTask.id },
        { nextOccurrence },
      );
      if (!repeatTask) return;
      this.taskRepository.create({
        title: repeatTask.title,
        description: repeatTask.description,
        priority: repeatTask.priority,
        projectId: repeatTask.projectId,
        sectionId: repeatTask.sectionId,
        categoryTag: repeatTask.categoryTag,
        estimatedMinutes: repeatTask.estimatedMinutes,
        userId: repeatTask.userId,
        repeatTask: repeatTask,
      });
      // TODO: create subtasks for repeat tasks
    });
  }

  async findAllByUserId(userId: string): Promise<TaskEntity[]> {
    return await this.taskRepository.findBy({ userId });
  }

  async findAllByTaskIdsAndUserId(
    userId: string,
    taskIds: [string],
  ): Promise<TaskEntity[]> {
    return await this.taskRepository.find({
      where: {
        id: In(taskIds),
        userId: userId,
      },
    });
  }

  async findByFilter(
    userId: string,
    projectId: string | null | undefined,
    status?: string,
  ): Promise<TaskEntity[]> {
    const whereClause: any = { userId };
    if (projectId !== undefined) whereClause.projectId = projectId;
    if (status) whereClause.status = status;
    return await this.taskRepository.find({
      where: whereClause,
      relations: ['repeatTask'],
    });
  }

  async create(userId: string, data: Partial<TaskEntity>): Promise<TaskEntity> {
    const task = this.taskRepository.create({ ...data, userId });
    return await this.taskRepository.save(task);
  }

  async update(
    id: string,
    userId: string,
    updates: Partial<TaskEntity> & {
      repeatTask?: {
        repeatFrequency?: RepeatFrequency | null;
        repeatDays?: number[] | null;
        repeatInterval?: number | null;
      };
    },
  ): Promise<TaskEntity | null> {
    const oldTask = await this.taskRepository.findOne({
      where: { id },
      relations: ['repeatTask'],
    });
    if (!oldTask) return null;

    if (oldTask.repeatTask && updates.repeatTask) {
      // update the existing repeat task template's schedule fields

      await this.repeatTaskRepository.update(
        { id: oldTask.repeatTask.id },
        {
          repeatFrequency: updates.repeatTask.repeatFrequency ?? undefined,
          repeatDays: updates.repeatTask.repeatDays ?? undefined,
          repeatInterval: updates.repeatTask.repeatInterval ?? undefined,
          nextOccurrence: await this.getRepeatTaskNextOccurrence(
            userId,
            updates.repeatTask.repeatFrequency ?? undefined,
            updates.repeatTask.repeatDays ?? undefined,
            updates.repeatTask.repeatInterval ?? undefined,
          ),
        },
      );
      updates.repeatTask = oldTask.repeatTask;
    } else if (oldTask.repeatTask && !updates.repeatTask) {
      // if the oldTask has repeat enabled and the updates have repeat disabled,
      // delete the repeatTask
      const repeatTaskId = oldTask.repeatTask.id;
      oldTask.repeatTask = null;
      await this.taskRepository.save(oldTask);
      await this.repeatTaskRepository.delete(repeatTaskId);
      updates.repeatTask = undefined;
    } else if (!oldTask.repeatTask && updates.repeatTask) {
      // if the oldTask doesn't have repeat enabled and the updates have repeat enabled,
      // create a new repeatTask
      const newRepeatTask: RepeatTaskEntity = this.repeatTaskRepository.create({
        title: oldTask.title,
        description: oldTask.description,
        priority: oldTask.priority,
        projectId: oldTask.projectId,
        sectionId: oldTask.sectionId,
        categoryTag: oldTask.categoryTag,
        estimatedMinutes: oldTask.estimatedMinutes,
        userId: oldTask.userId,
        repeatFrequency: updates.repeatTask.repeatFrequency ?? undefined,
        repeatDays: updates.repeatTask.repeatDays ?? undefined,
        repeatInterval: updates.repeatTask.repeatInterval ?? undefined,
      });
      newRepeatTask.nextOccurrence = await this.getRepeatTaskNextOccurrence(
        userId,
        updates.repeatTask.repeatFrequency ?? undefined,
        updates.repeatTask.repeatDays ?? undefined,
        updates.repeatTask.repeatInterval ?? undefined,
      );
      const savedRepeatTask =
        await this.repeatTaskRepository.save(newRepeatTask);
      updates.repeatTask = savedRepeatTask;
    }

    await this.taskRepository.update({ id, userId }, updates);
    return await this.taskRepository.findOne({
      where: { id },
      relations: ['repeatTask'],
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.taskRepository.delete({ id, userId });
  }

  async findSubtasksByTaskId(taskId: string): Promise<SubtaskEntity[]> {
    return await this.subtaskRepository.findBy({ taskId });
  }

  async getSubtaskCounts(
    taskIds: string[],
  ): Promise<Record<string, { total: number; completed: number }>> {
    if (!taskIds.length) return {};
    const rows = await this.subtaskRepository
      .createQueryBuilder('s')
      .select('s.taskId', 'taskId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN s.completed = true THEN 1 ELSE 0 END)',
        'completed',
      )
      .where('s.taskId IN (:...taskIds)', { taskIds })
      .groupBy('s.taskId')
      .getRawMany();
    return Object.fromEntries(
      rows.map((r) => [
        r.taskId,
        { total: parseInt(r.total, 10), completed: parseInt(r.completed, 10) },
      ]),
    );
  }

  async createSubtask(taskId: string, title: string): Promise<SubtaskEntity> {
    const subtask = this.subtaskRepository.create({ taskId, title });
    return await this.subtaskRepository.save(subtask);
  }

  async updateSubtask(
    subtaskId: string,
    taskId: string,
    updates: Partial<SubtaskEntity>,
  ): Promise<SubtaskEntity | null> {
    await this.subtaskRepository.update({ id: subtaskId, taskId }, updates);
    return await this.subtaskRepository.findOneBy({ id: subtaskId });
  }

  async deleteSubtask(subtaskId: string, taskId: string): Promise<void> {
    await this.subtaskRepository.delete({ id: subtaskId, taskId });
  }

  async setStatus(
    id: string,
    userId: string,
    status: TaskStatus,
  ): Promise<void> {
    await this.taskRepository.update({ id, userId }, { status });
  }
}
