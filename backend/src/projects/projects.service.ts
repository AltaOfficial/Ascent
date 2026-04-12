import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity, ProjectViewType } from './entities/project.entity';
import { ProjectSectionEntity } from './entities/project-section.entity';
import { TaskTagEntity } from './entities/task-tag.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(ProjectSectionEntity)
    private readonly sectionRepository: Repository<ProjectSectionEntity>,
    @InjectRepository(TaskTagEntity)
    private readonly tagRepository: Repository<TaskTagEntity>,
  ) {}

  async findAllByUserId(userId: string): Promise<ProjectEntity[]> {
    return await this.projectRepository.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  async findById(id: string, userId: string): Promise<ProjectEntity | null> {
    return await this.projectRepository.findOneBy({ id, userId });
  }

  async create(
    userId: string,
    name: string,
    viewType?: ProjectViewType,
    color?: string,
  ): Promise<ProjectEntity> {
    const project = this.projectRepository.create({
      userId,
      name,
      viewType: viewType ?? ProjectViewType.LIST,
      color: color ?? undefined,
    });
    return await this.projectRepository.save(project);
  }

  async update(
    id: string,
    userId: string,
    updates: Partial<Pick<ProjectEntity, 'name' | 'viewType' | 'color'>>,
  ): Promise<ProjectEntity | null> {
    await this.projectRepository.update({ id, userId }, updates);
    return await this.projectRepository.findOneBy({ id });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.projectRepository.delete({ id, userId });
  }

  // Sections

  async getSections(projectId: string, userId: string): Promise<ProjectSectionEntity[]> {
    return await this.sectionRepository.findBy({ projectId, userId });
  }

  async createSection(
    projectId: string,
    userId: string,
    name: string,
    order: number,
  ): Promise<ProjectSectionEntity> {
    const section = this.sectionRepository.create({ projectId, userId, name, order });
    return await this.sectionRepository.save(section);
  }

  async updateSection(
    id: string,
    userId: string,
    updates: Partial<Pick<ProjectSectionEntity, 'name' | 'order'>>,
  ): Promise<ProjectSectionEntity | null> {
    await this.sectionRepository.update({ id, userId }, updates);
    return await this.sectionRepository.findOneBy({ id });
  }

  async deleteSection(id: string, userId: string): Promise<void> {
    await this.sectionRepository.delete({ id, userId });
  }

  // Tags

  async getTags(projectId: string, userId: string): Promise<TaskTagEntity[]> {
    return await this.tagRepository.findBy({ projectId, userId });
  }

  async createTag(projectId: string, userId: string, name: string, color: string): Promise<TaskTagEntity> {
    const tag = this.tagRepository.create({ projectId, userId, name, color });
    return await this.tagRepository.save(tag);
  }

  async updateTag(
    id: string,
    userId: string,
    updates: Partial<Pick<TaskTagEntity, 'name' | 'color'>>,
  ): Promise<TaskTagEntity | null> {
    await this.tagRepository.update({ id, userId }, updates);
    return await this.tagRepository.findOneBy({ id });
  }

  async deleteTag(id: string, userId: string): Promise<void> {
    await this.tagRepository.delete({ id, userId });
  }
}
