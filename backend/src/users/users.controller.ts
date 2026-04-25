import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { TimeEntriesService } from '../time-entries/time-entries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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

  @Post('settings')
  async updateSettings(
    @Request() req,
    @Body() body: { timezone?: string; weekStart?: string },
  ) {
    return await this.usersService.updateSettings(req.user.userId, body);
  }

  @Post('hours')
  async getHours(
    @Request() req,
    @Body() body: { range: '7d' | '30d' | '3m'; tzOffset?: number },
  ) {
    const rangeMap = { '7d': 7, '30d': 30, '3m': 90 };
    const days = rangeMap[body.range] ?? 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const timeEntries = await this.timeEntriesService.findCompletedByUserSince(
      req.user.userId,
      since,
    );

    // tzOffset is getTimezoneOffset() from the browser: minutes *behind* UTC
    // (e.g. UTC-5 → 300, UTC+5 → -300). Subtract to shift UTC → local time.
    const offsetMs = (body.tzOffset ?? 0) * 60 * 1000;

    const hoursByDate: Record<string, number> = {};
    for (const entry of timeEntries) {
      const localTime = new Date(entry.startedAt.getTime() - offsetMs);
      const dateKey = localTime.toISOString().split('T')[0];
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
