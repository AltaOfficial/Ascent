import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';

@Module({
  imports: [
    UsersModule, 
    TypeOrmModule.forRoot({
      type: "postgres",
      host: "localhost",
      port: 5432,
      username: "root",
      password: "secret",
      database: "ascentdb",
      entities: [User],
      synchronize: true, // dont use in production
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
