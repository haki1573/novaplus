import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../user.entity';

import { NovaAiService } from './nova-ai.service';

@Controller('nova-ai')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  UserRole.GYM_ADMIN,
  UserRole.STAFF,
)
export class NovaAiController {
  constructor(
    private readonly service:
      NovaAiService,
  ) {}

  @Get('briefing')
  briefing(
    @Req() req: any,
  ) {
    return this.service.briefing(
      req.user.gymId,
    );
  }

  @Get('health-score')
  healthScore(
    @Req() req: any,
  ) {
    return this.service.healthScore(
      req.user.gymId,
    );
  }

  @Get('alerts')
  alerts(
    @Req() req: any,
  ) {
    return this.service.alerts(
      req.user.gymId,
    );
  }
}
