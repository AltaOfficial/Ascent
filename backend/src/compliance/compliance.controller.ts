import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
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

  @Delete('rules/:id')
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
}
