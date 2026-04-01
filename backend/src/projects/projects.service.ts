import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity, ProjectViewType } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
  ) {}

  async findAllByUserId(userId: string): Promise<ProjectEntity[]> {
    return await this.projectRepository.findBy({ userId });
  }

  async create(
    userId: string,
    name: string,
    viewType?: ProjectViewType,
    categoryTag?: string,
  ): Promise<ProjectEntity> {
    const project = this.projectRepository.create({
      userId,
      name,
      viewType: viewType ?? ProjectViewType.LIST,
      categoryTag: categoryTag ?? undefined,
    });
    return await this.projectRepository.save(project);
  }

  async update(
    id: string,
    userId: string,
    updates: Partial<Pick<ProjectEntity, 'name' | 'viewType' | 'categoryTag'>>,
  ): Promise<ProjectEntity | null> {
    await this.projectRepository.update({ id, userId }, updates);
    return await this.projectRepository.findOneBy({ id });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.projectRepository.delete({ id, userId });
  }
}
