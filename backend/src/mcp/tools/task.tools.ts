import { Injectable, NotFoundException } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import type { Context } from '@rekog/mcp-nest';
import { z } from 'zod';
import { TasksService, type TaskFields } from '../../tasks/tasks.service';
import { TaskStatus } from '../../tasks/entities/task.entity';
import { ProjectsService } from '../../projects/projects.service';
import { TimeEntriesService } from '../../time-entries/time-entries.service';
import type { McpRequest } from '../mcp-auth.guard';
import { dateKey, id, summarizeTask } from './tool-utils';

const status = z.enum(['todo', 'in_progress', 'blocked', 'done']);

const taskFields = {
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: status.optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  projectId: id.nullable().optional(),
  sectionId: id.nullable().optional(),
  milestoneId: id.nullable().optional(),
  dueDate: dateKey.nullable().optional(),
  estimatedMinutes: z.number().int().min(0).nullable().optional(),
};

type TaskArgs = {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  projectId?: string | null;
  sectionId?: string | null;
  milestoneId?: string | null;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
};

/** The schema has already validated the enums and date format. */
function toTaskFields(args: TaskArgs): TaskFields {
  return args as unknown as TaskFields;
}

@Injectable()
export class TaskTools {
  constructor(
    private readonly tasksService: TasksService,
    private readonly projectsService: ProjectsService,
    private readonly timeEntriesService: TimeEntriesService,
  ) {}

  private async withLoggedMinutes(userId: string, taskIds: string[]) {
    return this.timeEntriesService.getTotalsByTaskIds(taskIds, userId);
  }

  @Tool({
    name: 'list_tasks',
    description:
      'List tasks, optionally filtered. Done tasks are excluded unless includeDone is true. Use projectId "inbox" for tasks without a project.',
    parameters: z.object({
      projectId: z.union([id, z.literal('inbox')]).optional(),
      status: status.optional(),
      includeDone: z.boolean().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }),
  })
  async listTasks(
    {
      projectId,
      status: wanted,
      includeDone,
      limit,
    }: {
      projectId?: string;
      status?: string;
      includeDone?: boolean;
      limit?: number;
    },
    _context: Context,
    request: McpRequest,
  ) {
    const { userId } = request.user;
    const tasks = await this.tasksService.findByFilter(
      userId,
      projectId === 'inbox' ? null : projectId,
      wanted,
    );
    const filtered = tasks
      .filter(
        (t) => includeDone || wanted === 'done' || t.status !== TaskStatus.DONE,
      )
      .slice(0, limit ?? 100);
    const totals = await this.withLoggedMinutes(
      userId,
      filtered.map((t) => t.id),
    );
    return filtered.map((t) => summarizeTask(t, totals[t.id] ?? 0));
  }

  @Tool({
    name: 'get_task',
    description: 'One task with its subtasks, repeat settings and logged time.',
    parameters: z.object({ taskId: id }),
  })
  async getTask(
    { taskId }: { taskId: string },
    _context: Context,
    request: McpRequest,
  ) {
    const { userId } = request.user;
    const task = await this.tasksService.findOneById(taskId, userId);
    if (!task) throw new NotFoundException('Task not found');
    const [totals, subtasks] = await Promise.all([
      this.withLoggedMinutes(userId, [task.id]),
      this.tasksService.findSubtasksByTaskId(task.id),
    ]);
    return {
      ...summarizeTask(task, totals[task.id] ?? 0),
      repeat: task.repeatTask
        ? {
            frequency: task.repeatTask.repeatFrequency,
            days: task.repeatTask.repeatDays,
            interval: task.repeatTask.repeatInterval,
            mode: task.repeatTask.repeatMode,
          }
        : null,
      subtasks: subtasks.map((s) => ({
        id: s.id,
        title: s.title,
        completed: s.completed,
      })),
    };
  }

  @Tool({
    name: 'create_task',
    description:
      'Create a task. Without projectId it goes to the inbox. Get project and section ids from list_projects.',
    parameters: z.object({ ...taskFields, title: z.string().min(1) }),
  })
  async createTask(args: TaskArgs, _context: Context, request: McpRequest) {
    const { userId } = request.user;
    if (args.projectId) {
      const project = await this.projectsService.findById(
        args.projectId,
        userId,
      );
      if (!project) throw new NotFoundException('Project not found');
    }
    const task = await this.tasksService.create(userId, toTaskFields(args));
    return summarizeTask(task);
  }

  @Tool({
    name: 'update_task',
    description: 'Change any fields of a task. Omitted fields are left alone.',
    parameters: z.object({ taskId: id, ...taskFields }),
  })
  async updateTask(
    { taskId, ...fields }: TaskArgs & { taskId: string },
    _context: Context,
    request: McpRequest,
  ) {
    const { userId } = request.user;
    const task = await this.tasksService.update(
      taskId,
      userId,
      toTaskFields(fields),
    );
    if (!task) throw new NotFoundException('Task not found');
    const totals = await this.withLoggedMinutes(userId, [task.id]);
    return summarizeTask(task, totals[task.id] ?? 0);
  }

  @Tool({
    name: 'complete_task',
    description: 'Mark a task done (stops its timer if it is running).',
    parameters: z.object({ taskId: id }),
  })
  async completeTask(
    { taskId }: { taskId: string },
    _context: Context,
    request: McpRequest,
  ) {
    const { userId } = request.user;
    const active = await this.timeEntriesService.getActive(userId);
    if (active?.taskId === taskId) {
      await this.timeEntriesService.stop(active.id, userId);
    }
    const task = await this.tasksService.update(taskId, userId, {
      status: TaskStatus.DONE,
    });
    if (!task) throw new NotFoundException('Task not found');
    return `Completed "${task.title}".`;
  }

  @Tool({
    name: 'add_subtask',
    description: 'Add a checklist item to a task.',
    parameters: z.object({ taskId: id, title: z.string().min(1) }),
  })
  async addSubtask(
    { taskId, title }: { taskId: string; title: string },
    _context: Context,
    request: McpRequest,
  ) {
    const task = await this.tasksService.findOneById(
      taskId,
      request.user.userId,
    );
    if (!task) throw new NotFoundException('Task not found');
    return this.tasksService.createSubtask(taskId, title);
  }

  @Tool({
    name: 'set_subtask_completed',
    description: 'Mark a subtask complete or incomplete.',
    parameters: z.object({
      taskId: id,
      subtaskId: id,
      completed: z.boolean(),
    }),
  })
  async setSubtaskCompleted(
    {
      taskId,
      subtaskId,
      completed,
    }: { taskId: string; subtaskId: string; completed: boolean },
    _context: Context,
    request: McpRequest,
  ) {
    const task = await this.tasksService.findOneById(
      taskId,
      request.user.userId,
    );
    if (!task) throw new NotFoundException('Task not found');
    const subtask = await this.tasksService.updateSubtask(subtaskId, taskId, {
      completed,
    });
    if (!subtask) throw new NotFoundException('Subtask not found');
    return subtask;
  }
}
