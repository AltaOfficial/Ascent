import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SignupDto } from './dtos/signup.dto';
import { UserDto } from '../users/dtos/user.dto';
import { InvitesService } from '../invites/invites.service';
import * as bcrypt from 'bcrypt';
import { MCP_HANDOFF_TYPE } from '../mcp/ascent-login.provider';

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
      timezone: signupDto.timezone ?? 'UTC',
    });

    if (!user) {
      throw new BadRequestException('User not created');
    }

    const payload = { username: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async login(user: UserDto) {
    const payload = { username: user.email, sub: user.id };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * A 2-minute token the MCP sign-in page hands to the OAuth callback, proving
   * which signed-in Ascent user approved connecting Claude.
   */
  async createMcpHandoff(userId: string) {
    const user = await this.usersService.findOneById(userId);
    if (!user) throw new BadRequestException('User not found');
    return {
      handoff: this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          type: MCP_HANDOFF_TYPE,
        },
        { expiresIn: '2m' },
      ),
    };
  }
}
