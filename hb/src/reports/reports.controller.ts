import {
  Controller,
  Get,
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

import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  UserRole.GYM_ADMIN,
  UserRole.STAFF,
)
export class ReportsController {
  constructor(
    private readonly reportsService:
      ReportsService,
  ) {}

  @Get('overview')
  overview(
    @Req() req: any,
    @Query('dateFrom')
    dateFrom?: string,
    @Query('dateTo')
    dateTo?: string,
  ) {
    return this.reportsService
      .overview(
        req.user.gymId,
        dateFrom,
        dateTo,
      );
  }

  @Get('export.csv')
  async exportCsv(
    @Req() req: any,
    @Res() response: Response,
    @Query('type')
    reportType: string,
    @Query('dateFrom')
    dateFrom?: string,
    @Query('dateTo')
    dateTo?: string,
  ) {
    const csv =
      await this.reportsService
        .exportCsv(
          req.user.gymId,
          reportType,
          dateFrom,
          dateTo,
        );

    const filename =
      `novaplus-${reportType}-${dateFrom || 'baslangic'}-${dateTo || 'bugun'}.csv`;

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
}
