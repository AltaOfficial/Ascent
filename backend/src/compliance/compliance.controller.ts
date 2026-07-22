import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ComplianceService } from './compliance.service';

@UseGuards(JwtAuthGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('rules')
  async getRules(@Request() req) {
    return this.complianceService.getRules(req.user.userId);
  }

  @Post('rules')
  async createRule(@Request() req, @Body() body: { name: string }) {
    return this.complianceService.createRule(req.user.userId, body.name);
  }

  @Post('rules/:id/delete')
  async deleteRule(@Request() req, @Param('id') ruleId: string) {
    return this.complianceService.deleteRule(ruleId, req.user.userId);
  }

  // GET /compliance/entries?start=YYYY-MM-DD&end=YYYY-MM-DD
  @Get('entries')
  async getEntries(
    @Request() req,
    @Query('start') startDate: string,
    @Query('end') endDate: string,
  ) {
    return this.complianceService.getEntries(
      req.user.userId,
      startDate,
      endDate,
    );
  }

  @Post('entries')
  async upsertEntry(
    @Request() req,
    @Body() body: { ruleId: string; date: string; checked: boolean },
  ) {
    return this.complianceService.upsertEntry(
      req.user.userId,
      body.ruleId,
      body.date,
      body.checked,
    );
  }

  // GET /compliance/urge-logs?start=YYYY-MM-DD&end=YYYY-MM-DD (both optional — omit for full history)
  @Get('urge-logs')
  async getUrgeLogs(
    @Request() req,
    @Query('start') startDate?: string,
    @Query('end') endDate?: string,
  ) {
    return this.complianceService.getUrgeLogs(
      req.user.userId,
      startDate,
      endDate,
    );
  }

  @Post('urge-logs')
  async createUrgeLog(
    @Request() req,
    @Body()
    body: {
      ruleId: string;
      intensity?: number;
      durationSeconds?: number | null;
      trigger?: string;
      whoWhere?: string | null;
      copingNotes?: string | null;
      nextTimeIdea?: string | null;
      reflection?: string | null;
    },
  ) {
    const { ruleId, ...fields } = body;
    return this.complianceService.createUrgeLog(
      req.user.userId,
      ruleId,
      fields,
    );
  }

  @Post('urge-logs/:id/update')
  async updateUrgeLog(
    @Request() req,
    @Param('id') id: string,
    @Body()
    body: {
      intensity?: number;
      durationSeconds?: number | null;
      trigger?: string;
      whoWhere?: string | null;
      copingNotes?: string | null;
      nextTimeIdea?: string | null;
      reflection?: string | null;
    },
  ) {
    return this.complianceService.updateUrgeLog(id, req.user.userId, body);
  }

  @Post('urge-logs/:id/delete')
  async deleteUrgeLog(@Request() req, @Param('id') id: string) {
    return this.complianceService.deleteUrgeLog(id, req.user.userId);
  }
}
