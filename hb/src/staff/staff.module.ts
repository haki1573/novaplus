import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogModule } from '../audit-log/audit-log.module';

import { Staff } from './staff.entity';
import { StaffAttendance } from './staff-attendance.entity';
import { StaffPermission } from './staff-permission.entity';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Staff,
      StaffAttendance,
      StaffPermission,
    ]),
    AuditLogModule,
  ],

  controllers: [
    StaffController,
  ],

  providers: [
    StaffService,
  ],

  exports: [
    StaffService,
  ],
})
export class StaffModule {}
