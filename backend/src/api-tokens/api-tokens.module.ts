import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiTokenEntity } from './entities/api-token.entity';
import { ApiTokensService } from './api-tokens.service';
import { ApiTokensController } from './api-tokens.controller';

// Global so McpAuthGuard (instantiated inside @rekog/mcp-nest's module) can
// inject ApiTokensService.
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ApiTokenEntity])],
  controllers: [ApiTokensController],
  providers: [ApiTokensService],
  exports: [ApiTokensService],
})
export class ApiTokensModule {}
