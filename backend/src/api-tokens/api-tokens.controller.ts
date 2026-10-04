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
import { ApiTokensService } from './api-tokens.service';

@UseGuards(JwtAuthGuard)
@Controller('api-tokens')
export class ApiTokensController {
  constructor(private readonly apiTokensService: ApiTokensService) {}

  @Get()
  async list(@Request() req) {
    return this.apiTokensService.list(req.user.userId);
  }

  @Post()
  async create(@Request() req, @Body() body: { name?: string }) {
    return this.apiTokensService.create(req.user.userId, body?.name ?? '');
  }

  @Post(':id/revoke')
  async revoke(@Request() req, @Param('id') id: string) {
    await this.apiTokensService.revoke(req.user.userId, id);
  }
}
