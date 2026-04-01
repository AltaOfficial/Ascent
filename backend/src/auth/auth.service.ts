import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SignupDto } from './dtos/signup.dto';
import { UserDto } from 'src/users/dtos/user.dto';
import { InvitesService } from 'src/invites/invites.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly invitesService: InvitesService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.usersService.findOneByEmail(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
  }

  async signup(signupDto: SignupDto) {
    const inviteIsValid = await this.invitesService.inviteExists(
      signupDto.inviteCode,
    );
    if (!inviteIsValid) {
      throw new BadRequestException('Invalid invite code');
    }

    const userExists = await this.usersService.findOneByEmail(signupDto.email);
    if (userExists) {
      return 'user already exists';
    }

    const user = await this.usersService.create({
      firstName: signupDto.firstName,
      lastName: signupDto.lastName,
      email: signupDto.email,
      password: signupDto.password,
    });

    if (!user) {
      throw new BadRequestException('User not created');
    }

    const payload = { username: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign({ payload }),
    };
  }

  async login(user: UserDto) {
    const payload = { username: user.email, sub: user.id };

    return {
      access_token: this.jwtService.sign({ payload: payload }),
    };
  }
}
