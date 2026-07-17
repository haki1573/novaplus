import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService:
      AnalyticsService,
  ) {}

  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.analyticsService
      .getDashboardStats(
        req.user.gymId,
      );
  }

  @Get('density')
  getDensity(@Req() req: any) {
    return this.analyticsService
      .getHourlyDensity(
        req.user.gymId,
      );
  }

  @Get('finance-seven-days')
  getLastSevenDaysFinance(
    @Req() req: any,
  ) {
    return this.analyticsService
      .getLastSevenDaysFinance(
        req.user.gymId,
      );
  }
}
