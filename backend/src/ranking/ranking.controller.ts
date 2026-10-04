import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RankingService } from './ranking.service';

@UseGuards(JwtAuthGuard)
@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('me')
  async getMyRank(@Request() req) {
    return this.rankingService.calculateRank(req.user.userId);
  }

  @Get('history')
  async getHistory(@Request() req) {
    return this.rankingService.getHistory(req.user.userId);
  }
}
