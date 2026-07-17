import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  BusinessRounded,
  NotificationsRounded,
  LockRounded,
  SaveRounded,
  SettingsRounded,
} from '@mui/icons-material';
import { Sidebar } from '../components/Sidebar';
import { api } from '../services/api';

type StoredUser = {
  gymName?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

function readUser(): StoredUser {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

export function Settings() {
  const user = useMemo(readUser, []);

  const [gymName, setGymName] = useState(
    user.gymName || 'NovaPlus Fitness',
  );

  const [managerName, setManagerName] = useState(
    user.fullName ||
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      'Salon Yöneticisi',
  );

  const [email, setEmail] = useState(user.email || '');
  const [stockAlerts, setStockAlerts] = useState(true);
  const [membershipAlerts, setMembershipAlerts] = useState(true);
  const [checkInSound, setCheckInSound] = useState(true);
  const [saved, setSaved] = useState(false);

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
    passwordFeedback,
    setPasswordFeedback,
  ] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const save = () => {
    const nextUser = {
      ...user,
      gymName: gymName.trim(),
      fullName: managerName.trim(),
      email: email.trim(),
    };

    localStorage.setItem('user', JSON.stringify(nextUser));
    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  const changePassword = async () => {
    setPasswordFeedback(null);

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setPasswordFeedback({
        type: 'error',
        text:
          'Tüm şifre alanlarını doldurun.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        text:
          'Yeni şifreler birbiriyle eşleşmiyor.',
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordFeedback({
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
      setPasswordFeedback({
        type: 'error',
        text:
          'Yeni şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.',
      });
      return;
    }

    try {
      setChangingPassword(true);

      const response =
        await api.post<{
          message: string;
          requireRelogin?: boolean;
        }>(
          '/auth/change-password',
          {
            currentPassword,
            newPassword,
          },
        );

      setPasswordFeedback({
        type: 'success',
        text: response.data.message,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      window.setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }, 1800);
    } catch (error: unknown) {
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
        requestError.response
          ?.data?.message;

      setPasswordFeedback({
        type: 'error',
        text: Array.isArray(message)
          ? message.join(' ')
          : typeof message ===
              'string'
            ? message
            : 'Şifre güncellenemedi.',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background: 'background.default',
      }}
    >
      <Sidebar />

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: { xs: 2, md: 3 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 4,
            color: 'white',
            background:
              'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 58,
                height: 58,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 3,
                background: 'rgba(255,255,255,0.14)',
              }}
            >
              <SettingsRounded />
            </Box>

            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                Ayarlar
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  color: 'rgba(255,255,255,0.75)',
                }}
              >
                Salon bilgilerini ve bildirim tercihlerini yönetin.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {saved && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Ayarlar kaydedildi. Sidebar’daki bilgiler sayfa yenilendiğinde güncellenir.
          </Alert>
        )}

        <Stack spacing={3}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ mb: 2.5 }}
            >
              <BusinessRounded color="primary" />

              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Salon Bilgileri
              </Typography>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, 1fr)',
                },
                gap: 2,
              }}
            >
              <TextField
                label="Salon Adı"
                value={gymName}
                onChange={(event) => setGymName(event.target.value)}
                fullWidth
              />

              <TextField
                label="Yönetici Adı"
                value={managerName}
                onChange={(event) => setManagerName(event.target.value)}
                fullWidth
              />

              <TextField
                label="E-posta"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                fullWidth
              />
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <NotificationsRounded color="primary" />

              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Bildirim ve Sistem Tercihleri
              </Typography>
            </Stack>

            <Stack divider={<Divider flexItem />}>
              <FormControlLabel
                control={
                  <Switch
                    checked={stockAlerts}
                    onChange={(event) =>
                      setStockAlerts(event.target.checked)
                    }
                  />
                }
                label="Düşük stok uyarılarını göster"
                sx={{ py: 1 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={membershipAlerts}
                    onChange={(event) =>
                      setMembershipAlerts(event.target.checked)
                    }
                  />
                }
                label="Bitecek üyelik uyarılarını göster"
                sx={{ py: 1 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={checkInSound}
                    onChange={(event) =>
                      setCheckInSound(event.target.checked)
                    }
                  />
                }
                label="Başarılı check-in sesini etkinleştir"
                sx={{ py: 1 }}
              />
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ mb: 2.5 }}
            >
              <LockRounded color="primary" />

              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 900,
                  }}
                >
                  Şifre Değiştir
                </Typography>

                <Typography
                  sx={{
                    mt: 0.25,
                    color:
                      'text.secondary',
                    fontSize: 13,
                  }}
                >
                  Hesabınızı korumak için güçlü ve yalnızca size ait bir şifre kullanın.
                </Typography>
              </Box>
            </Stack>

            {passwordFeedback && (
              <Alert
                severity={
                  passwordFeedback.type
                }
                sx={{ mb: 2 }}
                onClose={() =>
                  setPasswordFeedback(
                    null,
                  )
                }
              >
                {passwordFeedback.text}
              </Alert>
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md:
                    'repeat(3, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              <TextField
                label="Mevcut Şifre"
                type="password"
                value={currentPassword}
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
                helperText="En az 8 karakter; büyük harf, küçük harf ve rakam."
                fullWidth
              />

              <TextField
                label="Yeni Şifre Tekrar"
                type="password"
                value={confirmPassword}
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
            </Box>

            <Button
              variant="contained"
              startIcon={
                changingPassword
                  ? undefined
                  : <LockRounded />
              }
              onClick={() => {
                void changePassword();
              }}
              disabled={
                changingPassword
              }
              sx={{
                mt: 2.5,
                px: 3,
                py: 1.15,
                borderRadius: 3,
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
          </Paper>

          <Box>
            <Button
              variant="contained"
              startIcon={<SaveRounded />}
              onClick={save}
              sx={{
                px: 3,
                py: 1.25,
                borderRadius: 3,
              }}
            >
              Ayarları Kaydet
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
