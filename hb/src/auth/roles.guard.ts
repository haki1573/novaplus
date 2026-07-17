import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { UserRole } from '../user.entity';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<UserRole[]>(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'Kullanıcı bilgisi bulunamadı.',
      );
    }

    const normalizedRole =
      user.role === 'MANAGER'
        ? UserRole.GYM_ADMIN
        : user.role;

    const hasRole =
      requiredRoles.includes(
        normalizedRole,
      );

    if (!hasRole) {
      throw new ForbiddenException(
        'Bu işlem için yetkiniz bulunmuyor.',
      );
    }

    return true;
  }
}