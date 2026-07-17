import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../user.entity';
import { Staff } from '../staff/staff.entity';
import { StaffPermission } from '../staff/staff-permission.entity';

import { CurrentUserController } from './current-user.controller';
import { PermissionsGuard } from './permissions.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Staff,
      StaffPermission,
    ]),
  ],
  controllers: [
    CurrentUserController,
  ],
  providers: [
    PermissionsGuard,
    {
      provide: APP_GUARD,
      useExisting:
        PermissionsGuard,
    },
  ],
  exports: [
    PermissionsGuard,
  ],
})
export class PermissionsModule {}
