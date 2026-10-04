import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';
import { UserRankingEntity } from './entities/user-ranking.entity';
import { UsersModule } from '../users/users.module';
import { TimeEntriesModule } from '../time-entries/time-entries.module';
import { ComplianceModule } from '../compliance/compliance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRankingEntity]),
    UsersModule,
    TimeEntriesModule,
    ComplianceModule,
  ],
  controllers: [RankingController],
  providers: [RankingService],
  exports: [RankingService],
})
export class RankingModule {}
