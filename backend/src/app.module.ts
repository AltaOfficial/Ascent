import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { MailerModule } from './mailer/mailer.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { InvitesModule } from './invites/invites.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { ComplianceModule } from './compliance/compliance.module';
import { CalendarEventsModule } from './calendar-events/calendar-events.module';
import { RankingModule } from './ranking/ranking.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MilestonesModule } from './milestones/milestones.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdvisorModule } from './advisor/advisor.module';
import { AscentMcpModule } from './mcp/mcp.module';
import { McpAuthModule } from '@rekog/mcp-nest';
import { AscentLoginProvider } from './mcp/ascent-login.provider';

// Public origin of this backend; OAuth metadata, token issuer and the MCP
// resource URL are all derived from it
const apiUrl = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 8000}`;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: process.env.DB_TYPE as any,
      host: process.env.DB_HOST as any,
      port: process.env.DB_PORT as any,
      username: process.env.DB_USER as any,
      password: process.env.DB_PASS as any,
      database: process.env.DB_NAME as any,
      ssl: process.env.DB_SSL as any,
      synchronize: true, // dont use in production
      autoLoadEntities: true,
    }),
    // OAuth for MCP clients (Claude connectors, Claude Code): registration,
    // PKCE, tokens and discovery come from @rekog/mcp-nest; sign-in is
    // Ascent's own login (AscentLoginProvider).
    McpAuthModule.forRoot({
      provider: AscentLoginProvider,
      // Only used by third-party identity providers; Ascent's login needs none
      clientId: 'ascent',
      clientSecret: 'unused',
      jwtSecret: process.env.JWT_SECRET!,
      serverUrl: apiUrl,
      jwtIssuer: apiUrl,
      resource: `${apiUrl}/mcp`,
      storeConfiguration: {
        type: 'typeorm',
        options: {
          type: process.env.DB_TYPE,
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT),
          username: process.env.DB_USER,
          password: process.env.DB_PASS,
          database: process.env.DB_NAME,
          ssl: process.env.DB_SSL as any,
          synchronize: true, // dont use in production
        },
      },
    }),
    RankingModule,
    MailerModule,
    InvitesModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    TimeEntriesModule,
    ComplianceModule,
    CalendarEventsModule,
    MilestonesModule,
    AnalyticsModule,
    AdvisorModule,
    AscentMcpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
