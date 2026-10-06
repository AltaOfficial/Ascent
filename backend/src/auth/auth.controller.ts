import { Controller, Post, UseGuards, Request, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dtos/signup.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/signup')
  async signup(@Body() signupDto: SignupDto) {
    return await this.authService.signup(signupDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('/login')
  login(@Request() req) {
    // returns a jwt access token
    return this.authService.login(req.user);
  }

  // Used by the frontend /mcp/sign-in page during Claude's OAuth sign-in
  @UseGuards(JwtAuthGuard)
  @Post('/mcp-handoff')
  mcpHandoff(@Request() req) {
    return this.authService.createMcpHandoff(req.user.userId);
  }

  @UseGuards(LocalAuthGuard)
  @Post('/logout')
  logout(@Request() req) {
    return req.logout();
  }
}
