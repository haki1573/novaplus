import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccessCard } from '../card/access-card.entity';
import { Gym } from '../gym/gym.entity';
import { Member } from '../member/member.entity';
import { GymSmsBalance } from '../sms/gym-sms-balance.entity';
import { Locker } from '../locker/locker.entity';
import { CafeProduct } from '../wallet-cafe/cafe-product.entity';
import { AuthModule } from '../auth/auth.module';

import { Notification } from './notification.entity';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      AccessCard,
      Member,
      GymSmsBalance,
      Locker,
      CafeProduct,
      Gym,
    ]),
    AuthModule,
  ],

  controllers: [
    NotificationController,
  ],

  providers: [
    NotificationService,
  ],

  exports: [
    NotificationService,
  ],
})
export class NotificationModule {}
