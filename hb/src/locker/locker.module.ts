import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { Member } from '../member/member.entity';

import { Locker } from './locker.entity';
import { LockerHistory } from './locker-history.entity';
import { LockerController } from './locker.controller';
import { LockerService } from './locker.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Locker,
      LockerHistory,
      Member,
    ]),
    AuthModule,
    AuditLogModule,
  ],

  controllers: [
    LockerController,
  ],

  providers: [
    LockerService,
  ],

  exports: [
    LockerService,
  ],
})
export class LockerModule {}
