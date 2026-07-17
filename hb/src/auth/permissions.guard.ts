import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  User,
  UserRole,
} from '../user.entity';

import { Staff } from '../staff/staff.entity';
import { StaffPermission } from '../staff/staff-permission.entity';

import {
  PERMISSIONS_KEY,
  type PermissionKey,
} from './permissions.decorator';

const pathPermissionMap: Array<{
  prefixes: string[];
  permission: PermissionKey;
}> = [
  {
    prefixes: [
      '/dashboard',
      '/analytics',
      '/notifications',
      '/nova-ai',
    ],
    permission: 'dashboard',
  },
  {
    prefixes: [
      '/members',
      '/packages',
    ],
    permission: 'members',
  },
  {
    prefixes: [
      '/finance',
    ],
    permission: 'finance',
  },
  {
    prefixes: [
      '/sms',
    ],
    permission: 'sms',
  },
  {
    prefixes: [
      '/lockers',
      '/locker',
    ],
    permission: 'lockers',
  },
  {
    prefixes: [
      '/cafe',
      '/wallet-cafe',
      '/wallet',
    ],
    permission: 'cafe',
  },
  {
    prefixes: [
      '/reports',
    ],
    permission: 'reports',
  },
  {
    prefixes: [
      '/check-in',
    ],
    permission: 'checkIn',
  },
  {
    prefixes: [
      '/access-cards',
      '/cards',
    ],
    permission: 'accessCards',
  },
  {
    prefixes: [
      '/settings',
      '/staff',
    ],
    permission: 'settings',
  },
];

@Injectable()
export class PermissionsGuard
  implements CanActivate
{
  constructor(
    private readonly reflector:
      Reflector,

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

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest();

    const authUser = request.user as {
      id?: string;
      sub?: string;
      role?: UserRole;
      gymId?: string | null;
      email?: string;
    } | undefined;

    if (!authUser) {
      return true;
    }

    if (
      authUser.role ===
        UserRole.SUPER_ADMIN ||
      authUser.role ===
        UserRole.GYM_ADMIN
    ) {
      return true;
    }

    if (
      authUser.role !==
      UserRole.STAFF
    ) {
      return true;
    }

    const requiredFromDecorator =
      this.reflector.getAllAndOverride<
        PermissionKey[]
      >(
        PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    const requestPath = String(
      request.originalUrl ||
        request.url ||
        '',
    ).split('?')[0];

    if (
      requestPath === '/auth/me' ||
      requestPath === '/auth/login'
    ) {
      return true;
    }

    const mapped =
      pathPermissionMap.find(
        (item) =>
          item.prefixes.some(
            (prefix) =>
              requestPath === prefix ||
              requestPath.startsWith(
                `${prefix}/`,
              ),
          ),
      )?.permission;

    const required =
      requiredFromDecorator?.length
        ? requiredFromDecorator
        : mapped
          ? [mapped]
          : [];

    if (
      required.length === 0
    ) {
      return true;
    }

    const userId =
      authUser.id ||
      authUser.sub;

    const user =
      userId
        ? await this.userRepository
            .findOne({
              where: {
                id: userId,
              },
            })
        : null;

    const email =
      user?.email ||
      authUser.email;

    const gymId =
      user?.gymId ||
      authUser.gymId;

    if (!email || !gymId) {
      throw new ForbiddenException(
        'Personel hesabı bir salon ve e-posta ile eşleşmiyor.',
      );
    }

    const staff =
      await this.staffRepository.findOne({
        where: {
          gymId,
          email,
          isActive: true,
          isArchived: false,
        },
      });

    if (!staff) {
      throw new ForbiddenException(
        'Bu kullanıcıya bağlı aktif personel kaydı bulunamadı. Kullanıcı ve personel e-postalarının aynı olduğundan emin olun.',
      );
    }

    const permissions =
      await this.permissionRepository
        .findOne({
          where: {
            staffId: staff.id,
          },
        });

    if (!permissions) {
      throw new ForbiddenException(
        'Personel izin kaydı bulunamadı.',
      );
    }

    const allowed =
      required.every(
        (permission) =>
          permissions[permission] ===
          true,
      );

    if (!allowed) {
      throw new ForbiddenException(
        'Bu işlem için yetkiniz bulunmuyor.',
      );
    }

    request.staffRecord = staff;
    request.permissions = permissions;

    return true;
  }
}
