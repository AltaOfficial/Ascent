import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ProjectViewType } from './entities/project.entity';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async getProjects(@Request() req) {
    return this.projectsService.findAllByUserId(req.user.userId);
  }

  @Post()
  async createProject(
    @Request() req,
    @Body()
    body: { name: string; viewType?: ProjectViewType; categoryTag?: string },
  ) {
    return this.projectsService.create(
      req.user.userId,
      body.name,
      body.viewType,
      body.categoryTag,
    );
  }

  @Patch(':id')
  async updateProject(
    @Request() req,
    @Param('id') id: string,
    @Body()
    body: { name?: string; viewType?: ProjectViewType; categoryTag?: string },
  ) {
    return this.projectsService.update(id, req.user.userId, body);
  }

  @Delete(':id')
  async deleteProject(@Request() req, @Param('id') id: string) {
    await this.projectsService.delete(id, req.user.userId);
  }
}
