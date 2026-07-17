import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  DeviceEventSeverity,
  DeviceEventType,
} from './device-event.entity';
import { DeviceEventService } from './device-event.service';

@Controller('device-events')
@UseGuards(JwtAuthGuard)
export class DeviceEventController {
  constructor(
    private readonly service:
      DeviceEventService,
  ) {}

  @Get()
  list(
    @Req() req: any,
    @Query('deviceId')
    deviceId?: string,
    @Query('deviceType')
    deviceType?: string,
    @Query('eventType')
    eventType?: DeviceEventType,
    @Query('severity')
    severity?: DeviceEventSeverity,
    @Query('limit')
    limit?: string,
  ) {
    return this.service.list(
      req.user.gymId,
      {
        deviceId,
        deviceType,
        eventType,
        severity,
        limit: limit
          ? Number(limit)
          : undefined,
      },
    );
  }

  @Get('summary')
  summary(
    @Req() req: any,
  ) {
    return this.service.summary(
      req.user.gymId,
    );
  }
}
