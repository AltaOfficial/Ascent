import { Module } from "@nestjs/common";
import { RankingService } from "./ranking.service";


@Module({
    providers: [RankingService]
})
export class RankingModule {}