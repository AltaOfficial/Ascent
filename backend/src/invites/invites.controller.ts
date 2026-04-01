import { Body, Controller, Post } from '@nestjs/common';
import { JoinWaitListDto } from './dtos/join-waitlist.dto';
import { InvitesService } from './invites.service';
import { InviteDto } from './dtos/invite.dto';

@Controller('/invite')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post('/waitlist/join')
  async joinWaitlist(@Body() joinWaitListDto: JoinWaitListDto) {
    // maybe in the future check if user is already on the waitlist
    const invite: InviteDto = await this.invitesService.createInvite(
      joinWaitListDto.email,
    );
    // user has joined the waitlist now time to send them an email
    this.invitesService.sendWaitlistOpenedEmail(invite);
  }

  @Post('/check')
  async checkInvite(@Body() body: { code: string }) {
    const valid = await this.invitesService.inviteExists(body.code);
    return { valid };
  }
}
