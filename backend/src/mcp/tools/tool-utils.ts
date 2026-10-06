import { z } from 'zod';
import type { TaskEntity } from '../../tasks/entities/task.entity';

export const id = z.uuid('Not a valid id');

export const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .describe('Date as YYYY-MM-DD');

/** A task as the tools present it, with time logged so far. */
export function summarizeTask(task: TaskEntity, loggedMinutes = 0) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId,
    sectionId: task.sectionId,
    milestoneId: task.milestoneId,
    dueDate: task.dueDate
      ? new Date(task.dueDate).toISOString().slice(0, 10)
      : null,
    estimatedMinutes: task.estimatedMinutes,
    loggedMinutes,
    tag: task.categoryTag,
    description: task.description,
  };
}
