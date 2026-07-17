import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import {
  AccountBalanceWalletRounded,
  AddRounded,
  CreditCardRounded,
  LockRounded,
  PersonAddAlt1Rounded,
  QrCode2Rounded,
  RestaurantRounded,
  SmsRounded,
} from '@mui/icons-material';

import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

type ActionItem = {
  label: string;
  description: string;
  icon: ReactNode;
  color: string;
  background: string;
  path?: string;
  disabled?: boolean;
};

const actions: ActionItem[] = [
  {
    label: 'Yeni Üye',
    description: 'Üye kaydı oluştur',
    icon: <PersonAddAlt1Rounded />,
    color: '#2563eb',
    background: '#eff6ff',
    path: '/members?new=1',
  },
  {
    label: 'Kart Sat',
    description: 'Fiziksel kart ata',
    icon: <CreditCardRounded />,
    color: '#0891b2',
    background: '#ecfeff',
    path: '/access-cards?sale=card',
  },
  {
    label: 'QR Sat',
    description: 'Yeni QR ata',
    icon: <QrCode2Rounded />,
    color: '#7c3aed',
    background: '#f5f3ff',
    path: '/access-cards?sale=qr',
  },
  {
    label: 'Bakiye Yükle',
    description: 'Üye cüzdanını artır',
    icon: <AccountBalanceWalletRounded />,
    color: '#16a34a',
    background: '#f0fdf4',
    path: '/cafe?wallet=1',
  },
  {
    label: 'Kafe Satışı',
    description: 'Ürün satışı yap',
    icon: <RestaurantRounded />,
    color: '#ea580c',
    background: '#fff7ed',
    path: '/cafe?sale=1',
  },
  {
    label: 'SMS Gönder',
    description: 'Toplu veya tekil SMS',
    icon: <SmsRounded />,
    color: '#db2777',
    background: '#fdf2f8',
    disabled: true,
  },
  {
    label: 'Dolap Aç',
    description: 'Akıllı dolap işlemi',
    icon: <LockRounded />,
    color: '#d97706',
    background: '#fffbeb',
    disabled: true,
  },
];

export function QuickActions() {
  const navigate = useNavigate();
  const [comingSoon, setComingSoon] =
    useState<ActionItem | null>(null);

  const handleAction = (
    action: ActionItem,
  ) => {
    if (action.disabled || !action.path) {
      setComingSoon(action);
      return;
    }

    navigate(action.path);
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 4,
          border:
            '1px solid #e2e8f0',
          boxShadow:
            '0 10px 30px rgba(15, 23, 42, 0.06)',
        }}
      >
        <Stack
          direction={{
            xs: 'column',
            sm: 'row',
          }}
          spacing={2}


          sx={{ justifyContent: 'space-between', alignItems: {
            xs: 'stretch',
            sm: 'center',
          }, mb: 2.5 }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 900 }}
            >
              Hızlı İşlemler
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                color: '#64748b',
                fontSize: 14,
              }}
            >
              Günlük işlemlere tek tıkla ulaşın.
            </Typography>
          </Box>

          <Box
            sx={{
              width: 42,
              height: 42,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 3,
              color: '#2563eb',
              background: '#eff6ff',
            }}
          >
            <AddRounded />
          </Box>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              xl: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 1.5,
          }}
        >
          {actions.map((action) => (
            <Button
              key={action.label}
              onClick={() =>
                handleAction(action)
              }
              sx={{
                minHeight: 98,
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                borderRadius: 3,
                textTransform: 'none',
                border:
                  '1px solid #e2e8f0',
                color: '#0f172a',
                background: 'white',
                '&:hover': {
                  transform:
                    'translateY(-2px)',
                  borderColor:
                    action.color,
                  background:
                    action.background,
                  boxShadow:
                    '0 12px 28px rgba(15,23,42,0.08)',
                },
                transition:
                  'all 180ms ease',
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  mb: 1,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 2.5,
                  color: action.color,
                  background:
                    action.background,
                }}
              >
                {action.icon}
              </Box>

              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: 13.5,
                  textAlign: 'left',
                }}
              >
                {action.label}
              </Typography>

              <Typography
                sx={{
                  mt: 0.3,
                  color: '#64748b',
                  fontSize: 11,
                  textAlign: 'left',
                }}
              >
                {action.description}
              </Typography>
            </Button>
          ))}
        </Box>
      </Paper>

      <Dialog
        open={Boolean(comingSoon)}
        onClose={() =>
          setComingSoon(null)
        }
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{ fontWeight: 900 }}
        >
          {comingSoon?.label}
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color: '#64748b',
              lineHeight: 1.7,
            }}
          >
            Bu özellik Sprint 3 kapsamında aktif hale gelecek.
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}
