import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // Kullanıcı Kaydı
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
  ) {
    return await this.authService.register(dto);
  }

  // Giriş
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: any,
  ) {
    return await this.authService.login(
      dto.email,
      dto.password,
      req.ip,
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(
    @Req() req: any,
  ) {
    return this.authService.profile(
      req.user.id ||
        req.user.sub,
    );
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Req() req: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.id ||
        req.user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  /*
   * Yakında eklenecek endpointler:
   *
   * POST /auth/super-admin/login
   * GET  /auth/profile
   * POST /auth/forgot-password
   * POST /auth/reset-password
   * POST /auth/refresh-token
   */
}