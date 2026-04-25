import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async updateSettings(
    userId: string,
    settings: { timezone?: string; weekStart?: string },
  ) {
    await this.userRepository.update({ id: userId }, settings);
    return this.userRepository.findOneBy({ id: userId });
  }

  async findOneByEmail(email: string) {
    return await this.userRepository.findOneBy({ email: email });
  }

  async findOneById(id: string) {
    return await this.userRepository.findOneBy({ id: id });
  }

  async create({
    firstName,
    lastName,
    email,
    password,
    timezone = 'UTC',
  }: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    timezone?: string;
  }) {
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      firstName,
      lastName,
      email,
      password: passwordHash,
      timezone,
    });

    await this.userRepository.save(user);
    return user;
  }
}
