import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeviceEventController } from './device-event.controller';
import { DeviceEvent } from './device-event.entity';
import { DeviceEventService } from './device-event.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceEvent,
    ]),
  ],
  controllers: [
    DeviceEventController,
  ],
  providers: [
    DeviceEventService,
  ],
  exports: [
    DeviceEventService,
  ],
})
export class DeviceEventModule {}
