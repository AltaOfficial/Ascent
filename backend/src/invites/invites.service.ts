import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InviteEntity } from './entities/invite.entity';
import { InviteDto } from './dtos/invite.dto';
import { MailerService } from 'src/mailer/mailer.service';

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(InviteEntity)
    private inviteRepository: Repository<InviteEntity>,
    private readonly mailerService: MailerService,
  ) {}

  async createInvite(email: string): Promise<InviteDto> {
    // getting random number converting to base 36(which uses alphanumeric) then adds to array for a length of 12
    const generatedInviteCode = Array.from(
      { length: 12 },
      () => Math.random().toString(36)[2] ?? '0',
    )
      .join('')
      .toUpperCase();
    const invite = this.inviteRepository.create({
      email: email,
      inviteCode: generatedInviteCode,
    });
    return await this.inviteRepository.save(invite);
  }

  async inviteExists(inviteCode: string): Promise<boolean> {
    const invite = await this.inviteRepository.findBy({
      inviteCode: inviteCode,
    })[0];
    if (invite) {
      return true;
    }
    return false;
  }

  sendWaitlistOpenedEmail(inviteDto: InviteDto) {
    // regex to give the code dashes
    const inviteCodeFormated = inviteDto.inviteCode.replace(
      /^(.{4})(.{4})(.{4})$/,
      '$1-$2-$3',
    );
    this.mailerService.sendEmail({
      to: inviteDto.email,
      template: {
        id: 'invite-access-code',
        variables: {
          code: inviteCodeFormated,
          email: inviteDto.email,
          signupUrl: `${process.env.WEBSITE_URL}/signup?email=${inviteDto.email}&invite=${inviteCodeFormated}`,
        },
      },
    });
  }
}
