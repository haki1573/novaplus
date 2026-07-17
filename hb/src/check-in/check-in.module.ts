import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Member } from '../member/member.entity';
import { AccessCard } from '../card/access-card.entity';
import { LockerModule } from '../locker/locker.module';
import { StaffModule } from '../staff/staff.module';
import { TurnstileModule } from '../turnstile/turnstile.module';

import { CheckIn } from './check-in.entity';
import { CheckInService } from './check-in.service';
import { CheckInController } from './check-in.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CheckIn,
      Member,
      AccessCard,
    ]),
    LockerModule,
    StaffModule,
    TurnstileModule,
  ],

  controllers: [
    CheckInController,
  ],

  providers: [
    CheckInService,
  ],

  exports: [
    CheckInService,
  ],
})
export class CheckInModule {}
