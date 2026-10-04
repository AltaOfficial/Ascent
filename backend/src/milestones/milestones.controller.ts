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
import { MilestonesService, type MilestoneFields } from './milestones.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get('milestones/calendar')
  async getDated(@Request() req) {
    return this.milestonesService.listDated(req.user.userId);
  }

  @Get('projects/:projectId/milestones')
  async list(@Request() req, @Param('projectId') projectId: string) {
    return this.milestonesService.list(projectId, req.user.userId);
  }

  @Post('projects/:projectId/milestones')
  async create(
    @Request() req,
    @Param('projectId') projectId: string,
    @Body() body: MilestoneFields,
  ) {
    return this.milestonesService.create(projectId, req.user.userId, body);
  }

  @Post('projects/:projectId/milestones/:id/update')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() body: MilestoneFields,
  ) {
    return this.milestonesService.update(id, req.user.userId, body);
  }

  @Post('projects/:projectId/milestones/:id/delete')
  async delete(@Request() req, @Param('id') id: string) {
    await this.milestonesService.delete(id, req.user.userId);
  }
}
