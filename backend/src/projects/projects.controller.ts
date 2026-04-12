import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectViewType } from './entities/project.entity';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async getProjects(@Request() req) {
    return this.projectsService.findAllByUserId(req.user.userId);
  }

  @Get(':id')
  async getProject(@Request() req, @Param('id') id: string) {
    const project = await this.projectsService.findById(id, req.user.userId);
    if (!project) throw new NotFoundException();
    return project;
  }

  @Post()
  async createProject(
    @Request() req,
    @Body()
    body: { name: string; viewType?: ProjectViewType; color?: string },
  ) {
    return this.projectsService.create(
      req.user.userId,
      body.name,
      body.viewType,
      body.color,
    );
  }

  @Post(':id/update')
  async updateProject(
    @Request() req,
    @Param('id') id: string,
    @Body()
    body: { name?: string; viewType?: ProjectViewType; color?: string },
  ) {
    return this.projectsService.update(id, req.user.userId, body);
  }

  @Post(':id/delete')
  async deleteProject(@Request() req, @Param('id') id: string) {
    await this.projectsService.delete(id, req.user.userId);
  }

  // Sections

  @Get(':id/sections')
  async getSections(@Request() req, @Param('id') projectId: string) {
    return this.projectsService.getSections(projectId, req.user.userId);
  }

  @Post(':id/sections')
  async createSection(
    @Request() req,
    @Param('id') projectId: string,
    @Body() body: { name: string; order?: number },
  ) {
    return this.projectsService.createSection(
      projectId,
      req.user.userId,
      body.name,
      body.order ?? 0,
    );
  }

  @Post(':id/sections/:sectionId/update')
  async updateSection(
    @Request() req,
    @Param('sectionId') sectionId: string,
    @Body() body: { name?: string; order?: number },
  ) {
    return this.projectsService.updateSection(sectionId, req.user.userId, body);
  }

  @Post(':id/sections/:sectionId/delete')
  async deleteSection(@Request() req, @Param('sectionId') sectionId: string) {
    await this.projectsService.deleteSection(sectionId, req.user.userId);
  }

  // Tags

  @Get(':id/tags')
  async getTags(@Request() req, @Param('id') projectId: string) {
    return this.projectsService.getTags(projectId, req.user.userId);
  }

  @Post(':id/tags')
  async createTag(
    @Request() req,
    @Param('id') projectId: string,
    @Body() body: { name: string; color: string },
  ) {
    return this.projectsService.createTag(projectId, req.user.userId, body.name, body.color ?? '#6b7280');
  }

  @Post(':id/tags/:tagId/update')
  async updateTag(
    @Request() req,
    @Param('tagId') tagId: string,
    @Body() body: { name?: string; color?: string },
  ) {
    return this.projectsService.updateTag(tagId, req.user.userId, body);
  }

  @Post(':id/tags/:tagId/delete')
  async deleteTag(@Request() req, @Param('tagId') tagId: string) {
    await this.projectsService.deleteTag(tagId, req.user.userId);
  }
}
