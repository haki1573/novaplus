import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user.entity';

import { CheckInService } from './check-in.service';

@Controller('check-in')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  UserRole.GYM_ADMIN,
  UserRole.STAFF,
)
export class CheckInController {
  constructor(
    private readonly checkInService:
      CheckInService,
  ) {}

  @Post('scan')
  scan(
    @Body()
    body: {
      code?: string;
      turnstileId?: string;
    },
    @Req() req: any,
  ) {
    return this.checkInService.scan(
      req.user.gymId,
      body.code || '',
      body.turnstileId || null,
    );
  }

  @Post('checkout')
  checkout(
    @Body()
    body: {
      code?: string;
      turnstileId?: string;
    },
    @Req() req: any,
  ) {
    return this.checkInService.checkout(
      req.user.gymId,
      body.code || '',
      req.user.userId ||
        req.user.sub ||
        req.user.id ||
        null,
      body.turnstileId || null,
    );
  }


  @Get('summary')
  getSummary(
    @Req() req: any,
  ) {
    return this.checkInService
      .getTodaySummary(
        req.user.gymId,
      );
  }

  @Get('logs')
  getLogs(
    @Req() req: any,
  ) {
    return this.checkInService
      .getGymLogs(
        req.user.gymId,
      );
  }
}
