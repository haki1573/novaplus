import {
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

import {
  AdminPanelSettingsRounded,
  LockRounded,
  SaveRounded,
  SettingsRounded,
} from '@mui/icons-material';

import { api } from '../services/api';

type StoredUser = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  role?: string;
};

function readUser(): StoredUser {
  try {
    return JSON.parse(
      localStorage.getItem('user') || '{}',
    ) as StoredUser;
  } catch {
    return {};
  }
}

function getErrorMessage(
  error: unknown,
): string {
  const requestError =
    error as {
      response?: {
        data?: {
          message?:
            | string
            | string[];
        };
      };
    };

  const message =
    requestError.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(' ');
  }

  if (typeof message === 'string') {
    return message;
  }

  return 'İşlem tamamlanamadı.';
}

export function SuperAdminSettings() {
  const user = useMemo(
    readUser,
    [],
  );

  const displayName =
    user.fullName ||
    [
      user.firstName,
      user.lastName,
    ]
      .filter(Boolean)
      .join(' ') ||
    'Süper Admin';

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState('');

  const [
    newPassword,
    setNewPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  const [
    feedback,
    setFeedback,
  ] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const changePassword =
    async () => {
      setFeedback(null);

      if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
      ) {
        setFeedback({
          type: 'error',
          text:
            'Tüm şifre alanlarını doldurun.',
        });
        return;
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        setFeedback({
          type: 'error',
          text:
            'Yeni şifreler birbiriyle eşleşmiyor.',
        });
        return;
      }

      if (
        newPassword.length < 8
      ) {
        setFeedback({
          type: 'error',
          text:
            'Yeni şifre en az 8 karakter olmalıdır.',
        });
        return;
      }

      if (
        !/[A-ZÇĞİÖŞÜ]/.test(
          newPassword,
        ) ||
        !/[a-zçğıöşü]/.test(
          newPassword,
        ) ||
        !/[0-9]/.test(
          newPassword,
        )
      ) {
        setFeedback({
          type: 'error',
          text:
            'Yeni şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.',
        });
        return;
      }

      try {
        setChangingPassword(
          true,
        );

        const response =
          await api.post<{
            message: string;
          }>(
            '/auth/change-password',
            {
              currentPassword,
              newPassword,
            },
          );

        setFeedback({
          type: 'success',
          text:
            response.data.message,
        });

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        window.setTimeout(
          () => {
            localStorage.removeItem(
              'token',
            );
            localStorage.removeItem(
              'user',
            );
            window.location.href =
              '/';
          },
          1800,
        );
      } catch (
        error: unknown
      ) {
        setFeedback({
          type: 'error',
          text:
            getErrorMessage(
              error,
            ),
        });
      } finally {
        setChangingPassword(
          false,
        );
      }
    };

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexDirection: 'row',
          gap: 1.5,
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 2,
            color: '#2563eb',
            backgroundColor:
              '#eff6ff',
          }}
        >
          <SettingsRounded />
        </Box>

        <Box>
          <Typography
            sx={{
              fontSize: {
                xs: 28,
                md: 34,
              },
              fontWeight: 900,
              color: '#101828',
            }}
          >
            Süper Admin Ayarları
          </Typography>

          <Typography
            sx={{
              mt: 0.4,
              color: '#667085',
            }}
          >
            Hesap ve güvenlik bilgilerinizi yönetin.
          </Typography>
        </Box>
      </Box>

      {feedback && (
        <Alert
          severity={
            feedback.type
          }
          sx={{ mb: 3 }}
          onClose={() =>
            setFeedback(null)
          }
        >
          {feedback.text}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg:
              'minmax(0, 0.9fr) minmax(0, 1.1fr)',
          },
          gap: 2.5,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border:
              '1px solid #e8edf3',
          }}
        >
          <Box
            sx={{
              mb: 2.5,
              display: 'flex',
              flexDirection: 'row',
              gap: 1.25,
              alignItems: 'center',
            }}
          >
            <AdminPanelSettingsRounded
              color="primary"
            />

            <Typography
              sx={{
                fontSize: 19,
                fontWeight: 900,
              }}
            >
              Hesap Bilgileri
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <TextField
              label="Ad Soyad"
              value={displayName}
              fullWidth
              disabled
            />

            <TextField
              label="E-posta"
              value={
                user.email || ''
              }
              fullWidth
              disabled
            />

            <TextField
              label="Rol"
              value={
                user.role ||
                'SUPER_ADMIN'
              }
              fullWidth
              disabled
            />
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border:
              '1px solid #e8edf3',
          }}
        >
          <Box
            sx={{
              mb: 2.5,
              display: 'flex',
              flexDirection: 'row',
              gap: 1.25,
              alignItems: 'center',
            }}
          >
            <LockRounded color="primary" />

            <Box>
              <Typography
                sx={{
                  fontSize: 19,
                  fontWeight: 900,
                }}
              >
                Şifre Değiştir
              </Typography>

              <Typography
                sx={{
                  mt: 0.25,
                  color: '#667085',
                  fontSize: 13,
                }}
              >
                Yeni şifre en az 8 karakter; büyük harf, küçük harf ve rakam içermelidir.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <TextField
              label="Mevcut Şifre"
              type="password"
              value={
                currentPassword
              }
              onChange={(event) =>
                setCurrentPassword(
                  event.target.value,
                )
              }
              disabled={
                changingPassword
              }
              autoComplete="current-password"
              fullWidth
            />

            <TextField
              label="Yeni Şifre"
              type="password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(
                  event.target.value,
                )
              }
              disabled={
                changingPassword
              }
              autoComplete="new-password"
              fullWidth
            />

            <TextField
              label="Yeni Şifre Tekrar"
              type="password"
              value={
                confirmPassword
              }
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              disabled={
                changingPassword
              }
              autoComplete="new-password"
              fullWidth
            />

            <Button
              variant="contained"
              startIcon={
                changingPassword
                  ? undefined
                  : <SaveRounded />
              }
              onClick={() => {
                void changePassword();
              }}
              disabled={
                changingPassword
              }
              sx={{
                alignSelf:
                  'flex-start',
                minWidth: 190,
                minHeight: 44,
                textTransform: 'none',
                fontWeight: 800,
              }}
            >
              {changingPassword ? (
                <CircularProgress
                  size={21}
                  color="inherit"
                />
              ) : (
                'Şifreyi Güncelle'
              )}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
