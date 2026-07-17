import {
  Controller,
  Get,
  NotFoundException,
  Req,
  UseGuards,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtAuthGuard } from './jwt-auth.guard';

import {
  User,
  UserRole,
} from '../user.entity';

import { Staff } from '../staff/staff.entity';
import { StaffPermission } from '../staff/staff-permission.entity';

const fullPermissions = {
  dashboard: true,
  members: true,
  finance: true,
  sms: true,
  lockers: true,
  cafe: true,
  reports: true,
  checkIn: true,
  accessCards: true,
  settings: true,
};

@Controller('auth')
export class CurrentUserController {
  constructor(
    @InjectRepository(User)
    private readonly userRepository:
      Repository<User>,

    @InjectRepository(Staff)
    private readonly staffRepository:
      Repository<Staff>,

    @InjectRepository(StaffPermission)
    private readonly permissionRepository:
      Repository<StaffPermission>,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(
    @Req() req: any,
  ) {
    const userId =
      req.user.id ||
      req.user.sub;

    const user =
      await this.userRepository
        .findOne({
          where: {
            id: userId,
          },
          relations: {
            gym: true,
          },
        });

    if (!user) {
      throw new NotFoundException(
        'Kullanıcı bulunamadı.',
      );
    }

    if (
      user.role !==
      UserRole.STAFF
    ) {
      return {
        user: {
          id: user.id,
          email: user.email,
          firstName:
            user.firstName,
          lastName:
            user.lastName,
          fullName:
            `${user.firstName} ${user.lastName}`.trim(),
          role: user.role,
          gymId: user.gymId,
          gym: user.gym,
        },
        staff: null,
        permissions:
          fullPermissions,
      };
    }

    const staff =
      user.gymId
        ? await this.staffRepository
            .findOne({
              where: {
                gymId:
                  user.gymId,
                email:
                  user.email,
                isActive: true,
                isArchived: false,
              },
            })
        : null;

    const permissions =
      staff
        ? await this.permissionRepository
            .findOne({
              where: {
                staffId:
                  staff.id,
              },
            })
        : null;

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName:
          user.firstName,
        lastName:
          user.lastName,
        fullName:
          `${user.firstName} ${user.lastName}`.trim(),
        role: user.role,
        gymId: user.gymId,
        gym: user.gym,
      },
      staff,
      permissions:
        permissions || {
          dashboard: true,
          members: false,
          finance: false,
          sms: false,
          lockers: false,
          cafe: false,
          reports: false,
          checkIn: false,
          accessCards: false,
          settings: false,
        },
    };
  }
}
