import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectsService } from './projects.service';

@UseGuards(JwtAuthGuard)
@Controller('project-folders')
export class ProjectFoldersController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async getFolders(@Request() req) {
    return this.projectsService.getFolders(req.user.userId);
  }

  @Post()
  async createFolder(
    @Request() req,
    @Body() body: { name: string; parentId?: string | null },
  ) {
    return this.projectsService.createFolder(
      req.user.userId,
      body.name?.trim() || 'New folder',
      body.parentId ?? null,
    );
  }

  // Moves folders into a parent (null = top level) in the given order
  @Post('arrange')
  async arrangeFolders(
    @Request() req,
    @Body() body: { parentId: string | null; folderIds: string[] },
  ) {
    await this.projectsService.arrangeFolders(
      req.user.userId,
      body.parentId ?? null,
      body.folderIds ?? [],
    );
  }

  @Post(':id/update')
  async updateFolder(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { name?: string; collapsed?: boolean },
  ) {
    return this.projectsService.updateFolder(id, req.user.userId, body);
  }

  @Post(':id/delete')
  async deleteFolder(@Request() req, @Param('id') id: string) {
    await this.projectsService.deleteFolder(id, req.user.userId);
  }
}
