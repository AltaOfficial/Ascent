import { Injectable, NotFoundException } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import type { Context } from '@rekog/mcp-nest';
import { z } from 'zod';
import { ProjectsService } from '../../projects/projects.service';
import { MilestonesService } from '../../milestones/milestones.service';
import type { McpRequestWithUser } from '@rekog/mcp-nest';
import { dateKey, id } from './tool-utils';

@Injectable()
export class ProjectTools {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly milestonesService: MilestonesService,
  ) {}

  @Tool({
    name: 'list_projects',
    description:
      "All projects with their folder path, plus each project's sections. Use this to find project and section ids.",
  })
  async listProjects(
    _args: object,
    _context: Context,
    request: McpRequestWithUser,
  ) {
    const userId = request.user.sub;
    const [projects, folders] = await Promise.all([
      this.projectsService.findAllByUserId(userId),
      this.projectsService.getFolders(userId),
    ]);
    const folderById = new Map(folders.map((f) => [f.id, f]));
    const pathOf = (folderId: string | null) => {
      const names: string[] = [];
      const seen = new Set<string>();
      let current = folderId ? folderById.get(folderId) : undefined;
      while (current && !seen.has(current.id)) {
        seen.add(current.id);
        names.unshift(current.name);
        current = current.parentId
          ? folderById.get(current.parentId)
          : undefined;
      }
      return names.join(' / ') || null;
    };
    return Promise.all(
      projects.map(async (project) => ({
        id: project.id,
        name: project.name,
        folder: pathOf(project.folderId),
        sections: (
          await this.projectsService.getSections(project.id, userId)
        ).map((s) => ({ id: s.id, name: s.name })),
      })),
    );
  }

  @Tool({
    name: 'list_milestones',
    description: 'Milestones of a project with progress.',
    parameters: z.object({ projectId: id }),
  })
  async listMilestones(
    { projectId }: { projectId: string },
    _context: Context,
    request: McpRequestWithUser,
  ) {
    return this.milestonesService.list(projectId, request.user.sub);
  }

  @Tool({
    name: 'create_milestone',
    description: 'Add a milestone to a project.',
    parameters: z.object({
      projectId: id,
      name: z.string().min(1),
      targetDate: dateKey.optional(),
      description: z.string().optional(),
    }),
  })
  async createMilestone(
    {
      projectId,
      ...fields
    }: {
      projectId: string;
      name: string;
      targetDate?: string;
      description?: string;
    },
    _context: Context,
    request: McpRequestWithUser,
  ) {
    const project = await this.projectsService.findById(
      projectId,
      request.user.sub,
    );
    if (!project) throw new NotFoundException('Project not found');
    return this.milestonesService.create(projectId, request.user.sub, fields);
  }
}
