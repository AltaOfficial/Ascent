import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import {
  MilestoneStatus,
  ProjectMilestoneEntity,
} from '../projects/entities/project-milestone.entity';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { TaskStatus } from '../tasks/entities/task.entity';
import { TimeEntriesService } from '../time-entries/time-entries.service';

export type MilestoneWithProgress = ProjectMilestoneEntity & {
  taskCount: number;
  completedTaskCount: number;
  estimatedMinutes: number;
  actualMinutes: number;
};

export type MilestoneFields = {
  name?: string;
  description?: string | null;
  targetDate?: string | null;
  status?: MilestoneStatus;
};

@Injectable()
export class MilestonesService {
  constructor(
    @InjectRepository(ProjectMilestoneEntity)
    private readonly milestoneRepository: Repository<ProjectMilestoneEntity>,
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
    private readonly timeEntriesService: TimeEntriesService,
  ) {}

  private async assertProject(projectId: string, userId: string) {
    const project = await this.projectsService.findById(projectId, userId);
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async withProgress(
    userId: string,
    milestones: ProjectMilestoneEntity[],
  ): Promise<MilestoneWithProgress[]> {
    const tasks = await this.tasksService.findByMilestoneIds(
      userId,
      milestones.map((m) => m.id),
    );
    const totals = await this.timeEntriesService.getTotalsByTaskIds(
      tasks.map((t) => t.id),
      userId,
    );
    return milestones.map((milestone) => {
      const linked = tasks.filter((t) => t.milestoneId === milestone.id);
      return {
        ...milestone,
        taskCount: linked.length,
        completedTaskCount: linked.filter((t) => t.status === TaskStatus.DONE)
          .length,
        estimatedMinutes: linked.reduce(
          (sum, t) => sum + (t.estimatedMinutes ?? 0),
          0,
        ),
        actualMinutes: linked.reduce((sum, t) => sum + (totals[t.id] ?? 0), 0),
      };
    });
  }

  async list(
    projectId: string,
    userId: string,
  ): Promise<MilestoneWithProgress[]> {
    await this.assertProject(projectId, userId);
    const milestones = await this.milestoneRepository.find({
      where: { projectId, userId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
    return this.withProgress(userId, milestones);
  }

  async findOne(
    id: string,
    userId: string,
  ): Promise<MilestoneWithProgress | null> {
    const milestone = await this.milestoneRepository.findOneBy({ id, userId });
    if (!milestone) return null;
    return (await this.withProgress(userId, [milestone]))[0];
  }

  /** Every dated milestone across projects, for the calendar. */
  async listDated(userId: string) {
    const [milestones, projects] = await Promise.all([
      this.milestoneRepository.find({
        where: { userId, targetDate: Not(IsNull()) },
        order: { targetDate: 'ASC' },
      }),
      this.projectsService.findAllByUserId(userId),
    ]);
    const projectById = new Map(projects.map((p) => [p.id, p]));
    return milestones.flatMap((m) => {
      const project = projectById.get(m.projectId);
      if (!project) return [];
      return [
        {
          id: m.id,
          name: m.name,
          targetDate: m.targetDate,
          status: m.status,
          projectId: m.projectId,
          projectName: project.name,
          projectColor: project.color ?? null,
        },
      ];
    });
  }

  async create(
    projectId: string,
    userId: string,
    fields: MilestoneFields,
  ): Promise<MilestoneWithProgress> {
    await this.assertProject(projectId, userId);
    const last = await this.milestoneRepository.findOne({
      where: { projectId, userId },
      order: { position: 'DESC' },
    });
    const milestone = await this.milestoneRepository.save(
      this.milestoneRepository.create({
        projectId,
        userId,
        name: fields.name?.trim() || 'Untitled milestone',
        description: fields.description ?? null,
        targetDate: fields.targetDate || null,
        position: last ? last.position + 1 : 0,
      }),
    );
    return (await this.withProgress(userId, [milestone]))[0];
  }

  async update(
    id: string,
    userId: string,
    fields: MilestoneFields,
  ): Promise<MilestoneWithProgress | null> {
    const milestone = await this.milestoneRepository.findOneBy({ id, userId });
    if (!milestone) return null;
    const patch: Partial<ProjectMilestoneEntity> = {};
    if (fields.name !== undefined)
      patch.name = fields.name.trim() || milestone.name;
    if (fields.description !== undefined)
      patch.description = fields.description;
    if (fields.targetDate !== undefined)
      patch.targetDate = fields.targetDate || null;
    if (fields.status !== undefined && fields.status !== milestone.status) {
      if (!Object.values(MilestoneStatus).includes(fields.status)) {
        throw new BadRequestException('Unknown milestone status');
      }
      patch.status = fields.status;
      patch.completedAt =
        fields.status === MilestoneStatus.DONE ? new Date() : null;
    }
    if (Object.keys(patch).length) {
      await this.milestoneRepository.update({ id, userId }, patch);
    }
    return this.findOne(id, userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    const milestone = await this.milestoneRepository.findOneBy({ id, userId });
    if (!milestone) return;
    // Linked tasks stay; they just stop being linked.
    await this.tasksService.clearMilestone(userId, id);
    await this.milestoneRepository.delete({ id, userId });
  }
}
