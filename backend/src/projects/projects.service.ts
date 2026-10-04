import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ProjectEntity, ProjectViewType } from './entities/project.entity';
import { ProjectSectionEntity } from './entities/project-section.entity';
import { TaskTagEntity } from './entities/task-tag.entity';
import { ProjectFolderEntity } from './entities/project-folder.entity';
import { wouldCreateCycle } from './folder-tree';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(ProjectSectionEntity)
    private readonly sectionRepository: Repository<ProjectSectionEntity>,
    @InjectRepository(TaskTagEntity)
    private readonly tagRepository: Repository<TaskTagEntity>,
    @InjectRepository(ProjectFolderEntity)
    private readonly folderRepository: Repository<ProjectFolderEntity>,
  ) {}

  async findAllByUserId(userId: string): Promise<ProjectEntity[]> {
    return await this.projectRepository.find({
      where: { userId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  async findById(id: string, userId: string): Promise<ProjectEntity | null> {
    return await this.projectRepository.findOneBy({ id, userId });
  }

  private async assertFolderOwned(
    folderId: string | null | undefined,
    userId: string,
  ): Promise<void> {
    if (!folderId) return;
    const folder = await this.folderRepository.findOneBy({
      id: folderId,
      userId,
    });
    if (!folder) throw new NotFoundException('Folder not found');
  }

  private async nextProjectPosition(
    userId: string,
    folderId: string | null,
  ): Promise<number> {
    const last = await this.projectRepository.findOne({
      where: { userId, folderId: folderId ?? IsNull() },
      order: { position: 'DESC' },
    });
    return last ? last.position + 1 : 0;
  }

  async create(
    userId: string,
    name: string,
    viewType?: ProjectViewType,
    color?: string,
    folderId?: string | null,
  ): Promise<ProjectEntity> {
    await this.assertFolderOwned(folderId, userId);
    const project = this.projectRepository.create({
      userId,
      name,
      viewType: viewType ?? ProjectViewType.LIST,
      color: color ?? undefined,
      folderId: folderId ?? null,
      position: await this.nextProjectPosition(userId, folderId ?? null),
    });
    return await this.projectRepository.save(project);
  }

  async update(
    id: string,
    userId: string,
    updates: Partial<
      Pick<ProjectEntity, 'name' | 'viewType' | 'color' | 'folderId'>
    >,
  ): Promise<ProjectEntity | null> {
    const project = await this.findById(id, userId);
    if (!project) return null;
    const patch: Partial<ProjectEntity> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.viewType !== undefined) patch.viewType = updates.viewType;
    if (updates.color !== undefined) patch.color = updates.color;
    if (
      updates.folderId !== undefined &&
      updates.folderId !== project.folderId
    ) {
      await this.assertFolderOwned(updates.folderId, userId);
      patch.folderId = updates.folderId;
      patch.position = await this.nextProjectPosition(userId, updates.folderId);
    }
    if (Object.keys(patch).length) {
      await this.projectRepository.update({ id, userId }, patch);
    }
    return await this.projectRepository.findOneBy({ id });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.projectRepository.delete({ id, userId });
  }

  /** Places `projectIds` in `folderId` (null = top level) in that order. */
  async arrangeProjects(
    userId: string,
    folderId: string | null,
    projectIds: string[],
  ): Promise<void> {
    await this.assertFolderOwned(folderId, userId);
    const owned = await this.projectRepository.findBy({
      userId,
      id: In(projectIds.length ? projectIds : ['']),
    });
    const ownedIds = new Set(owned.map((p) => p.id));
    let position = 0;
    for (const projectId of projectIds) {
      if (!ownedIds.has(projectId)) continue;
      await this.projectRepository.update(
        { id: projectId, userId },
        { folderId, position: position++ },
      );
    }
  }

  // Folders

  async getFolders(userId: string): Promise<ProjectFolderEntity[]> {
    return await this.folderRepository.find({
      where: { userId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  async createFolder(
    userId: string,
    name: string,
    parentId: string | null,
  ): Promise<ProjectFolderEntity> {
    await this.assertFolderOwned(parentId, userId);
    const last = await this.folderRepository.findOne({
      where: { userId, parentId: parentId ?? IsNull() },
      order: { position: 'DESC' },
    });
    const folder = this.folderRepository.create({
      userId,
      name,
      parentId: parentId ?? null,
      position: last ? last.position + 1 : 0,
    });
    return await this.folderRepository.save(folder);
  }

  async updateFolder(
    id: string,
    userId: string,
    updates: { name?: string; collapsed?: boolean },
  ): Promise<ProjectFolderEntity | null> {
    const patch: Partial<ProjectFolderEntity> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.collapsed !== undefined) patch.collapsed = updates.collapsed;
    if (Object.keys(patch).length) {
      await this.folderRepository.update({ id, userId }, patch);
    }
    return await this.folderRepository.findOneBy({ id, userId });
  }

  /**
   * Places `folderIds` inside `parentId` (null = top level) in that order.
   * Refuses any move that would put a folder inside itself.
   */
  async arrangeFolders(
    userId: string,
    parentId: string | null,
    folderIds: string[],
  ): Promise<void> {
    await this.assertFolderOwned(parentId, userId);
    const folders = await this.getFolders(userId);
    const ownedIds = new Set(folders.map((f) => f.id));
    for (const folderId of folderIds) {
      if (
        ownedIds.has(folderId) &&
        wouldCreateCycle(folders, folderId, parentId)
      ) {
        throw new BadRequestException('A folder cannot be moved inside itself');
      }
    }
    let position = 0;
    for (const folderId of folderIds) {
      if (!ownedIds.has(folderId)) continue;
      await this.folderRepository.update(
        { id: folderId, userId },
        { parentId, position: position++ },
      );
    }
  }

  /**
   * Deletes a folder. Its subfolders and projects move up to the folder's
   * parent, after whatever is already there — nothing inside is deleted.
   */
  async deleteFolder(id: string, userId: string): Promise<void> {
    const folder = await this.folderRepository.findOneBy({ id, userId });
    if (!folder) return;
    const parentId = folder.parentId ?? null;

    const children = await this.folderRepository.find({
      where: { userId, parentId: id },
      order: { position: 'ASC' },
    });
    const siblings = await this.folderRepository.find({
      where: { userId, parentId: parentId ?? IsNull() },
    });
    let folderPosition =
      Math.max(-1, ...siblings.map((sibling) => sibling.position)) + 1;
    for (const child of children) {
      await this.folderRepository.update(
        { id: child.id },
        { parentId, position: folderPosition++ },
      );
    }

    const projects = await this.projectRepository.find({
      where: { userId, folderId: id },
      order: { position: 'ASC' },
    });
    let projectPosition = await this.nextProjectPosition(userId, parentId);
    for (const project of projects) {
      await this.projectRepository.update(
        { id: project.id },
        { folderId: parentId, position: projectPosition++ },
      );
    }

    await this.folderRepository.delete({ id, userId });
  }

  // Sections

  async getSections(
    projectId: string,
    userId: string,
  ): Promise<ProjectSectionEntity[]> {
    return await this.sectionRepository.find({
      where: { projectId, userId },
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  async createSection(
    projectId: string,
    userId: string,
    name: string,
    order?: number,
  ): Promise<ProjectSectionEntity> {
    let position = order;
    if (position === undefined) {
      const last = await this.sectionRepository.findOne({
        where: { projectId, userId },
        order: { order: 'DESC' },
      });
      position = last ? last.order + 1 : 0;
    }
    const section = this.sectionRepository.create({
      projectId,
      userId,
      name,
      order: position,
    });
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

  /** Rewrites section order for a project to match `sectionIds`. */
  async reorderSections(
    projectId: string,
    userId: string,
    sectionIds: string[],
  ): Promise<ProjectSectionEntity[]> {
    const sections = await this.getSections(projectId, userId);
    const known = new Set(sections.map((s) => s.id));
    let order = 0;
    for (const sectionId of sectionIds) {
      if (!known.has(sectionId)) continue;
      await this.sectionRepository.update(
        { id: sectionId, userId },
        { order: order++ },
      );
    }
    // Any section the client didn't mention keeps its relative order at the end.
    for (const section of sections) {
      if (sectionIds.includes(section.id)) continue;
      await this.sectionRepository.update(
        { id: section.id, userId },
        { order: order++ },
      );
    }
    return await this.getSections(projectId, userId);
  }

  async deleteSection(id: string, userId: string): Promise<void> {
    await this.sectionRepository.delete({ id, userId });
  }

  // Tags

  async getTags(projectId: string, userId: string): Promise<TaskTagEntity[]> {
    return await this.tagRepository.findBy({ projectId, userId });
  }

  async createTag(
    projectId: string,
    userId: string,
    name: string,
    color: string,
  ): Promise<TaskTagEntity> {
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
