import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user.entity';

import {
  LockerStatus,
} from './locker.entity';

import { LockerService } from './locker.service';

import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction, AuditModule } from '../audit-log/audit-log.entity';

@Controller('lockers')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  UserRole.GYM_ADMIN,
  UserRole.STAFF,
)
export class LockerController {
  constructor(
    private readonly lockerService:
      LockerService,

    private readonly auditLogService:
      AuditLogService,
  ) {}

  @Get()
  list(
    @Req() req: any,
  ) {
    return this.lockerService.listLockers(
      req.user.gymId,
    );
  }

  @Get('summary')
  summary(
    @Req() req: any,
  ) {
    return this.lockerService.getSummary(
      req.user.gymId,
    );
  }

  @Get('history')
  history(
    @Req() req: any,
  ) {
    return this.lockerService.getHistory(
      req.user.gymId,
    );
  }

  @Post()
  create(
    @Req() req: any,
    @Body() body: {
      number?: string;
      notes?: string;
    },
  ) {
    return this.lockerService.createLocker(
      req.user.gymId,
      req.user.userId ||
        req.user.sub ||
        req.user.id ||
        null,
      body,
    ).then(async (result) => {
      await this.auditLogService.create({
        gymId: req.user.gymId,
        userId:
          req.user.userId ||
          req.user.sub ||
          req.user.id ||
          null,
        userName:
          req.user.email ||
          null,
        module:
          AuditModule.LOCKER,
        action:
          AuditAction.CREATE,
        description:
          `Dolap ${result.number} oluşturuldu.`,
        entityType:
          'Locker',
        entityId:
          result.id,
        ipAddress:
          req.ip || null,
        userAgent:
          req.headers?.[
            'user-agent'
          ] || null,
      });

      return result;
    });
  }

  @Post('bulk')
  createMultiple(
    @Req() req: any,
    @Body() body: {
      prefix?: string;
      startNumber?: number;
      count?: number;
    },
  ) {
    return this.lockerService
      .createMultipleLockers(
        req.user.gymId,
        req.user.userId ||
          req.user.sub ||
          req.user.id ||
          null,
        body,
      );
  }

  @Post('open-by-qr')
  openByQr(
    @Req() req: any,
    @Body() body: {
      qrToken?: string;
    },
  ) {
    return this.lockerService.openByQr(
      req.user.gymId,
      req.user.userId ||
        req.user.sub ||
        req.user.id ||
        null,
      body.qrToken || '',
    );
  }

  @Post(':lockerId/assign')
  assign(
    @Req() req: any,
    @Param('lockerId')
    lockerId: string,
    @Body() body: {
      memberId: number;
    },
  ) {
    return this.lockerService.assignLocker(
      req.user.gymId,
      req.user.userId ||
        req.user.sub ||
        req.user.id ||
        null,
      lockerId,
      Number(body.memberId),
    ).then(async (result) => {
      await this.auditLogService.create({
        gymId: req.user.gymId,
        userId: req.user.userId || req.user.sub || req.user.id || null,
        module: AuditModule.LOCKER,
        action: AuditAction.ASSIGN,
        description: `Dolap ${lockerId} üyeye atandı.`,
        entityType: 'Locker',
        entityId: lockerId,
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'] || null,
      });

      return result;
    });
  }

  @Post(':lockerId/open')
  open(
    @Req() req: any,
    @Param('lockerId')
    lockerId: string,
    @Body() body: {
      accessCode?: string;
      qrToken?: string;
    },
  ) {
    return this.lockerService.openLocker(
      req.user.gymId,
      req.user.userId ||
        req.user.sub ||
        req.user.id ||
        null,
      lockerId,
      body,
    );
  }

  @Post(':lockerId/lock')
  lock(
    @Req() req: any,
    @Param('lockerId')
    lockerId: string,
  ) {
    return this.lockerService.lockLocker(
      req.user.gymId,
      req.user.userId ||
        req.user.sub ||
        req.user.id ||
        null,
      lockerId,
    ).then(async (result) => {
      await this.auditLogService.create({
        gymId: req.user.gymId,
        userId: req.user.userId || req.user.sub || req.user.id || null,
        module: AuditModule.LOCKER,
        action: AuditAction.LOCK,
        description: `Dolap ${lockerId} açıldı.`,
        entityType: 'Locker',
        entityId: lockerId,
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'] || null,
      });

      return result;
    });
  }

  @Post(':lockerId/release')
  release(
    @Req() req: any,
    @Param('lockerId')
    lockerId: string,
  ) {
    return this.lockerService.releaseLocker(
      req.user.gymId,
      req.user.userId ||
        req.user.sub ||
        req.user.id ||
        null,
      lockerId,
    ).then(async (result) => {
      await this.auditLogService.create({
        gymId: req.user.gymId,
        userId: req.user.userId || req.user.sub || req.user.id || null,
        module: AuditModule.LOCKER,
        action: AuditAction.RELEASE,
        description: `Dolap ${lockerId} açıldı.`,
        entityType: 'Locker',
        entityId: lockerId,
        ipAddress: req.ip,
        userAgent: req.headers?.['user-agent'] || null,
      });

      return result;
    });
  }

  @Patch(':lockerId/status')
  updateStatus(
    @Req() req: any,
    @Param('lockerId')
    lockerId: string,
    @Body() body: {
      status: LockerStatus;
    },
  ) {
    return this.lockerService.updateStatus(
      req.user.gymId,
      req.user.userId ||
        req.user.sub ||
        req.user.id ||
        null,
      lockerId,
      body.status,
    );
  }
}
