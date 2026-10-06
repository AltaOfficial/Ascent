import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTokensService } from '../api-tokens/api-tokens.service';

export type McpRequest = Request & { user: { userId: string } };

/**
 * Authenticates MCP requests with a personal API token from Settings
 * (`Authorization: Bearer asc_…`) and sets request.user for the tools.
 */
@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(private readonly apiTokensService: ApiTokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<McpRequest>();
    const header = request.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const userId = await this.apiTokensService.authenticate(token);
    if (!userId) {
      throw new UnauthorizedException('Missing or invalid Ascent API token');
    }
    request.user = { userId };
    return true;
  }
}
