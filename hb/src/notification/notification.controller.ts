import {
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

import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
@Roles(
  UserRole.GYM_ADMIN,
  UserRole.STAFF,
)
export class NotificationController {
  constructor(
    private readonly notificationService:
      NotificationService,
  ) {}

  @Get()
  list(
    @Req() req: {
      user: {
        gymId: string;
      };
    },
  ) {
    return this.notificationService.list(
      req.user.gymId,
    );
  }

  @Get('summary')
  summary(
    @Req() req: {
      user: {
        gymId: string;
      };
    },
  ) {
    return this.notificationService.summary(
      req.user.gymId,
    );
  }

  @Patch(':id/read')
  markRead(
    @Req() req: {
      user: {
        gymId: string;
      };
    },
    @Param('id')
    id: string,
  ) {
    return this.notificationService.markRead(
      req.user.gymId,
      id,
    );
  }

  @Post('read-all')
  markAllRead(
    @Req() req: {
      user: {
        gymId: string;
      };
    },
  ) {
    return this.notificationService.markAllRead(
      req.user.gymId,
    );
  }

  @Patch(':id/resolve')
  resolve(
    @Req() req: {
      user: {
        gymId: string;
      };
    },
    @Param('id')
    id: string,
  ) {
    return this.notificationService.resolve(
      req.user.gymId,
      id,
    );
  }
}
