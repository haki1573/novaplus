import {
  useEffect,
  useState,
} from 'react';

import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import {
  Box,
  CircularProgress,
} from '@mui/material';

import { api } from './services/api';
import { NovaThemeProvider } from './theme/NovaThemeProvider';

import { Login } from './pages/Login';
import { Setup } from './pages/Setup';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { Packages } from './pages/Packages';
import { CheckIn } from './pages/CheckIn';
import { Finance } from './pages/Finance';
import { Cafe } from './pages/Cafe';
import { Notifications } from './pages/Notifications';
import { NovaAI } from './pages/NovaAI';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { AccessCards } from './pages/AccessCards';
import { SmsPanel } from './pages/SmsPanel';
import { Lockers } from './pages/Lockers';
import { Staff } from './pages/Staff';
import { AuditLogs } from './pages/AuditLogs';
import { Turnstiles } from './pages/Turnstiles';
import { DeviceCenter } from './pages/DeviceCenter';

import { SuperAdminLayout } from './super-admin/SuperAdminLayout';
import { SuperAdminDashboard } from './super-admin/SuperAdminDashboard';
import { Gyms } from './super-admin/Gyms';
import { GymManagement } from './super-admin/GymManagement';
import { SuperAdminMembers } from './super-admin/SuperAdminMembers';
import { SuperAdminPackages } from './super-admin/SuperAdminPackages';
import { SuperAdminFinance } from './super-admin/SuperAdminFinance';
import { SuperAdminCards } from './super-admin/SuperAdminCards';
import { SuperAdminModulePlaceholder } from './super-admin/SuperAdminModulePlaceholder';
import { LicenseManagement } from './super-admin/LicenseManagement';
import { SuperAdminSms } from './super-admin/SuperAdminSms';
import { Organizations } from './super-admin/Organizations';
import { BackupManagement } from './super-admin/BackupManagement';
import { SuperAdminSettings } from './super-admin/SuperAdminSettings';

type UserRole =
  | 'SUPER_ADMIN'
  | 'GYM_ADMIN'
  | 'STAFF'
  | 'MANAGER';

type PermissionKey =
  | 'dashboard'
  | 'members'
  | 'packages'
  | 'checkIn'
  | 'finance'
  | 'accessCards'
  | 'cafe'
  | 'staff'
  | 'sms'
  | 'devices'
  | 'turnstiles'
  | 'lockers'
  | 'novaAi'
  | 'notifications'
  | 'reports'
  | 'auditLogs'
  | 'settings';

interface JwtPayload {
  role?: UserRole;
  exp?: number;
  permissions?: Partial<
    Record<
      PermissionKey,
      boolean
    >
  >;
}

interface SetupStatus {
  needsSetup: boolean;
}

function decodeToken(
  token: string,
): JwtPayload | null {
  try {
    const payloadPart =
      token.split('.')[1];

    if (!payloadPart) {
      return null;
    }

    const normalizedPayload =
      payloadPart
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const paddedPayload =
      normalizedPayload.padEnd(
        normalizedPayload.length +
          ((4 -
            (normalizedPayload.length %
              4)) %
            4),
        '=',
      );

    const decodedPayload =
      window.atob(paddedPayload);

    return JSON.parse(
      decodedPayload,
    ) as JwtPayload;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function ProtectedModule({
  permission,
  payload,
  children,
}: {
  permission:
    PermissionKey;
  payload:
    JwtPayload;
  children:
    React.ReactElement;
}) {
  if (
    payload.role ===
      'GYM_ADMIN' ||
    payload.role ===
      'MANAGER'
  ) {
    return children;
  }

  return payload
    .permissions?.[
      permission
    ]
    ? children
    : (
      <Navigate
        to="/dashboard"
        replace
      />
    );
}

function LoadingScreen() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'linear-gradient(135deg, #071831 0%, #020817 100%)',
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Box
          component="img"
          src="/novaplus-logo.jpg"
          alt="NovaPlus"
          sx={{
            width: 240,
            height: 100,
            objectFit: 'contain',
            borderRadius: 3,
            backgroundColor: '#ffffff',
            px: 2,
            mb: 3,
          }}
        />

        <CircularProgress
          sx={{ color: '#ffffff' }}
        />
      </Box>
    </Box>
  );
}

