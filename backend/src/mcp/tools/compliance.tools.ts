import { Injectable, NotFoundException } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import type { Context } from '@rekog/mcp-nest';
import { z } from 'zod';
import { ComplianceService } from '../../compliance/compliance.service';
import { UsersService } from '../../users/users.service';
import { dateKeyInTz } from '../../common/dates';
import type { McpRequestWithUser } from '@rekog/mcp-nest';
import { dateKey, id } from './tool-utils';

@Injectable()
export class ComplianceTools {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly usersService: UsersService,
  ) {}

  private async today(userId: string): Promise<string> {
    const user = await this.usersService.findOneById(userId);
    return dateKeyInTz(new Date(), user?.timezone ?? 'UTC');
  }

  private async assertRule(userId: string, ruleId: string) {
    const rules = await this.complianceService.getRules(userId);
    if (!rules.some((r) => r.id === ruleId)) {
      throw new NotFoundException('Rule not found');
    }
  }

  @Tool({
    name: 'get_compliance',
    description:
      'Compliance rules and whether each was kept on a day (default today).',
    parameters: z.object({ date: dateKey.optional() }),
  })
  async getCompliance(
    { date }: { date?: string },
    _context: Context,
    request: McpRequestWithUser,
  ) {
    const userId = request.user.sub;
    const day = date ?? (await this.today(userId));
    const [rules, entries] = await Promise.all([
      this.complianceService.getRules(userId),
      this.complianceService.getEntries(userId, day, day),
    ]);
    return {
      date: day,
      rules: rules.map((rule) => ({
        ruleId: rule.id,
        rule: rule.name,
        checked: entries.find((e) => e.ruleId === rule.id)?.checked ?? false,
      })),
    };
  }

  @Tool({
    name: 'mark_compliance',
    description:
      'Mark a compliance rule as kept (checked: true) or broken (checked: false) for a day (default today).',
    parameters: z.object({
      ruleId: id,
      checked: z.boolean(),
      date: dateKey.optional(),
    }),
  })
  async markCompliance(
    {
      ruleId,
      checked,
      date,
    }: { ruleId: string; checked: boolean; date?: string },
    _context: Context,
    request: McpRequestWithUser,
  ) {
    const userId = request.user.sub;
    await this.assertRule(userId, ruleId);
    const day = date ?? (await this.today(userId));
    await this.complianceService.upsertEntry(userId, ruleId, day, checked);
    return { ruleId, date: day, checked };
  }

  @Tool({
    name: 'log_urge',
    description:
      'Record an urge against a compliance rule: intensity 1–10 and what triggered it.',
    parameters: z.object({
      ruleId: id,
      intensity: z.number().int().min(1).max(10),
      trigger: z.string().max(200),
      durationSeconds: z.number().int().min(0).optional(),
      whoWhere: z.string().max(200).optional(),
      copingNotes: z.string().max(200).optional(),
      reflection: z.string().max(200).optional(),
    }),
  })
  async logUrge(
    {
      ruleId,
      ...fields
    }: {
      ruleId: string;
      intensity: number;
      trigger: string;
      durationSeconds?: number;
      whoWhere?: string;
      copingNotes?: string;
      reflection?: string;
    },
    _context: Context,
    request: McpRequestWithUser,
  ) {
    const userId = request.user.sub;
    await this.assertRule(userId, ruleId);
    const log = await this.complianceService.createUrgeLog(
      userId,
      ruleId,
      fields,
    );
    return { urgeLogId: log.id, occurredAt: log.occurredAt };
  }
}
