import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ComplianceRuleEntity } from './entities/compliance-rule.entity';
import { ComplianceEntryEntity } from './entities/compliance-entry.entity';

@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(ComplianceRuleEntity)
    private readonly rulesRepository: Repository<ComplianceRuleEntity>,
    @InjectRepository(ComplianceEntryEntity)
    private readonly entriesRepository: Repository<ComplianceEntryEntity>,
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
}
