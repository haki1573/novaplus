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

import { AuditLogService } from '../audit-log/audit-log.service';
import {
  AuditAction,
  AuditModule,
} from '../audit-log/audit-log.entity';

import { WalletCafeService } from './wallet-cafe.service';

@Controller('wallet-cafe')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  UserRole.GYM_ADMIN,
  UserRole.STAFF,
)
export class WalletCafeController {
  constructor(
    private readonly service:
      WalletCafeService,

    private readonly auditLogService:
      AuditLogService,
  ) {}

  @Get('summary')
  summary(
    @Req() req: any,
  ) {
    return this.service.getSummary(
      req.user.gymId,
    );
  }

  @Get('members/:memberId/wallet')
  getWallet(
    @Req() req: any,
    @Param('memberId') memberId: string,
  ) {
    return this.service.getMemberWallet(
      req.user.gymId,
      Number(memberId),
    );
  }

  @Post('members/:memberId/top-up')
  async topUp(
    @Req() req: any,
    @Param('memberId') memberId: string,
    @Body()
    body: {
      amount?: number;
      description?: string;
    },
  ) {
    const result =
      await this.service.topUp(
        req.user.gymId,
        Number(memberId),
        Number(body.amount),
        body.description,
      );

    await this.auditLogService.create({
      gymId: req.user.gymId,
      userId:
        req.user.id ||
        req.user.sub ||
        null,
      userName:
        req.user.email || null,
      module:
        AuditModule.CAFE,
      action:
        AuditAction.TOP_UP,
      description:
        `Üye #${memberId} hesabına ${Number(
          body.amount || 0,
        )} TL bakiye yüklendi.`,
      entityType:
        'MemberWallet',
      entityId: memberId,
      amount:
        Number(body.amount || 0),
      ipAddress:
        req.ip || null,
      userAgent:
        req.headers?.[
          'user-agent'
        ] || null,
    });

    return result;
  }

  @Get('products')
  getProducts(
    @Req() req: any,
  ) {
    return this.service.getProducts(
      req.user.gymId,
    );
  }

  @Post('products')
  createProduct(
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.service.createProduct(
      req.user.gymId,
      body,
    );
  }

  @Patch('products/:id')
  updateProduct(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.updateProduct(
      req.user.gymId,
      id,
      body,
    );
  }

  @Post('sales')
  async createSale(
    @Req() req: any,
    @Body() body: any,
  ) {
    const result =
      await this.service.createSale(
        req.user.gymId,
        body,
      );

    await this.auditLogService.create({
      gymId: req.user.gymId,
      userId:
        req.user.id ||
        req.user.sub ||
        null,
      userName:
        req.user.email || null,
      module:
        AuditModule.CAFE,
      action:
        AuditAction.SALE,
      description:
        `Kafe satışı yapıldı. Tutar: ${Number(
          result.sale.totalAmount || 0,
        )} TL`,
      entityType:
        'CafeSale',
      entityId:
        result.sale.id,
      amount:
        Number(
          result.sale.totalAmount || 0,
        ),
      ipAddress:
        req.ip || null,
      userAgent:
        req.headers?.[
          'user-agent'
        ] || null,
      metadata: {
        memberId:
          body.memberId || null,
        paymentMethod:
          body.paymentMethod || null,
        items:
          body.items || [],
        note:
          body.note || null,
      },
    });

    return result;
  }

  @Get('sales')
  getSales(
    @Req() req: any,
  ) {
    return this.service.getSales(
      req.user.gymId,
    );
  }

  @Get('products/favorites')
  getFavoriteProducts(
    @Req() req: any,
  ) {
    return this.service
      .getFavoriteProducts(
        req.user.gymId,
      );
  }

  @Get('products/low-stock')
  getLowStockProducts(
    @Req() req: any,
  ) {
    return this.service
      .getLowStockProducts(
        req.user.gymId,
      );
  }

}
