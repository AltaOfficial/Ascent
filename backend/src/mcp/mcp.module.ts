import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { TasksModule } from '../tasks/tasks.module';
import { ProjectsModule } from '../projects/projects.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { TimeEntriesModule } from '../time-entries/time-entries.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { RankingModule } from '../ranking/ranking.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { UsersModule } from '../users/users.module';
import { McpController } from './mcp.controller';
import { McpToolsService } from './mcp-tools.service';

@Module({
  imports: [
    ApiTokensModule,
    TasksModule,
    ProjectsModule,
    MilestonesModule,
    TimeEntriesModule,
    ComplianceModule,
    RankingModule,
    AnalyticsModule,
    UsersModule,
  ],
  controllers: [McpController],
  providers: [McpToolsService],
})
export class McpModule {}
