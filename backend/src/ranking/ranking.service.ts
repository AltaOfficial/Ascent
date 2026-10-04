import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { UserRankingEntity } from './entities/user-ranking.entity';
import { UsersService } from '../users/users.service';
import { TimeEntriesService } from '../time-entries/time-entries.service';
import { ComplianceService } from '../compliance/compliance.service';
import { RankInput, RankResult, computeRank } from './ranking.compute';
import { addDaysToKey, dateKeyInTz, startOfDayInTz } from '../common/dates';

const HISTORY_DAYS = 90;

@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name);

  constructor(
    @InjectRepository(UserRankingEntity)
    private readonly rankingRepository: Repository<UserRankingEntity>,
    private readonly usersService: UsersService,
    private readonly timeEntriesService: TimeEntriesService,
    private readonly complianceService: ComplianceService,
  ) {}

  private async loadInput(userId: string, now: Date): Promise<RankInput> {
    const user = await this.usersService.findOneById(userId);
    const timezone = user?.timezone ?? 'UTC';
    const [sessions, rules] = await Promise.all([
      this.timeEntriesService.findCompletedByUserSince(userId, new Date(0)),
      this.complianceService.getRules(userId),
    ]);
    const today = dateKeyInTz(now, timezone);
    // A cycle is at most 90 days, and it can start up to 90 days after the
    // previous one began, so 200 days of compliance history is always enough.
    const complianceEntries = await this.complianceService.getEntries(
      userId,
      addDaysToKey(today, -200),
      today,
    );
    return {
      timezone,
      now,
      sessions,
      rules,
      complianceEntries,
    };
  }

  async calculateRank(userId: string, now = new Date()): Promise<RankResult> {
    return computeRank(await this.loadInput(userId, now));
  }

  /** Stored daily snapshots, backfilling any missing days of the last 90. */
  async getHistory(
    userId: string,
  ): Promise<{ date: string; score: number; rank: string }[]> {
    await this.recordSnapshots(userId);
    const rows = await this.rankingRepository.find({
      where: { userId },
      order: { date: 'ASC' },
    });
    return rows
      .slice(-HISTORY_DAYS)
      .map((row) => ({ date: row.date, score: row.score, rank: row.rank }));
  }

  /**
   * Upserts a snapshot for every scored day in the last 90 days that doesn't
   * have one yet. Older days are left alone; the last few are always
   * recomputed because compliance for yesterday is often marked the next day.
   */
  async recordSnapshots(userId: string, now = new Date()): Promise<void> {
    const input = await this.loadInput(userId, now);
    const today = dateKeyInTz(now, input.timezone);
    const existing = new Set(
      (
        await this.rankingRepository.find({
          where: { userId },
          select: { date: true },
        })
      ).map((row) => row.date),
    );

    for (let offset = HISTORY_DAYS; offset >= 0; offset--) {
      const day = addDaysToKey(today, -offset);
      // The day is "final" once it's over; evaluate as of the next morning.
      const asOf =
        day === today
          ? now
          : startOfDayInTz(addDaysToKey(day, 1), input.timezone);
      if (offset > 2 && existing.has(day)) continue;
      const result = computeRank({ ...input, now: asOf });
      if (result.evaluatedThrough !== day) continue;
      await this.rankingRepository.upsert(
        {
          userId,
          date: day,
          score: result.score,
          rank: result.rank,
          cycleStart: result.cycle?.start ?? null,
        },
        ['userId', 'date'],
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async snapshotAllUsers(): Promise<void> {
    const users = await this.usersService.findAll();
    for (const user of users) {
      try {
        await this.recordSnapshots(user.id);
      } catch (error) {
        this.logger.error(`Rank snapshot failed for ${user.id}`, error);
      }
    }
  }
}
