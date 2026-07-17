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

import {
  JwtAuthGuard,
} from '../auth/jwt-auth.guard';

import {
  RolesGuard,
} from '../auth/roles.guard';

import {
  Roles,
} from '../auth/roles.decorator';

import {
  UserRole,
} from '../user.entity';

import {
  TurnstileDirection,
  TurnstileStatus,
} from './turnstile.entity';

import {
  TurnstileService,
} from './turnstile.service';

@Controller('turnstiles')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  UserRole.GYM_ADMIN,
  UserRole.STAFF,
)
export class TurnstileController {
  constructor(
    private readonly service:
      TurnstileService,
  ) {}

  @Get('dashboard')
  dashboard(
    @Req() req: any,
  ) {
    return this.service.getDashboard(
      req.user.gymId,
    );
  }

  @Get()
  list(
    @Req() req: any,
  ) {
    return this.service.getAllForGym(
      req.user.gymId,
    );
  }

  @Post()
  create(
    @Req() req: any,
    @Body()
    body: {
      name?: string;
      brand?: string | null;
      model?: string | null;
      serialNumber?: string | null;
      ipAddress?: string | null;
      macAddress?: string | null;
      location?: string | null;
      direction?:
        TurnstileDirection;
      firmwareVersion?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.service.create(
      req.user.gymId,
      body,
    );
  }

  @Post(':id/heartbeat')
  heartbeat(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.heartbeat(
      req.user.gymId,
      id,
      body,
    );
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      status:
        TurnstileStatus;
    },
  ) {
    return this.service.updateStatus(
      req.user.gymId,
      id,
      body.status,
    );
  }

  @Post(':id/open')
  openGate(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      reason?: string;
    },
  ) {
    return this.service.openGate(
      req.user.gymId,
      id,
      req.user.id ||
        req.user.sub ||
        null,
      body.reason,
    );
  }

  @Post('emergency/open-all')
  emergencyOpenAll(
    @Req() req: any,
    @Body()
    body: {
      reason?: string;
    },
  ) {
    return this.service.emergencyOpenAll(
      req.user.gymId,
      req.user.id ||
        req.user.sub ||
        null,
      body.reason,
    );
  }

  @Get('organization-dashboard')
  organizationDashboard(
    @Req() req: any,
  ) {
    return this.service
      .getOrganizationDashboard(
        req.user.organizationId,
        req.user.authorizedGymIds ||
          [],
        Boolean(
          req.user.accessAllGyms,
        ),
      );
  }

}
