import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
} from '@mui/material';

import {
  CheckCircleRounded,
  LockRounded,
} from '@mui/icons-material';

import { useState } from 'react';
import type { FormEvent } from 'react';

import { api } from '../services/api';

interface SetupProps {
  onCompleted: () => void;
}

interface SetupForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordAgain: string;
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string | string[];
          };
        };
      }
    ).response;

    const message =
      response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return 'Kurulum sırasında bir hata oluştu.';
}

export function Setup({
  onCompleted,
}: SetupProps) {
  const [form, setForm] =
    useState<SetupForm>({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      passwordAgain: '',
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState(false);

  const updateField = (
    field: keyof SetupForm,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError('');

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.trim() ||
      !form.password
    ) {
      setError(
        'Lütfen bütün zorunlu alanları doldurun.',
      );

      return;
    }

    if (
      form.password !==
      form.passwordAgain
    ) {
      setError(
        'Şifreler birbiriyle eşleşmiyor.',
      );

      return;
    }

    if (form.password.length < 8) {
      setError(
        'Şifre en az 8 karakter olmalıdır.',
      );

      return;
    }

    try {
      setLoading(true);

      await api.post(
        '/setup/initialize',
        {
          firstName:
            form.firstName.trim(),
          lastName:
            form.lastName.trim(),
          email:
            form.email
              .trim()
              .toLowerCase(),
          password: form.password,
        },
      );

      setSuccess(true);

      window.setTimeout(() => {
        onCompleted();
      }, 1500);
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(requestError),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
        background:
          'radial-gradient(circle at top right, #123a78 0%, #071831 35%, #020817 100%)',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 540,
        }}
      >
        <Box
          sx={{
            mb: 3,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Box
            component="img"
            src="/novaplus-logo.jpg"
            alt="NovaPlus"
            sx={{
              width: '100%',
              maxWidth: 310,
              height: 120,
              objectFit: 'contain',
              borderRadius: 3,
              backgroundColor: '#ffffff',
              px: 2,
              py: 1,
              boxShadow:
                '0 18px 50px rgba(0,0,0,0.28)',
            }}
          />
        </Box>

        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            boxShadow:
              '0 25px 70px rgba(0,0,0,0.30)',
          }}
        >
          <CardContent
            sx={{
              p: {
                xs: 3,
                sm: 4,
              },
            }}
          >
            <Box
              sx={{
                mb: 3,
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  width: 58,
                  height: 58,
                  mx: 'auto',
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 3,
                  color: '#1468f3',
                  backgroundColor: '#eaf1ff',
                }}
              >
                <LockRounded />
              </Box>

              <Box
                component="h1"
                sx={{
                  m: 0,
                  fontSize: {
                    xs: 25,
                    sm: 30,
                  },
                  fontWeight: 800,
                  color: '#101828',
                }}
              >
                NovaPlus+ İlk Kurulum
              </Box>

              <Box
                component="p"
                sx={{
                  mt: 1,
                  mb: 0,
                  color: '#667085',
                  lineHeight: 1.6,
                }}
              >
                Sistemin sahibi olacak ilk
                Süper Admin hesabını oluşturun.
              </Box>
            </Box>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2.5 }}
              >
                {error}
              </Alert>
            )}

            {success ? (
              <Alert
                severity="success"
                icon={
                  <CheckCircleRounded />
                }
              >
                Kurulum başarıyla tamamlandı.
                Giriş ekranına yönlendiriliyorsunuz.
              </Alert>
            ) : (
              <Box
                component="form"
                onSubmit={handleSubmit}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(0, 1fr))',
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Ad"
                    value={form.firstName}
                    onChange={(event) =>
                      updateField(
                        'firstName',
                        event.target.value,
                      )
                    }
                    disabled={loading}
                    fullWidth
                    required
                  />

                  <TextField
                    label="Soyad"
                    value={form.lastName}
                    onChange={(event) =>
                      updateField(
                        'lastName',
                        event.target.value,
                      )
                    }
                    disabled={loading}
                    fullWidth
                    required
                  />
                </Box>

                <TextField
                  label="E-posta"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      'email',
                      event.target.value,
                    )
                  }
                  disabled={loading}
                  fullWidth
                  required
                  sx={{ mt: 2 }}
                />

                <TextField
                  label="Şifre"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    updateField(
                      'password',
                      event.target.value,
                    )
                  }
                  disabled={loading}
                  fullWidth
                  required
                  helperText="En az 8 karakter; büyük harf, küçük harf ve rakam içermelidir."
                  sx={{ mt: 2 }}
                />

                <TextField
                  label="Şifre Tekrar"
                  type="password"
                  value={form.passwordAgain}
                  onChange={(event) =>
                    updateField(
                      'passwordAgain',
                      event.target.value,
                    )
                  }
                  disabled={loading}
                  fullWidth
                  required
                  sx={{ mt: 2 }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  sx={{
                    mt: 3,
                    py: 1.35,
                    borderRadius: 2,
                    fontWeight: 800,
                    textTransform: 'none',
                    backgroundColor: '#1468f3',

                    '&:hover': {
                      backgroundColor:
                        '#0d59d9',
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress
                      size={24}
                      sx={{
                        color: '#ffffff',
                      }}
                    />
                  ) : (
                    'Sistemi Kur'
                  )}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        <Box
          component="div"
          sx={{
            mt: 2.5,
            textAlign: 'center',
            fontSize: 12,
            color:
              'rgba(255,255,255,0.65)',
          }}
        >
          NovaPlus+ Spor Salonu Yönetim
          Sistemi
        </Box>
      </Box>
    </Box>
  );
}