function App() {
  const [checkingSetup, setCheckingSetup] =
    useState(true);

  const [needsSetup, setNeedsSetup] =
    useState(false);

  const [setupError, setSetupError] =
    useState('');

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(false);

  const [
    sessionValid,
    setSessionValid,
  ] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        setCheckingSetup(true);
        setSetupError('');

        const response =
          await api.get<SetupStatus>(
            '/setup/status',
          );

        setNeedsSetup(
          response.data.needsSetup,
        );
      } catch {
        setSetupError(
          'Backend bağlantısı kurulamadı.',
        );
      } finally {
        setCheckingSetup(false);
      }
    };

    void checkSetupStatus();
  }, []);

  useEffect(() => {
    if (
      checkingSetup ||
      needsSetup
    ) {
      return;
    }

    const token =
      localStorage.getItem(
        'token',
      );

    if (!token) {
      setSessionValid(false);
      return;
    }

    const validateSession =
      async () => {
        try {
          setCheckingSession(
            true,
          );

          await api.get(
            '/auth/profile',
          );

          setSessionValid(
            true,
          );
        } catch {
          clearSession();

          sessionStorage.setItem(
            'sessionExpired',
            'true',
          );

          setSessionValid(
            false,
          );
        } finally {
          setCheckingSession(
            false,
          );
        }
      };

    void validateSession();
  }, [
    checkingSetup,
    needsSetup,
  ]);

  if (
    checkingSetup ||
    checkingSession
  ) {
    return <LoadingScreen />;
  }

  if (setupError) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: '#ffffff',
          backgroundColor: '#071831',
        }}
      >
        <Box>
          <Box
            component="h1"
            sx={{
              m: 0,
              fontSize: 28,
            }}
          >
            NovaPlus+ bağlantı hatası
          </Box>

          <Box
            component="p"
            sx={{
              mt: 1,
              color:
                'rgba(255,255,255,0.75)',
            }}
          >
            {setupError}
            <br />
            Backend terminalinde
            <strong>
              {' '}
              npm run start:dev{' '}
            </strong>
            komutunun çalıştığını kontrol edin.
          </Box>
        </Box>
      </Box>
    );
  }

  if (needsSetup) {
    return (
      <Setup
        onCompleted={() => {
          clearSession();
          setNeedsSetup(false);
        }}
      />
    );
  }

  const token =
    localStorage.getItem('token');

  if (
    token &&
    sessionValid === null
  ) {
    return <LoadingScreen />;
  }

  if (!token) {
    return <Login />;
  }

  const payload =
    decodeToken(token);

  if (!payload) {
    clearSession();

    sessionStorage.setItem(
      'sessionExpired',
      'true',
    );

    return <Login />;
  }

  const isExpired =
    typeof payload.exp === 'number' &&
    payload.exp * 1000 < Date.now();

  if (isExpired) {
    clearSession();

    sessionStorage.setItem(
      'sessionExpired',
      'true',
    );

    return <Login />;
  }

  if (
    payload.role === 'SUPER_ADMIN'
  ) {
    return (
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to="/super-admin/dashboard"
              replace
            />
          }
        />

        <Route
          path="/super-admin"
          element={<SuperAdminLayout />}
        >
          <Route
            index
            element={
              <Navigate
                to="/super-admin/dashboard"
                replace
              />
            }
          />

          <Route
            path="dashboard"
            element={
              <SuperAdminDashboard />
            }
          />

          <Route
            path="organizations"
            element={<Organizations />}
          />

          <Route
            path="gyms"
            element={<Gyms />}
          />

          <Route
            path="gyms/:gymId"
            element={<GymManagement />}
          />

          <Route
            path="gyms/:gymId/members"
            element={
              <SuperAdminMembers />
            }
          />

          <Route
            path="gyms/:gymId/packages"
            element={
              <SuperAdminPackages />
            }
          />

          <Route
            path="gyms/:gymId/finance"
            element={
              <SuperAdminFinance />
            }
          />

          <Route
            path="gyms/:gymId/staff"
            element={
              <SuperAdminModulePlaceholder
                title="Personeller"
                description="Bu salonun yöneticileri ve personelleri burada yönetilecek."
              />
            }
          />

          <Route
            path="gyms/:gymId/cards"
            element={
              <SuperAdminCards />
            }
          />

          <Route
            path="gyms/:gymId/license"
            element={
              <LicenseManagement />
            }
          />

          <Route
            path="cards"
            element={<SuperAdminCards />}
          />

          <Route
            path="sms"
            element={<SuperAdminSms />}
          />

          <Route
            path="backups"
            element={<BackupManagement />}
          />

          <Route
            path="settings"
            element={<SuperAdminSettings />}
          />
        </Route>

        <Route
          path="*"
          element={
            <Navigate
              to="/super-admin/dashboard"
              replace
            />
          }
        />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        path="/dashboard"
        element={<Dashboard />}
      />

      <Route
        path="/members"
        element={
          <ProtectedModule
            permission="members"
            payload={payload}
          >
            <Members />
          </ProtectedModule>
        }
      />

      <Route
        path="/packages"
        element={
          <ProtectedModule
            permission="packages"
            payload={payload}
          >
            <Packages />
          </ProtectedModule>
        }
      />

      <Route
        path="/checkin"
        element={
          <ProtectedModule
            permission="checkIn"
            payload={payload}
          >
            <CheckIn />
          </ProtectedModule>
        }
      />

      <Route
        path="/finance"
        element={
          <ProtectedModule
            permission="finance"
            payload={payload}
          >
            <Finance />
          </ProtectedModule>
        }
      />

      <Route
        path="/cafe"
        element={
          <ProtectedModule
            permission="cafe"
            payload={payload}
          >
            <Cafe />
          </ProtectedModule>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedModule
            permission="notifications"
            payload={payload}
          >
            <Notifications />
          </ProtectedModule>
        }
      />

      <Route
        path="/nova-ai"
        element={
          <ProtectedModule
            permission="novaAi"
            payload={payload}
          >
            <NovaAI />
          </ProtectedModule>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedModule
            permission="reports"
            payload={payload}
          >
            <Reports />
          </ProtectedModule>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedModule
            permission="settings"
            payload={payload}
          >
            <Settings />
          </ProtectedModule>
        }
      />

      <Route
        path="/sms"
        element={
          <ProtectedModule
            permission="sms"
            payload={payload}
          >
            <SmsPanel />
          </ProtectedModule>
        }
      />

      <Route
        path="/turnstiles"
        element={
          <ProtectedModule
            permission="turnstiles"
            payload={payload}
          >
            <Turnstiles />
          </ProtectedModule>
        }
      />

      <Route
        path="/device-center"
        element={
          <ProtectedModule
            permission="devices"
            payload={payload}
          >
            <DeviceCenter />
          </ProtectedModule>
        }
      />

      <Route
        path="/lockers"
        element={
          <ProtectedModule
            permission="lockers"
            payload={payload}
          >
            <Lockers />
          </ProtectedModule>
        }
      />

      <Route
        path="/staff"
        element={
          <ProtectedModule
            permission="staff"
            payload={payload}
          >
            <Staff />
          </ProtectedModule>
        }
      />

      <Route
        path="/audit-logs"
        element={
          <ProtectedModule
            permission="auditLogs"
            payload={payload}
          >
            <AuditLogs />
          </ProtectedModule>
        }
      />

      <Route
        path="/access-cards"
        element={
          <ProtectedModule
            permission="accessCards"
            payload={payload}
          >
            <AccessCards />
          </ProtectedModule>
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />
    </Routes>
  );
}

function ThemedApp() {
  return (
    <NovaThemeProvider>
      <App />
    </NovaThemeProvider>
  );
}

export default ThemedApp;
