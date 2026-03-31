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

  async create({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }) {
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      name: name,
      email: email,
      password: passwordHash,
    });

    this.userRepository.save(user);
  }
}
