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
  AccessCredentialType,
} from './access-card.entity';

import {
  AccessCardService,
} from './access-card.service';

import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction, AuditModule } from '../audit-log/audit-log.entity';

@Controller('access-cards')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  UserRole.GYM_ADMIN,
  UserRole.STAFF,
)
export class GymAccessCardController {
  constructor(
    private readonly accessCardService:
      AccessCardService,

    private readonly auditLogService:
      AuditLogService,
  ) {}

  @Get()
  findAll(
    @Req() req: any,
  ) {
    return this.accessCardService
      .findAllByGym(
        req.user.gymId,
      );
  }

  @Get('summary')
  summary(
    @Req() req: any,
  ) {
    return this.accessCardService
      .getInventorySummary(
        req.user.gymId,
      );
  }

  @Get('available/:type')
  available(
    @Req() req: any,
    @Param('type')
    type: AccessCredentialType,
  ) {
    return this.accessCardService
      .getAvailableByType(
        req.user.gymId,
        type,
      );
  }

  @Post('assign')
  assign(
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.accessCardService
      .assignToMember(
        req.user.gymId,
        body,
      );
  }

  @Post('sell')
  sell(
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.accessCardService
      .sellToMember(
        req.user.gymId,
        body,
      )
      .then(async (result) => {
        await this.auditLogService.create({
          gymId: req.user.gymId,
          userId: req.user.id || req.user.sub || null,
          userName: req.user.email || null,
          module: AuditModule.ACCESS_CARD,
          action: AuditAction.SALE,
          description: `Kart/QR satışı yapıldı. Toplam: ${result.totalAmount} TL`,
          entityType: 'AccessCard',
          amount: Number(result.totalAmount || 0),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || null,
          metadata: body,
        });

        return result;
      });
  }

  @Patch(':id/unassign')
  unassign(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.accessCardService
      .unassignFromMember(
        req.user.gymId,
        id,
      );
  }
}
