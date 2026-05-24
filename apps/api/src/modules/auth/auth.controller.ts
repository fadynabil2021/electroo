import { Controller, Post, Body, Req, UseGuards, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: any) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: any) {
    return this.authService.login(dto);
  }

  @Post('google')
  async googleLogin(@Body() dto: any) {
    return this.authService.googleLogin(dto);
  }

  @Post('phone/request-otp')
  async requestPhoneOtp(@Body('phone') phone: string) {
    return this.authService.requestPhoneOtp(phone);
  }

  @Post('phone/verify-otp')
  async verifyPhoneOtp(@Body('phone') phone: string, @Body('otp') otp: string) {
    return this.authService.verifyPhoneOtp(phone, otp);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.id);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return { message: 'Email verified successfully' };
  }
}
