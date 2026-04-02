import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CalendarEventsService } from './calendar-events.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CalendarEventEntity } from './entities/calendar-event.entity';

@UseGuards(JwtAuthGuard)
@Controller('calendar-events')
export class CalendarEventsController {
  constructor(private readonly service: CalendarEventsService) {}

  @Get()
  async getAll(@Request() req) {
    return this.service.findAllByUserId(req.user.userId);
  }

  @Post()
  async create(@Request() req, @Body() body: Partial<CalendarEventEntity>) {
    return this.service.create(req.user.userId, body);
  }

  @Post(':id/update')
  async update(@Request() req, @Param('id') id: string, @Body() body: Partial<CalendarEventEntity>) {
    return this.service.update(id, req.user.userId, body);
  }

  @Post(':id/delete')
  async delete(@Request() req, @Param('id') id: string) {
    await this.service.delete(id, req.user.userId);
  }
}
