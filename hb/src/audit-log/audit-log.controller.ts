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

import { AuditLogService } from './audit-log.service';

@Controller('audit-logs')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  UserRole.GYM_ADMIN,
  UserRole.STAFF,
)
export class AuditLogController {
  constructor(
    private readonly service:
      AuditLogService,
  ) {}

  @Get()
  list(
    @Req() req: any,
    @Query('dateFrom')
    dateFrom?: string,
    @Query('dateTo')
    dateTo?: string,
    @Query('module')
    module?: string,
    @Query('action')
    action?: string,
    @Query('search')
    search?: string,
  ) {
    return this.service.list(
      req.user.gymId,
      {
        dateFrom,
        dateTo,
        module:
          this.service
            .validateModule(
              module,
            ),
        action:
          this.service
            .validateAction(
              action,
            ),
        search,
      },
    );
  }

  @Get('summary')
  summary(
    @Req() req: any,
    @Query('dateFrom')
    dateFrom?: string,
    @Query('dateTo')
    dateTo?: string,
  ) {
    return this.service.summary(
      req.user.gymId,
      dateFrom,
      dateTo,
    );
  }

  @Get('export.csv')
  async exportCsv(
    @Req() req: any,
    @Res() response: Response,
    @Query('dateFrom')
    dateFrom?: string,
    @Query('dateTo')
    dateTo?: string,
    @Query('module')
    module?: string,
    @Query('action')
    action?: string,
    @Query('search')
    search?: string,
  ) {
    const csv =
      await this.service
        .exportCsv(
          req.user.gymId,
          {
            dateFrom,
            dateTo,
            module:
              this.service
                .validateModule(
                  module,
                ),
            action:
              this.service
                .validateAction(
                  action,
                ),
            search,
          },
        );

    response.setHeader(
      'Content-Type',
      'text/csv; charset=utf-8',
    );

    response.setHeader(
      'Content-Disposition',
      'attachment; filename="novaplus-islem-gecmisi.csv"',
    );

    response.send(
      `\uFEFF${csv}`,
    );
  }
}
