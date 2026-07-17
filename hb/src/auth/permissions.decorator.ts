import { SetMetadata } from '@nestjs/common';

export type PermissionKey =
  | 'dashboard'
  | 'members'
  | 'finance'
  | 'sms'
  | 'lockers'
  | 'cafe'
  | 'reports'
  | 'checkIn'
  | 'accessCards'
  | 'settings';

export const PERMISSIONS_KEY =
  'permissions';

export const Permissions = (
  ...permissions: PermissionKey[]
) =>
  SetMetadata(
    PERMISSIONS_KEY,
    permissions,
  );
