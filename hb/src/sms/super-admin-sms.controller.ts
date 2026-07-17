import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  UserRole,
} from '../user.entity';

import { SmsService } from './sms.service';

@Controller('super-admin/sms')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminSmsController {
  constructor(
    private readonly smsService:
      SmsService,
  ) {}

  @Get('packages')
  getPackages() {
    return this.smsService.listPackages();
  }

  @Post('packages')
  createPackage(
    @Body() body: {
      name?: string;
      smsCount?: number;
      price?: number;
      description?: string;
    },
  ) {
    return this.smsService.createPackage(
      body,
    );
  }

  @Get('balances')
  getBalances() {
    return this.smsService.getAllGymBalances();
  }

  @Get('purchases')
  getPurchases() {
    return this.smsService.getPurchases();
  }

  @Get('summary')
  getSummary() {
    return this.smsService.getSalesSummary();
  }

  @Get('gyms/:gymId/balance')
  getGymBalance(
    @Param('gymId') gymId: string,
  ) {
    return this.smsService.getGymBalance(
      gymId,
    );
  }

  @Get('gyms/:gymId/history')
  getGymHistory(
    @Param('gymId') gymId: string,
  ) {
    return this.smsService.getGymHistory(
      gymId,
    );
  }

  @Post('gyms/:gymId/load')
  addBalance(
    @Param('gymId') gymId: string,
    @Body() body: {
      packageId?: string;
      smsCount?: number;
      amount?: number;
      description?: string;
    },
  ) {
    return this.smsService.addBalance(
      gymId,
      {
        ...body,
        soldByUserId: null,
      },
    );
  }
}
