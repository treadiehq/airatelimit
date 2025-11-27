import { Controller, Post, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RequestMagicLinkDto } from './dto/request-magic-link.dto';
import { VerifyMagicLinkDto } from './dto/verify-magic-link.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('magic-link/request')
  async requestMagicLink(@Body() dto: RequestMagicLinkDto) {
    return this.authService.requestMagicLink(dto);
  }

  @Post('magic-link/verify')
  async verifyMagicLink(@Body() dto: VerifyMagicLinkDto, @Req() req: Request) {
    // Get client IP for rate limiting (handles proxies)
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || 
                     req.socket.remoteAddress || 
                     'unknown';
    return this.authService.verifyMagicLink(dto, clientIp);
  }
}

