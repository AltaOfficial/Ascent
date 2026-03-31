import { Controller, Post, UseGuards, Request, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from 'src/users/users.service';
import { SignupDto } from './dtos/signup.dto';

@Controller('/auth')
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/signup')
  signup(@Body() signupDto: SignupDto) {}

  @UseGuards(AuthGuard('local'))
  @Post('/login')
  login(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard('local'))
  @Post('/logout')
  logout(@Request() req) {
    return req.logout();
  }
}
