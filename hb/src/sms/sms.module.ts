import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { Gym } from '../gym/gym.entity';
import { Member } from '../member/member.entity';

import { SmsPackage } from './sms-package.entity';
import { GymSmsBalance } from './gym-sms-balance.entity';
import { SmsHistory } from './sms-history.entity';
import { SmsPurchase } from './sms-purchase.entity';

import {
  SMS_PROVIDER,
} from './providers/sms-provider.interface';

import { ConsoleSmsProvider } from './providers/console-sms.provider';

import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { SuperAdminSmsController } from './super-admin-sms.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SmsPackage,
      GymSmsBalance,
      SmsHistory,
      SmsPurchase,
      Gym,
      Member,
    ]),

    AuthModule,
    AuditLogModule,
  ],

  controllers: [
    SmsController,
    SuperAdminSmsController,
  ],

  providers: [
    SmsService,
    ConsoleSmsProvider,

    {
      provide:
        SMS_PROVIDER,
      useExisting:
        ConsoleSmsProvider,
    },
  ],

  exports: [
    SmsService,
  ],
})
export class SmsModule {}
