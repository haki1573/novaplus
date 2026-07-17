import type {
  ReactElement,
} from 'react';

import {
  Navigate,
} from 'react-router-dom';

import {
  hasPermission,
  type PermissionKey,
} from '../services/access';

type PermissionRouteProps = {
  permission: PermissionKey;
  children: ReactElement;
};

export function PermissionRoute({
  permission,
  children,
}: PermissionRouteProps) {
  if (
    !hasPermission(
      permission,
    )
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return children;
}
