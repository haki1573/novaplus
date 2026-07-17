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

export type PermissionMap =
  Record<
    PermissionKey,
    boolean
  >;

export type SessionUser = {
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  role?: string;
  gymId?: string | null;
  permissions?: Partial<PermissionMap>;
};

export const fullPermissions:
  PermissionMap = {
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

export function readSessionUser():
  SessionUser {
  try {
    const raw =
      localStorage.getItem(
        'user',
      );

    return raw
      ? JSON.parse(raw)
      : {};
  } catch {
    return {};
  }
}

export function hasPermission(
  permission: PermissionKey,
) {
  const user =
    readSessionUser();

  if (
    user.role ===
      'SUPER_ADMIN' ||
    user.role ===
      'GYM_ADMIN' ||
    user.role ===
      'MANAGER'
  ) {
    return true;
  }

  return (
    user.permissions?.[
      permission
    ] === true
  );
}

export const routePermission:
  Record<
    string,
    PermissionKey
  > = {
    '/dashboard': 'dashboard',
    '/members': 'members',
    '/packages': 'members',
    '/checkin': 'checkIn',
    '/finance': 'finance',
    '/access-cards':
      'accessCards',
    '/cafe': 'cafe',
    '/staff': 'settings',
    '/sms': 'sms',
    '/lockers': 'lockers',
    '/nova-ai': 'dashboard',
    '/notifications':
      'dashboard',
    '/reports': 'reports',
    '/settings': 'settings',
  };
