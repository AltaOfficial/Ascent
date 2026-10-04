import { Controller, Get, Logger, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ApiTokensService } from '../api-tokens/api-tokens.service';
import { McpToolsService } from './mcp-tools.service';

function jsonRpcError(res: Response, status: number, message: string) {
  res.status(status).json({
    jsonrpc: '2.0',
    error: { code: -32000, message },
    id: null,
  });
}

// Remote MCP endpoint (Streamable HTTP, stateless). Authenticated with a
// personal API token from Settings, sent as `Authorization: Bearer asc_…`.
@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(
    private readonly apiTokensService: ApiTokensService,
    private readonly mcpToolsService: McpToolsService,
  ) {}

  @Post()
  async handle(@Req() req: Request, @Res() res: Response) {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const userId = await this.apiTokensService.authenticate(token);
    if (!userId) {
      res.setHeader('WWW-Authenticate', 'Bearer');
      jsonRpcError(res, 401, 'Missing or invalid Ascent API token');
      return;
    }

    const server = this.mcpToolsService.buildServer(userId);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      this.logger.error('MCP request failed', error);
      if (!res.headersSent) jsonRpcError(res, 500, 'Internal server error');
    }
  }

  // Stateless server: there is no server-initiated stream to subscribe to.
  @Get()
  notAllowed(@Res() res: Response) {
    res.setHeader('Allow', 'POST');
    jsonRpcError(res, 405, 'Method not allowed');
  }
}
