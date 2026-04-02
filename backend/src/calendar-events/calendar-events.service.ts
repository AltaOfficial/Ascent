import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEventEntity } from './entities/calendar-event.entity';

@Injectable()
export class CalendarEventsService {
  constructor(
    @InjectRepository(CalendarEventEntity)
    private readonly repo: Repository<CalendarEventEntity>,
  ) {}

  async findAllByUserId(userId: string): Promise<CalendarEventEntity[]> {
    return this.repo.findBy({ userId });
  }

  async create(userId: string, data: Partial<CalendarEventEntity>): Promise<CalendarEventEntity> {
    const event = this.repo.create({ ...data, userId });
    return this.repo.save(event);
  }

  async update(id: string, userId: string, data: Partial<CalendarEventEntity>): Promise<CalendarEventEntity | null> {
    await this.repo.update({ id, userId }, data);
    return this.repo.findOneBy({ id });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.repo.delete({ id, userId });
  }
}
