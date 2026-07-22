import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ComplianceRuleEntity } from './entities/compliance-rule.entity';
import { ComplianceEntryEntity } from './entities/compliance-entry.entity';
import { UrgeLogEntity } from './entities/urge-log.entity';

type UrgeLogFields = {
  intensity?: number;
  durationSeconds?: number | null;
  trigger?: string;
  whoWhere?: string | null;
  copingNotes?: string | null;
  nextTimeIdea?: string | null;
  reflection?: string | null;
};

function clampIntensity(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value)));
}

function truncateText(value: string): string {
  return value.slice(0, 200);
}

@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(ComplianceRuleEntity)
    private readonly rulesRepository: Repository<ComplianceRuleEntity>,
    @InjectRepository(ComplianceEntryEntity)
    private readonly entriesRepository: Repository<ComplianceEntryEntity>,
    @InjectRepository(UrgeLogEntity)
    private readonly urgeLogsRepository: Repository<UrgeLogEntity>,
  ) {}

  async getRules(userId: string): Promise<ComplianceRuleEntity[]> {
    return this.rulesRepository.findBy({ userId });
  }

  async createRule(
    userId: string,
    name: string,
  ): Promise<ComplianceRuleEntity> {
    const rule = this.rulesRepository.create({ userId, name });
    return await this.rulesRepository.save(rule);
  }

  async deleteRule(ruleId: string, userId: string): Promise<void> {
    await this.rulesRepository.delete({ id: ruleId, userId });
    await this.entriesRepository.delete({ ruleId, userId });
    await this.urgeLogsRepository.delete({ ruleId, userId });
  }

  async getEntries(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<ComplianceEntryEntity[]> {
    return await this.entriesRepository.findBy({
      userId,
      date: Between(startDate, endDate),
    });
  }

  async upsertEntry(
    userId: string,
    ruleId: string,
    date: string,
    checked: boolean,
  ): Promise<ComplianceEntryEntity> {
    const existing = await this.entriesRepository.findOneBy({
      userId,
      ruleId,
      date,
    });
    if (existing) {
      await this.entriesRepository.update({ id: existing.id }, { checked });
      return { ...existing, checked };
    }
    const entry = this.entriesRepository.create({
      userId,
      ruleId,
      date,
      checked,
    });
    return this.entriesRepository.save(entry);
  }

  async getUrgeLogs(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<UrgeLogEntity[]> {
    if (startDate && endDate) {
      return this.urgeLogsRepository.find({
        where: {
          userId,
          occurredAt: Between(
            new Date(`${startDate}T00:00:00.000Z`),
            new Date(`${endDate}T23:59:59.999Z`),
          ),
        },
        order: { occurredAt: 'DESC' },
      });
    }
    return this.urgeLogsRepository.find({
      where: { userId },
      order: { occurredAt: 'DESC' },
    });
  }

  async createUrgeLog(
    userId: string,
    ruleId: string,
    fields: UrgeLogFields,
  ): Promise<UrgeLogEntity> {
    const log = this.urgeLogsRepository.create({
      userId,
      ruleId,
      intensity:
        fields.intensity !== undefined
          ? clampIntensity(fields.intensity)
          : undefined,
      durationSeconds: fields.durationSeconds ?? null,
      trigger:
        fields.trigger !== undefined ? truncateText(fields.trigger) : undefined,
      whoWhere: fields.whoWhere != null ? truncateText(fields.whoWhere) : null,
      copingNotes:
        fields.copingNotes != null ? truncateText(fields.copingNotes) : null,
      nextTimeIdea:
        fields.nextTimeIdea != null ? truncateText(fields.nextTimeIdea) : null,
      reflection:
        fields.reflection != null ? truncateText(fields.reflection) : null,
    });
    return this.urgeLogsRepository.save(log);
  }

  async updateUrgeLog(
    id: string,
    userId: string,
    fields: UrgeLogFields,
  ): Promise<void> {
    const patch: Partial<UrgeLogEntity> = {};
    if (fields.intensity !== undefined)
      patch.intensity = clampIntensity(fields.intensity);
    if (fields.durationSeconds !== undefined)
      patch.durationSeconds = fields.durationSeconds;
    if (fields.trigger !== undefined)
      patch.trigger = truncateText(fields.trigger);
    if (fields.whoWhere !== undefined) {
      patch.whoWhere =
        fields.whoWhere != null ? truncateText(fields.whoWhere) : null;
    }
    if (fields.copingNotes !== undefined) {
      patch.copingNotes =
        fields.copingNotes != null ? truncateText(fields.copingNotes) : null;
    }
    if (fields.nextTimeIdea !== undefined) {
      patch.nextTimeIdea =
        fields.nextTimeIdea != null ? truncateText(fields.nextTimeIdea) : null;
    }
    if (fields.reflection !== undefined) {
      patch.reflection =
        fields.reflection != null ? truncateText(fields.reflection) : null;
    }
    await this.urgeLogsRepository.update({ id, userId }, patch);
  }

  async deleteUrgeLog(id: string, userId: string): Promise<void> {
    await this.urgeLogsRepository.delete({ id, userId });
  }
}
