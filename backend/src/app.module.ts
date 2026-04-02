import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { MailerModule } from './mailer/mailer.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserEntity } from './users/entities/user.entity';
import { InvitesModule } from './invites/invites.module';
import { InviteEntity } from './invites/entities/invite.entity';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { ProjectEntity } from './projects/entities/project.entity';
import { ProjectSectionEntity } from './projects/entities/project-section.entity';
import { ProjectTagEntity } from './projects/entities/project-tag.entity';
import { TasksModule } from './tasks/tasks.module';
import { TaskEntity } from './tasks/entities/task.entity';
import { SubtaskEntity } from './tasks/entities/subtask.entity';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { TimeEntryEntity } from './time-entries/entities/time-entry.entity';
import { ComplianceModule } from './compliance/compliance.module';
import { ComplianceRuleEntity } from './compliance/entities/compliance-rule.entity';
import { ComplianceEntryEntity } from './compliance/entities/compliance-entry.entity';
import { CalendarEventsModule } from './calendar-events/calendar-events.module';
import { CalendarEventEntity } from './calendar-events/entities/calendar-event.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: process.env.DB_TYPE as any,
      host: process.env.DB_HOST as any,
      port: process.env.DB_PORT as any,
      username: process.env.DB_USER as any,
      password: process.env.DB_PASS as any,
      database: process.env.DB_NAME as any,
      entities: [UserEntity, InviteEntity, ProjectEntity, ProjectSectionEntity, ProjectTagEntity, TaskEntity, SubtaskEntity, TimeEntryEntity, ComplianceRuleEntity, ComplianceEntryEntity, CalendarEventEntity],
      synchronize: true, // dont use in production
    }),
    MailerModule,
    InvitesModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    TimeEntriesModule,
    ComplianceModule,
    CalendarEventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
