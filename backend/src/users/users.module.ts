import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TimeEntriesModule } from '../time-entries/time-entries.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), TimeEntriesModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
