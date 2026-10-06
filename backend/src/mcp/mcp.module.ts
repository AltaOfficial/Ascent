import { Module } from '@nestjs/common';
import { McpModule, McpTransportType } from '@rekog/mcp-nest';
import { TasksModule } from '../tasks/tasks.module';
import { ProjectsModule } from '../projects/projects.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { TimeEntriesModule } from '../time-entries/time-entries.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { RankingModule } from '../ranking/ranking.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { UsersModule } from '../users/users.module';
import { McpAuthGuard } from './mcp-auth.guard';
import { OverviewTools } from './tools/overview.tools';
import { ProjectTools } from './tools/project.tools';
import { TaskTools } from './tools/task.tools';
import { TimeTools } from './tools/time.tools';
import { ComplianceTools } from './tools/compliance.tools';

// Ascent MCP server at POST /mcp (stateless Streamable HTTP). Tools are
// discovered from this module's providers; there are deliberately no
// delete tools. Auth: personal API tokens from Settings (McpAuthGuard).
@Module({
  imports: [
    McpModule.forRoot({
      name: 'ascent',
      version: '1.0.0',
      instructions:
        "Tools for the user's Ascent account: tasks, projects, milestones, timers, compliance, rank and analytics. Start with get_overview.",
      transport: McpTransportType.STREAMABLE_HTTP,
      mcpEndpoint: 'mcp',
      guards: [McpAuthGuard],
      streamableHttp: {
        statelessMode: true,
        enableJsonResponse: true,
      },
    }),
    TasksModule,
    ProjectsModule,
    MilestonesModule,
    TimeEntriesModule,
    ComplianceModule,
    RankingModule,
    AnalyticsModule,
    UsersModule,
  ],
  providers: [
    OverviewTools,
    ProjectTools,
    TaskTools,
    TimeTools,
    ComplianceTools,
  ],
})
export class AscentMcpModule {}
