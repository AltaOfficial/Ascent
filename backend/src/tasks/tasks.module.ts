import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './entities/task.entity';
import { SubtaskEntity } from './entities/subtask.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { RepeatTaskEntity } from './entities/repeat-task.entity';
import { UsersModule } from 'src/users/users.module';
import { ProjectEntity } from '../projects/entities/project.entity';
import { ProjectSectionEntity } from '../projects/entities/project-section.entity';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    TypeOrmModule.forFeature([
      TaskEntity,
      SubtaskEntity,
      RepeatTaskEntity,
      ProjectEntity,
      ProjectSectionEntity,
    ]),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
