import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './entities/task.entity';
import { SubtaskEntity } from './entities/subtask.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { RepeatTaskEntity } from './entities/repeat-task.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    TypeOrmModule.forFeature([TaskEntity, SubtaskEntity, RepeatTaskEntity]),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
