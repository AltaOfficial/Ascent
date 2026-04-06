import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { TimeEntriesService } from 'src/time-entries/time-entries.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly timeEntriesService: TimeEntriesService,
  ) {}

  @Get('me')
  async getMe(@Request() req) {
    return await this.usersService.findOneById(req.user.userId);
  }

  @Post('hours')
  async getHours(@Request() req, @Body() body: { range: '7d' | '30d' | '3m' }) {
    const rangeMap = { '7d': 7, '30d': 30, '3m': 90 };
    const days = rangeMap[body.range] ?? 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const timeEntries = await this.timeEntriesService.findCompletedByUserSince(
      req.user.userId,
      since,
    );

    const hoursByDate: Record<string, number> = {};
    for (const entry of timeEntries) {
      const dateKey = entry.startedAt.toISOString().split('T')[0];
      const durationInHours =
        (entry.endedAt.getTime() - entry.startedAt.getTime()) / 1000 / 3600;
      hoursByDate[dateKey] = (hoursByDate[dateKey] ?? 0) + durationInHours;
    }

    return Object.entries(hoursByDate).map(([date, hours]) => ({
      date,
      hours: Math.round(hours * 100) / 100,
    }));
  }
}
