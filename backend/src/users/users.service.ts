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
  }: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      firstName: firstName,
      lastName: lastName,
      email: email,
      password: passwordHash,
    });

    await this.userRepository.save(user);
    return user;
  }
}
