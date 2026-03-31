import { Module } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteEntity } from './entities/invite.entity';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  imports: [MailerModule, TypeOrmModule.forFeature([InviteEntity])],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
