import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Gym } from '../gym/gym.entity';
import { DeviceEventModule } from '../device-event/device-event.module';
import { NotificationModule } from '../notification/notification.module';

import { DeviceController } from './device.controller';
import { Device } from './device.entity';
import { DeviceService } from './device.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Device,
      Gym,
    ]),
    DeviceEventModule,
    NotificationModule,
  ],
  controllers: [
    DeviceController,
  ],
  providers: [
    DeviceService,
  ],
  exports: [
    DeviceService,
  ],
})
export class DeviceModule {}
