import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TimeEntryEntity } from './entities/time-entry.entity';

@Injectable()
export class TimeEntriesService {
  constructor(
    @InjectRepository(TimeEntryEntity)
    private readonly timeEntryRepository: Repository<TimeEntryEntity>,
  ) {}

  async start(userId: string, taskId: string): Promise<TimeEntryEntity> {
    const timeEntry = this.timeEntryRepository.create({
      userId,
      taskId,
      startedAt: new Date(),
    });
    return await this.timeEntryRepository.save(timeEntry);
  }

  async stop(
    timeEntryId: string,
    userId: string,
  ): Promise<TimeEntryEntity | null> {
    await this.timeEntryRepository.update(
      { id: timeEntryId, userId },
      { endedAt: new Date() },
    );
    return await this.timeEntryRepository.findOneBy({ id: timeEntryId });
  }

  async getActive(userId: string): Promise<TimeEntryEntity | null> {
    return await this.timeEntryRepository.findOneBy({
      userId,
      endedAt: IsNull(),
    });
  }

  async findCompletedByUserSince(
    userId: string,
    since: Date,
  ): Promise<TimeEntryEntity[]> {
    return await this.timeEntryRepository
      .createQueryBuilder('timeEntry')
      .where('timeEntry.userId = :userId', { userId })
      .andWhere('timeEntry.endedAt IS NOT NULL')
      .andWhere('timeEntry.startedAt >= :since', { since })
      .getMany();
  }

  async getEntriesByDateRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<TimeEntryEntity[]> {
    return await this.timeEntryRepository
      .createQueryBuilder('timeEntry')
      .where('timeEntry.userId = :userId', { userId })
      .andWhere('timeEntry.endedAt IS NOT NULL')
      .andWhere('timeEntry.startedAt >= :startDate', { startDate })
      .andWhere('timeEntry.startedAt <= :endDate', { endDate })
      .getMany();
  }

  async getTotalsByTaskIds(
    taskIds: string[],
    userId: string,
  ): Promise<Record<string, number>> {
    if (!taskIds.length) return {};
    const entries = await this.timeEntryRepository
      .createQueryBuilder('te')
      .where('te.taskId IN (:...taskIds)', { taskIds })
      .andWhere('te.userId = :userId', { userId })
      .andWhere('te.endedAt IS NOT NULL')
      .getMany();
    const totals: Record<string, number> = {};
    for (const entry of entries) {
      const minutes = Math.round(
        (entry.endedAt.getTime() - entry.startedAt.getTime()) / 60000,
      );
      totals[entry.taskId] = (totals[entry.taskId] ?? 0) + minutes;
    }
    return totals;
  }
}
