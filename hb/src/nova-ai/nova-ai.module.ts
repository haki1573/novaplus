import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Member } from '../member/member.entity';
import { CheckIn } from '../check-in/check-in.entity';
import { Finance } from '../finance.entity';
import { CafeProduct } from '../wallet-cafe/cafe-product.entity';
import { CafeSale } from '../wallet-cafe/cafe-sale.entity';
import { GymSmsBalance } from '../sms/gym-sms-balance.entity';
import { Locker } from '../locker/locker.entity';
import { StaffAttendance } from '../staff/staff-attendance.entity';

import { NovaAiController } from './nova-ai.controller';
import { NovaAiService } from './nova-ai.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Member,
      CheckIn,
      Finance,
      CafeProduct,
      CafeSale,
      GymSmsBalance,
      Locker,
      StaffAttendance,
    ]),
  ],

  controllers: [
    NovaAiController,
  ],

  providers: [
    NovaAiService,
  ],

  exports: [
    NovaAiService,
  ],
})
export class NovaAiModule {}
