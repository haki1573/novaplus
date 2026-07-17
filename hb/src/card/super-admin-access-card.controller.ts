import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../user.entity';

import {
  AccessCredentialStatus,
  AccessCredentialType,
} from './access-card.entity';

import {
  AccessCardService,
} from './access-card.service';

@Controller(
  'super-admin/gyms/:gymId/cards',
)
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminAccessCardController {
  constructor(
    private readonly accessCardService:
      AccessCardService,
  ) {}

  @Get()
  findAll(
    @Param('gymId') gymId: string,
    @Query('type')
    type?: AccessCredentialType,
  ) {
    return this.accessCardService
      .findAllByGym(gymId, type);
  }

  @Get('summary')
  summary(
    @Param('gymId') gymId: string,
  ) {
    return this.accessCardService
      .getInventorySummary(gymId);
  }

  @Post()
  create(
    @Param('gymId') gymId: string,
    @Body() body: any,
  ) {
    return this.accessCardService
      .createStockItem(gymId, body);
  }

  @Post('bulk')
  bulkCreate(
    @Param('gymId') gymId: string,
    @Body() body: any,
  ) {
    return this.accessCardService
      .bulkCreateStock(gymId, body);
  }

  @Post('generate-qr')
  generateQrCode() {
    return this.accessCardService
      .generateQrCode();
  }

  @Post('assign')
  assign(
    @Param('gymId') gymId: string,
    @Body() body: any,
  ) {
    return this.accessCardService
      .assignToMember(gymId, body);
  }

  @Patch(':id')
  update(
    @Param('gymId') gymId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.accessCardService
      .updateForGym(
        gymId,
        id,
        body,
      );
  }

  @Patch(':id/status')
  updateStatus(
    @Param('gymId') gymId: string,
    @Param('id') id: string,
    @Body()
    body: {
      status: AccessCredentialStatus;
    },
  ) {
    return this.accessCardService
      .updateStatusForGym(
        gymId,
        id,
        body.status,
      );
  }

  @Patch(':id/unassign')
  unassign(
    @Param('gymId') gymId: string,
    @Param('id') id: string,
  ) {
    return this.accessCardService
      .unassignFromMember(
        gymId,
        id,
      );
  }

  @Delete(':id')
  delete(
    @Param('gymId') gymId: string,
    @Param('id') id: string,
  ) {
    return this.accessCardService
      .deleteForGym(gymId, id);
  }
}

@Controller('super-admin/cards')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminCentralCardsController {
  constructor(
    private readonly accessCardService:
      AccessCardService,
  ) {}

  @Get('dashboard')
  dashboard() {
    return this.accessCardService
      .getCloudInventory();
  }

  @Post('sell')
  sellToGym(
    @Body() body: any,
  ) {
    return this.accessCardService
      .sellStockToGym(body);
  }
}
