import {
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  UserRole,
} from '../user.entity';

import { DemoService } from './demo.service';

@Controller('demo')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  UserRole.GYM_ADMIN,
)
export class DemoController {
  constructor(
    private readonly demoService:
      DemoService,
  ) {}

  @Get('status')
  status(
    @Req() req: any,
  ) {
    return this.demoService.status(
      req.user.gymId,
    );
  }

  @Post('load')
  load(
    @Req() req: any,
  ) {
    return this.demoService.load(
      req.user.gymId,
    );
  }

  @Delete('reset')
  reset(
    @Req() req: any,
  ) {
    return this.demoService.reset(
      req.user.gymId,
    );
  }
}
