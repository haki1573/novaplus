import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../user.entity';

import { StaffRole } from './staff.entity';
import { StaffService } from './staff.service';

import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction, AuditModule } from '../audit-log/audit-log.entity';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.GYM_ADMIN, UserRole.STAFF)
export class StaffController {
  constructor(
    private readonly staffService: StaffService,

    private readonly auditLogService:
      AuditLogService,
  ) {}

  @Get()
  list(@Req() req: any) {
    return this.staffService.list(req.user.gymId);
  }

  @Post()
  @Roles(UserRole.GYM_ADMIN)
  create(
    @Req() req: any,
    @Body()
    body: {
      fullName: string;
      phone?: string;
      email?: string;
      role?: StaffRole;
      cardCode?: string | null;
      qrCode?: string | null;
      employmentStartDate?: string | null;
      permissions?: Record<string, boolean>;
    },
  ) {
    return this.staffService.create(req.user.gymId, body)
      .then(async (result) => {
        await this.auditLogService.create({
          gymId: req.user.gymId,
          userId: req.user.id || req.user.sub || null,
          userName: req.user.email || null,
          module: AuditModule.STAFF,
          action: AuditAction.CREATE,
          description: `Personel oluşturuldu: ${result.fullName}`,
          entityType: 'Staff',
          entityId: result.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || null,
        });

        return result;
      });
  }

  @Patch(':id')
  @Roles(UserRole.GYM_ADMIN)
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.staffService.update(req.user.gymId, id, body)
      .then(async (result) => {
        await this.auditLogService.create({
          gymId: req.user.gymId,
          userId: req.user.id || req.user.sub || null,
          userName: req.user.email || null,
          module: AuditModule.STAFF,
          action: AuditAction.UPDATE,
          description: `Personel güncellendi: ${result.fullName}`,
          entityType: 'Staff',
          entityId: result.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || null,
        });

        return result;
      });
  }

  @Delete(':id')
  @Roles(UserRole.GYM_ADMIN)
  archive(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.staffService.archive(req.user.gymId, id)
      .then(async (result) => {
        await this.auditLogService.create({
          gymId: req.user.gymId,
          userId: req.user.id || req.user.sub || null,
          userName: req.user.email || null,
          module: AuditModule.STAFF,
          action: AuditAction.ARCHIVE,
          description: `Personel arşivlendi: #${id}`,
          entityType: 'Staff',
          entityId: id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || null,
        });

        return result;
      });
  }

  @Get('attendance')
  attendance(
    @Req() req: any,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.staffService.attendance(
      req.user.gymId,
      dateFrom,
      dateTo,
      staffId,
    );
  }

  @Get('attendance/weekly-summary')
  weeklySummary(
    @Req() req: any,
    @Query('dateFrom')
    dateFrom: string,
    @Query('dateTo')
    dateTo: string,
    @Query('staffId')
    staffId?: string,
  ) {
    return this.staffService.weeklySummary(
      req.user.gymId,
      dateFrom,
      dateTo,
      staffId,
    );
  }

  @Get('attendance/export.csv')
  async exportCsv(
    @Req() req: any,
    @Res() response: Response,
    @Query('dateFrom')
    dateFrom: string,
    @Query('dateTo')
    dateTo: string,
    @Query('staffId')
    staffId?: string,
  ) {
    const csv =
      await this.staffService
        .exportAttendanceCsv(
          req.user.gymId,
          dateFrom,
          dateTo,
          staffId,
        );

    const filename =
      `personel-raporu-${dateFrom}-${dateTo}.csv`;

    response.setHeader(
      'Content-Type',
      'text/csv; charset=utf-8',
    );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    response.send(
      `\uFEFF${csv}`,
    );
  }

  @Get('attendance/daily-summary')
  dailySummary(
    @Req() req: any,
    @Query('date') date?: string,
  ) {
    return this.staffService.dailySummary(req.user.gymId, date);
  }
}
