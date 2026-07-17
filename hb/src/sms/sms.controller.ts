import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user.entity';

import { SmsService } from './sms.service';

import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction, AuditModule } from '../audit-log/audit-log.entity';

@Controller('sms')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  UserRole.GYM_ADMIN,
  UserRole.STAFF,
)
export class SmsController {
  constructor(
    private readonly smsService:
      SmsService,

    private readonly auditLogService:
      AuditLogService,
  ) {}

  @Get('balance')
  getBalance(
    @Req() req: any,
  ) {
    return this.smsService.getGymBalance(
      req.user.gymId,
    );
  }

  @Get('summary')
  getSummary(
    @Req() req: any,
  ) {
    return this.smsService
      .getGymStatusSummary(
        req.user.gymId,
      );
  }

  @Get('history')
  getHistory(
    @Req() req: any,
  ) {
    return this.smsService.getGymHistory(
      req.user.gymId,
    );
  }

  @Post('send')
  sendSms(
    @Req() req: any,
    @Body() body: {
      memberId?: number;
      phone?: string;
      message?: string;
    },
  ) {
    return this.smsService.sendSms(
      req.user.gymId,
      this.getUserId(req),
      body,
    ).then(async (result) => {
      await this.auditLogService.create({
        gymId: req.user.gymId,
        userId: this.getUserId(req),
        userName: null,
        module: AuditModule.SMS,
        action: AuditAction.SEND,
        description: `Tekil SMS gönderildi: ${body.phone || `Üye #${body.memberId}`}`,
        entityType: 'SmsHistory',
        entityId: result.history?.id || null,
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'] || null,
        result: result.success === false ? 'FAILED' : 'SUCCESS',
      });

      return result;
    });
  }

  @Post('send-bulk')
  sendBulkSms(
    @Req() req: any,
    @Body() body: {
      message?: string;
      memberIds?: number[];
      target?:
        | 'SELECTED'
        | 'ALL_ACTIVE'
        | 'EXPIRING';
    },
  ) {
    return this.smsService.sendBulkSms(
      req.user.gymId,
      this.getUserId(req),
      body,
    ).then(async (result) => {
      await this.auditLogService.create({
        gymId: req.user.gymId,
        userId: this.getUserId(req),
        userName: null,
        module: AuditModule.SMS,
        action: AuditAction.SEND,
        description: `Toplu SMS gönderildi. Başarılı: ${result.recipientCount}, başarısız: ${result.failedCount}`,
        entityType: 'SmsHistory',
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'] || null,
        result: result.success ? 'SUCCESS' : 'FAILED',
      });

      return result;
    });
  }

  @Post('history/:historyId/retry')
  retrySms(
    @Req() req: any,
    @Param('historyId')
    historyId: string,
  ) {
    return this.smsService.retrySms(
      req.user.gymId,
      historyId,
      this.getUserId(req),
    );
  }

  private getUserId(req: any) {
    return (
      req.user.userId ||
      req.user.sub ||
      req.user.id ||
      null
    );
  }
}
