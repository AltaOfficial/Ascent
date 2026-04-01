import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceRuleEntity } from './entities/compliance-rule.entity';
import { ComplianceEntryEntity } from './entities/compliance-entry.entity';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ComplianceRuleEntity, ComplianceEntryEntity]),
  ],
  controllers: [ComplianceController],
  providers: [ComplianceService],
})
export class ComplianceModule {}
