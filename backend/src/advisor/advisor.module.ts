import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdvisorMemoryEntity,
  AdvisorMessageEntity,
  AdvisorThreadEntity,
} from './entities/advisor.entities';
import { AdvisorService } from './advisor.service';
import { AdvisorController } from './advisor.controller';
import { AnalyticsModule } from '../analytics/analytics.module';
import { RankingModule } from '../ranking/ranking.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { TasksModule } from '../tasks/tasks.module';
import { ProjectsModule } from '../projects/projects.module';
import { MilestonesModule } from '../milestones/milestones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdvisorThreadEntity,
      AdvisorMessageEntity,
      AdvisorMemoryEntity,
    ]),
    AnalyticsModule,
    RankingModule,
    ComplianceModule,
    TasksModule,
    ProjectsModule,
    MilestonesModule,
  ],
  controllers: [AdvisorController],
  providers: [AdvisorService],
  exports: [AdvisorService],
})
export class AdvisorModule {}
