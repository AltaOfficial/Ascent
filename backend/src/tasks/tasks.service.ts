import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TaskEntity, TaskStatus } from './entities/task.entity';
import { SubtaskEntity } from './entities/subtask.entity';
import { UsersService } from 'src/users/users.service';
import {
  RepeatFrequency,
  RepeatMode,
  RepeatTaskEntity,
} from './entities/repeat-task.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { ProjectSectionEntity } from '../projects/entities/project-section.entity';
import { dateKeyInTz, startOfDayInTz } from '../common/dates';
import { nextOccurrenceKey } from './repeat-schedule';

export type RepeatSettings = {
  repeatFrequency?: RepeatFrequency | null;
  repeatDays?: number[] | null;
  repeatInterval?: number | null;
  repeatMode?: RepeatMode | null;
};

// Fields a client may set directly on a task. Anything else in an update body
// (computed fields the frontend carries around, ids, …) is ignored.
const EDITABLE_FIELDS = [
  'title',
  'description',
  'status',
  'priority',
  'projectId',
  'sectionId',
  'categoryTag',
  'dueDate',
  'estimatedMinutes',
  'milestoneId',
] as const;

// Fields copied from a task onto its repeat template so future copies match.
const TEMPLATE_FIELDS = [
  'title',
  'description',
  'priority',
  'projectId',
  'sectionId',
  'categoryTag',
  'estimatedMinutes',
] as const;

export type TaskFields = {
  [K in (typeof EDITABLE_FIELDS)[number]]?: TaskEntity[K] | null;
};

