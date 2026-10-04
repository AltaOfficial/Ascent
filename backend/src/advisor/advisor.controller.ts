import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdvisorService } from './advisor.service';
import type { AdvisorMemory } from './advisor.context';

@UseGuards(JwtAuthGuard)
@Controller('advisor')
export class AdvisorController {
  private readonly logger = new Logger(AdvisorController.name);

  constructor(private readonly advisorService: AdvisorService) {}

  @Get('status')
  getStatus() {
    return { live: this.advisorService.isLive() };
  }

  @Get('context')
  async getContext(@Request() req) {
    return this.advisorService.getLiveData(req.user.userId);
  }

  @Get('memory')
  async getMemory(@Request() req) {
    return this.advisorService.getMemory(req.user.userId);
  }

  @Post('memory')
  async saveMemory(@Request() req, @Body() body: Partial<AdvisorMemory>) {
    return this.advisorService.saveMemory(req.user.userId, body ?? {});
  }

  @Get('threads')
  async getThreads(@Request() req) {
    return this.advisorService.getThreads(req.user.userId);
  }

  @Post('threads')
  async createThread(@Request() req, @Body() body: { name?: string }) {
    return this.advisorService.createThread(req.user.userId, body?.name);
  }

  @Post('threads/:id/update')
  async updateThread(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { name?: string; pinned?: boolean },
  ) {
    return this.advisorService.updateThread(req.user.userId, id, body ?? {});
  }

  // Cached suggested questions for a chat (generated on first request)
  @Get('threads/:id/suggestions')
  async getSuggestions(@Request() req, @Param('id') id: string) {
    return this.advisorService.getSuggestions(req.user.userId, id);
  }

  // Regenerates suggestions (and the title of a new chat) after a reply
  @Post('threads/:id/suggestions')
  async refreshSuggestions(@Request() req, @Param('id') id: string) {
    return this.advisorService.refreshSuggestions(req.user.userId, id);
  }

  @Post('threads/:id/delete')
  async deleteThread(@Request() req, @Param('id') id: string) {
    await this.advisorService.deleteThread(req.user.userId, id);
  }

  @Get('threads/:id/messages')
  async getMessages(@Request() req, @Param('id') id: string) {
    return this.advisorService.getMessages(req.user.userId, id);
  }

  // Streams the reply as plain text chunks. The full reply is saved to the
  // thread once the stream finishes.
  @Post('threads/:id/messages')
  async sendMessage(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { content: string },
    @Res() res: Response,
  ) {
    if (!body?.content?.trim()) {
      res.status(400).json({ message: 'content is required' });
      return;
    }
    res.status(200);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    try {
      await this.advisorService.sendMessage(
        req.user.userId,
        id,
        body.content,
        (text) => res.write(text),
      );
    } catch (error) {
      this.logger.error('Advisor reply failed', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.write(`\n\n[Advisor error: ${message}]`);
    }
    res.end();
  }
}
