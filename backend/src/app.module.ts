import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { MailerModule } from './mailer/mailer.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserEntity } from './users/entities/user.entity';
import { InvitesModule } from './invites/invites.module';
import { InviteEntity } from './invites/entities/invite.entity';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: process.env.DB_TYPE as any,
      host: process.env.DB_HOST as any,
      port: process.env.DB_PORT as any,
      username: process.env.DB_USER as any,
      password: process.env.DB_PASS as any,
      database: process.env.DB_NAME as any,
      entities: [UserEntity, InviteEntity],
      synchronize: true, // dont use in production
    }),
    MailerModule,
    InvitesModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
