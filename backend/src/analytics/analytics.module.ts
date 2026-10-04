import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { TimeEntriesModule } from '../time-entries/time-entries.module';
import { TasksModule } from '../tasks/tasks.module';
import { ProjectsModule } from '../projects/projects.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [UsersModule, TimeEntriesModule, TasksModule, ProjectsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