export type TaskUpdate = TaskFields & {
  /** undefined = leave repeat alone, null = turn repeat off */
  repeatTask?: RepeatSettings | null;
};

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private repeatCronRunning = false;

  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(SubtaskEntity)
    private readonly subtaskRepository: Repository<SubtaskEntity>,
    @InjectRepository(RepeatTaskEntity)
    private readonly repeatTaskRepository: Repository<RepeatTaskEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(ProjectSectionEntity)
    private readonly sectionRepository: Repository<ProjectSectionEntity>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  // ── Repeat scheduling ──────────────────────────────────────────────────

  private async getTimezone(userId: string): Promise<string> {
    const user = await this.usersService.findOneById(userId);
    return user?.timezone ?? 'UTC';
  }

  /**
   * When the template should next create (or carry over) a copy. After-
   * completion templates have no schedule of their own: completing a copy
   * creates the next one.
   */
  private async computeNextOccurrence(
    template: Pick<
      RepeatTaskEntity,
      | 'userId'
      | 'repeatFrequency'
      | 'repeatDays'
      | 'repeatInterval'
      | 'repeatMode'
    >,
    anchorKey?: string,
  ): Promise<Date | null> {
    if (template.repeatMode === RepeatMode.AFTER_COMPLETION) return null;
    const timezone = await this.getTimezone(template.userId);
    const todayKey = dateKeyInTz(new Date(), timezone);
    const key = nextOccurrenceKey(template, todayKey, anchorKey ?? todayKey);
    return startOfDayInTz(key, timezone);
  }

  private async nextDueKey(template: RepeatTaskEntity): Promise<string> {
    const timezone = await this.getTimezone(template.userId);
    return nextOccurrenceKey(template, dateKeyInTz(new Date(), timezone));
  }

  private async nextPosition(
    userId: string,
    projectId: string | null | undefined,
    sectionId: string | null | undefined,
  ): Promise<number> {
    const result = await this.taskRepository
      .createQueryBuilder('t')
      .select('MAX(t.position)', 'max')
      .where('t.userId = :userId', { userId })
      .andWhere(
        projectId ? 't.projectId = :projectId' : 't.projectId IS NULL',
        {
          projectId,
        },
      )
      .andWhere(
        sectionId ? 't.sectionId = :sectionId' : 't.sectionId IS NULL',
        {
          sectionId,
        },
      )
      .getRawOne<{ max: number | null }>();
    return (result?.max ?? -1) + 1;
  }

  /** Creates the next copy of a repeating task, due on `dueKey`. */
  async spawnRepeatInstance(
    template: RepeatTaskEntity,
    dueKey: string,
  ): Promise<TaskEntity> {
    // The project or section may have been deleted since the template was made.
    let projectId: string | null = template.projectId ?? null;
    let sectionId: string | null = template.sectionId ?? null;
    if (projectId) {
      const project = await this.projectRepository.findOneBy({
        id: projectId,
        userId: template.userId,
      });
      if (!project) projectId = null;
    }
    if (!projectId) sectionId = null;
    if (sectionId) {
      const section = await this.sectionRepository.findOneBy({
        id: sectionId,
        userId: template.userId,
      });
      if (!section) sectionId = null;
    }

    const previous = await this.taskRepository.findOne({
      where: { repeatTask: { id: template.id } },
      order: { createdAt: 'DESC' },
    });

    const task = await this.taskRepository.save(
      this.taskRepository.create({
        title: template.title,
        description: template.description,
        priority: template.priority,
        projectId: projectId as string,
        sectionId: sectionId as string,
        categoryTag: template.categoryTag,
        estimatedMinutes: template.estimatedMinutes,
        userId: template.userId,
        repeatTask: template,
        dueDate: dueKey as unknown as Date,
        position: await this.nextPosition(
          template.userId,
          projectId,
          sectionId,
        ),
      }),
    );

    // Copy the checklist from the latest copy, unchecked.
    if (previous) {
      const subtasks = await this.subtaskRepository.find({
        where: { taskId: previous.id },
        order: { createdAt: 'ASC' },
      });
      for (const subtask of subtasks) {
        await this.subtaskRepository.save(
          this.subtaskRepository.create({
            taskId: task.id,
            title: subtask.title,
            completed: false,
          }),
        );
      }
    }
    return task;
  }

  /** Handles one template whose next occurrence has arrived. */
  async processDueRepeatTemplate(template: RepeatTaskEntity): Promise<void> {
    if (template.repeatMode === RepeatMode.AFTER_COMPLETION) {
      await this.repeatTaskRepository.update(
        { id: template.id },
        { nextOccurrence: null },
      );
      return;
    }

    const timezone = await this.getTimezone(template.userId);
    const occurrenceKey = template.nextOccurrence
      ? dateKeyInTz(template.nextOccurrence, timezone)
      : dateKeyInTz(new Date(), timezone);

    const openCopy =
      template.repeatMode === RepeatMode.PILE_UP
        ? null
        : await this.taskRepository.findOne({
            where: {
              repeatTask: { id: template.id },
              status: Not(TaskStatus.DONE),
            },
            order: { createdAt: 'DESC' },
          });

    if (openCopy) {
      // Carry over: the unfinished copy just moves to the new date.
      await this.taskRepository.update(
        { id: openCopy.id },
        { dueDate: occurrenceKey as unknown as Date },
      );
    } else {
      await this.spawnRepeatInstance(template, occurrenceKey);
    }

    await this.repeatTaskRepository.update(
      { id: template.id },
      {
        nextOccurrence: await this.computeNextOccurrence(
          template,
          occurrenceKey,
        ),
      },
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async repeatingTaskCron() {
    if (this.repeatCronRunning) return;
    this.repeatCronRunning = true;
    try {
      const dueTemplates = await this.repeatTaskRepository.find({
        where: { nextOccurrence: LessThanOrEqual(new Date()) },
      });
      for (const template of dueTemplates) {
        try {
          await this.processDueRepeatTemplate(template);
        } catch (error) {
          this.logger.error(`Repeat task ${template.id} failed`, error);
        }
      }
    } finally {
      this.repeatCronRunning = false;
    }
  }

  // ── Queries ───────────────────────────────────────────────────────────

  async findAllByUserId(userId: string): Promise<TaskEntity[]> {
    return await this.taskRepository.find({
      where: { userId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOneById(id: string, userId: string): Promise<TaskEntity | null> {
    return await this.taskRepository.findOne({
      where: { id, userId },
      relations: ['repeatTask'],
    });
  }

  async findAllByTaskIdsAndUserId(
    userId: string,
    taskIds: string[],
  ): Promise<TaskEntity[]> {
    if (!taskIds?.length) return [];
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
    const whereClause: Record<string, unknown> = { userId };
    if (projectId !== undefined)
      whereClause.projectId = projectId === null ? IsNull() : projectId;
    if (status) whereClause.status = status;
    return await this.taskRepository.find({
      where: whereClause,
      relations: ['repeatTask'],
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  async findByMilestoneIds(
    userId: string,
    milestoneIds: string[],
  ): Promise<TaskEntity[]> {
    if (!milestoneIds.length) return [];
    return await this.taskRepository.find({
      where: { userId, milestoneId: In(milestoneIds) },
    });
  }

  // ── Mutations ─────────────────────────────────────────────────────────

  async create(userId: string, data: TaskFields): Promise<TaskEntity> {
    const fields: Partial<TaskEntity> = {};
    for (const field of EDITABLE_FIELDS) {
      if (data[field] !== undefined) (fields as any)[field] = data[field];
    }
    const task = this.taskRepository.create({
      ...fields,
      userId,
      completedAt: fields.status === TaskStatus.DONE ? new Date() : null,
      position: await this.nextPosition(
        userId,
        fields.projectId,
        fields.sectionId,
      ),
    });
    return await this.taskRepository.save(task);
  }

  async update(
    id: string,
    userId: string,
    updates: TaskUpdate,
  ): Promise<TaskEntity | null> {
    const oldTask = await this.taskRepository.findOne({
      where: { id, userId },
      relations: ['repeatTask'],
    });
    if (!oldTask) return null;

    const patch: Partial<TaskEntity> = {};
    for (const field of EDITABLE_FIELDS) {
      if (updates[field] !== undefined) (patch as any)[field] = updates[field];
    }

    const becameDone =
      patch.status === TaskStatus.DONE && oldTask.status !== TaskStatus.DONE;
    if (patch.status !== undefined && patch.status !== oldTask.status) {
      patch.completedAt = patch.status === TaskStatus.DONE ? new Date() : null;
    }

    // Milestones belong to a project, so a task moving projects drops its link.
    if (
      patch.projectId !== undefined &&
      patch.projectId !== oldTask.projectId &&
      patch.milestoneId === undefined
    ) {
      patch.milestoneId = null;
    }

    // Moving to another section/project puts the task at the end of its new list.
    const movedList =
      (patch.sectionId !== undefined &&
        patch.sectionId !== oldTask.sectionId) ||
      (patch.projectId !== undefined && patch.projectId !== oldTask.projectId);
    if (movedList) {
      patch.position = await this.nextPosition(
        userId,
        patch.projectId !== undefined ? patch.projectId : oldTask.projectId,
        patch.sectionId !== undefined ? patch.sectionId : oldTask.sectionId,
      );
    }

    let template = oldTask.repeatTask;
    if (updates.repeatTask === null && template) {
      // Repeat turned off. Other copies keep existing; the schedule stops.
      const templateId = template.id;
      patch.repeatTask = null;
      await this.taskRepository.update({ id, userId }, { repeatTask: null });
      const remaining = await this.taskRepository.count({
        where: { repeatTask: { id: templateId } },
      });
      if (remaining === 0) await this.repeatTaskRepository.delete(templateId);
      template = null;
    } else if (updates.repeatTask && template) {
      const schedule = this.normalizeRepeat(updates.repeatTask, template);
      Object.assign(template, schedule);
      template.nextOccurrence = await this.computeNextOccurrence(template);
      await this.repeatTaskRepository.update(
        { id: template.id },
        {
          ...schedule,
          nextOccurrence: template.nextOccurrence,
        },
      );
    } else if (updates.repeatTask && !template) {
      const merged = { ...oldTask, ...patch };
      const schedule = this.normalizeRepeat(updates.repeatTask);
      const created = this.repeatTaskRepository.create({
        title: merged.title,
        description: merged.description,
        priority: merged.priority,
        projectId: merged.projectId,
        sectionId: merged.sectionId,
        categoryTag: merged.categoryTag,
        estimatedMinutes: merged.estimatedMinutes,
        userId,
        ...schedule,
      });
      created.nextOccurrence = await this.computeNextOccurrence(created);
      template = await this.repeatTaskRepository.save(created);
      patch.repeatTask = template;
    }

    // Keep the template in step with edits so future copies match.
    if (template) {
      const templatePatch: Partial<RepeatTaskEntity> = {};
      for (const field of TEMPLATE_FIELDS) {
        if (patch[field] !== undefined)
          (templatePatch as any)[field] = patch[field];
      }
      if (Object.keys(templatePatch).length) {
        await this.repeatTaskRepository.update(
          { id: template.id },
          templatePatch,
        );
        Object.assign(template, templatePatch);
      }
    }

    if (Object.keys(patch).length) {
      await this.taskRepository.update({ id, userId }, patch);
    }

    if (becameDone && template?.repeatMode === RepeatMode.AFTER_COMPLETION) {
      const otherOpen = await this.taskRepository.count({
        where: {
          repeatTask: { id: template.id },
          status: Not(TaskStatus.DONE),
          id: Not(id),
        },
      });
      if (otherOpen === 0) {
        await this.spawnRepeatInstance(
          template,
          await this.nextDueKey(template),
        );
      }
    }

    return await this.taskRepository.findOne({
      where: { id },
      relations: ['repeatTask'],
    });
  }

  private normalizeRepeat(
    settings: RepeatSettings,
    current?: RepeatTaskEntity,
  ): Pick<
    RepeatTaskEntity,
    'repeatFrequency' | 'repeatDays' | 'repeatInterval' | 'repeatMode'
  > {
    const frequency =
      settings.repeatFrequency ??
      current?.repeatFrequency ??
      RepeatFrequency.DAILY;
    if (!Object.values(RepeatFrequency).includes(frequency)) {
      throw new BadRequestException('Invalid repeatFrequency');
    }
    const mode =
      settings.repeatMode ?? current?.repeatMode ?? RepeatMode.CARRY_OVER;
    if (!Object.values(RepeatMode).includes(mode)) {
      throw new BadRequestException('Invalid repeatMode');
    }
    const days = (settings.repeatDays ?? [])
      .map(Number)
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    return {
      repeatFrequency: frequency,
      repeatDays:
        frequency === RepeatFrequency.WEEKLY
          ? [...new Set(days)].sort()
          : (null as unknown as number[]),
      repeatInterval:
        frequency === RepeatFrequency.CUSTOM
          ? Math.max(1, Math.floor(Number(settings.repeatInterval) || 1))
          : (null as unknown as number),
      repeatMode: mode,
    };
  }

  /**
   * Puts `taskIds` into `sectionId` (null = unsectioned) in exactly that
   * order. Tasks not owned by the user are ignored.
   */
  async reorder(
    userId: string,
    projectId: string | null | undefined,
    sectionId: string | null,
    taskIds: string[],
  ): Promise<void> {
    const owned = await this.findAllByTaskIdsAndUserId(userId, taskIds);
    const ownedIds = new Set(owned.map((task) => task.id));
    let position = 0;
    for (const taskId of taskIds) {
      if (!ownedIds.has(taskId)) continue;
      await this.taskRepository.update(
        { id: taskId, userId },
        {
          position: position++,
          sectionId: sectionId as string,
          ...(projectId !== undefined
            ? { projectId: projectId as string }
            : {}),
        },
      );
    }
  }

  async clearMilestone(userId: string, milestoneId: string): Promise<void> {
    await this.taskRepository.update(
      { userId, milestoneId },
      { milestoneId: null },
    );
  }

  async delete(id: string, userId: string): Promise<void> {
    const task = await this.findOneById(id, userId);
    if (!task) return;
    await this.subtaskRepository.delete({ taskId: id });
    await this.taskRepository.delete({ id, userId });
    // Deleting the last copy of a repeating task ends the repeat.
    if (task.repeatTask) {
      const remaining = await this.taskRepository.count({
        where: { repeatTask: { id: task.repeatTask.id } },
      });
      if (remaining === 0) {
        await this.repeatTaskRepository.delete(task.repeatTask.id);
      }
    }
  }

  // ── Subtasks ──────────────────────────────────────────────────────────

  async findSubtasksByTaskId(taskId: string): Promise<SubtaskEntity[]> {
    return await this.subtaskRepository.find({
      where: { taskId },
      order: { createdAt: 'ASC' },
    });
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
    await this.update(id, userId, { status });
  }
}
