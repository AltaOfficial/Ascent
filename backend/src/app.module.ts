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
import { ApiTokensModule } from './api-tokens/api-tokens.module';
import { McpModule } from './mcp/mcp.module';

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
    ApiTokensModule,
    McpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
