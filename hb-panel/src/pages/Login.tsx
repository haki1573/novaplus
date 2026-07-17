import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { api } from '../services/api';

type Language = 'tr' | 'en';

export function Login() {
  const [language, setLanguage] = useState<Language>('tr');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const sessionExpired =
      sessionStorage.getItem(
        'sessionExpired',
      );

    if (
      sessionExpired ===
      'true'
    ) {
      sessionStorage.removeItem(
        'sessionExpired',
      );

      setLoginError(
        language === 'tr'
          ? 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.'
          : 'Your session has expired. Please log in again.',
      );
    }
  }, []);

  const text = {
    tr: {
      title: 'NovaPlus+ GYM',
      subtitle: 'Spor Salonu Yönetim Sistemi',
      email: 'E-posta',
      password: 'Şifre',
      login: 'Giriş Yap',
      language: 'Dil',
      error: 'Giriş başarısız!',
    },
    en: {
      title: 'NovaPlus+ GYM',
      subtitle: 'Gym Management System',
      email: 'Email',
      password: 'Password',
      login: 'Login',
      language: 'Language',
      error: 'Login failed!',
    },
  };

  const t = text[language];

  const handleLogin = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setLoginError('');

      const response = await api.post('/auth/login', {
        email,
        password,
      });

      console.log('LOGIN RESPONSE:', response.data);

      const token =
        response.data.access_token ||
        response.data.accessToken ||
        response.data.token;

      if (!token) {
        alert('Token bulunamadı!');
        console.log(response.data);
        return;
      }

      localStorage.setItem('token', token);

      sessionStorage.removeItem(
        'sessionExpired',
      );

      if (response.data.user) {
        localStorage.setItem(
          'user',
          JSON.stringify(
            response.data.user,
          ),
        );
      }

      window.location.reload();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        t.error;

      setLoginError(
        Array.isArray(message)
          ? message.join(', ')
          : String(message),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg,#0f172a,#1e293b)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Card sx={{ width: 420, borderRadius: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <TextField
              select
              size="small"
              label={t.language}
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              sx={{ width: 140 }}
            >
              <MenuItem value="tr">Türkçe</MenuItem>
              <MenuItem value="en">English</MenuItem>
            </TextField>
          </Box>

          <Typography
            variant="h3"
            sx={{ fontWeight: 'bold', textAlign: 'center' }}
          >
            {t.title}
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ textAlign: 'center', mb: 4 }}
          >
            {t.subtitle}
          </Typography>

          <TextField
            fullWidth
            label={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(event) => {
              if (
                event.key ===
                'Enter'
              ) {
                void handleLogin();
              }
            }}
            autoComplete="email"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            type="password"
            label={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(event) => {
              if (
                event.key ===
                'Enter'
              ) {
                void handleLogin();
              }
            }}
            autoComplete="current-password"
            sx={{ mb: 3 }}
          />

          {loginError && (
            <Typography
              sx={{
                mb: 2,
                color: 'error.main',
                fontSize: 13,
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              {loginError}
            </Typography>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            onClick={handleLogin}
          >
            {loading ? 'Giriş yapılıyor...' : t.login}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}