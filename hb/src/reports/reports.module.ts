import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Member } from '../member/member.entity';
import { Finance } from '../finance.entity';
import { SmsHistory } from '../sms/sms-history.entity';
import { GymSmsBalance } from '../sms/gym-sms-balance.entity';
import { Locker } from '../locker/locker.entity';
import { LockerHistory } from '../locker/locker-history.entity';
import { CafeSale } from '../wallet-cafe/cafe-sale.entity';
import { CafeProduct } from '../wallet-cafe/cafe-product.entity';
import { Staff } from '../staff/staff.entity';
import { StaffAttendance } from '../staff/staff-attendance.entity';
import { TurnstileEvent } from '../turnstile/turnstile-event.entity';

import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Member,
      Finance,
      SmsHistory,
      GymSmsBalance,
      Locker,
      LockerHistory,
      CafeSale,
      CafeProduct,
      Staff,
      StaffAttendance,
      TurnstileEvent,
    ]),
  ],
  controllers: [
    ReportsController,
  ],
  providers: [
    ReportsService,
  ],
  exports: [
    ReportsService,
  ],
})
export class ReportsModule {}
