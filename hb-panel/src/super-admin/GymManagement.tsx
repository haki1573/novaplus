import {
  ArrowBackRounded,
  BadgeRounded,
  CalendarMonthRounded,
  CreditCardRounded,
  GroupsRounded,
  LocationOnRounded,
  MailRounded,
  PaymentsRounded,
  PhoneRounded,
  QrCodeRounded,
  StoreRounded,
  VerifiedRounded,
} from '@mui/icons-material';

import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';

import {
  useEffect,
  useState,
} from 'react';

import type { ReactNode } from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import { api } from '../services/api';

interface Gym {
  id: string;
  name: string;
  slug: string;
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  subscriptionPlan: string;
  licenseStartDate: string | null;
  licenseEndDate: string | null;
  isActive: boolean;
  logoUrl: string | null;
  memberCount: number;
  userCount: number;
}

interface ErrorResponse {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  const requestError =
    error as ErrorResponse;

  const message =
    requestError.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(' ');
  }

  if (typeof message === 'string') {
    return message;
  }

  return fallbackMessage;
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return 'Süresiz';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Geçersiz tarih';
  }

  return date.toLocaleDateString(
    'tr-TR',
  );
}

function getLicenseStatus(
  licenseEndDate: string | null,
): {
  label: string;
  severity:
    | 'success'
    | 'warning'
    | 'error'
    | 'default';
} {
  if (!licenseEndDate) {
    return {
      label: 'Süresiz lisans',
      severity: 'success',
    };
  }

  const endDate =
    new Date(licenseEndDate);

  if (Number.isNaN(endDate.getTime())) {
    return {
      label: 'Geçersiz lisans tarihi',
      severity: 'error',
    };
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const remainingDays = Math.ceil(
    (endDate.getTime() -
      today.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (remainingDays < 0) {
    return {
      label: 'Lisans süresi doldu',
      severity: 'error',
    };
  }

  if (remainingDays === 0) {
    return {
      label: 'Lisans bugün bitiyor',
      severity: 'error',
    };
  }

  if (remainingDays <= 15) {
    return {
      label: `${remainingDays} gün kaldı`,
      severity: 'error',
    };
  }

  if (remainingDays <= 30) {
    return {
      label: `${remainingDays} gün kaldı`,
      severity: 'warning',
    };
  }

  return {
    label: `${remainingDays} gün kaldı`,
    severity: 'success',
  };
}

export function GymManagement() {
  const navigate = useNavigate();

  const { gymId } =
    useParams<{
      gymId: string;
    }>();

  const [gym, setGym] =
    useState<Gym | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    const loadGym =
      async (): Promise<void> => {
        if (!gymId) {
          setError(
            'Spor salonu kimliği bulunamadı.',
          );
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setError('');

          const response =
            await api.get<Gym[]>(
              '/super-admin/gyms',
            );

          const selectedGym =
            response.data.find(
              (item) =>
                String(item.id) ===
                String(gymId),
            );

          if (!selectedGym) {
            setError(
              'Spor salonu bulunamadı.',
            );
            return;
          }

          setGym(selectedGym);
        } catch (requestError: unknown) {
          setError(
            getErrorMessage(
              requestError,
              'Spor salonu bilgileri alınamadı.',
            ),
          );
        } finally {
          setLoading(false);
        }
      };

    void loadGym();
  }, [gymId]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !gym) {
    return (
      <Box>
        <Button
          startIcon={
            <ArrowBackRounded />
          }
          onClick={() =>
            navigate(
              '/super-admin/gyms',
            )
          }
          sx={{
            mb: 2,
            textTransform: 'none',
            fontWeight: 700,
          }}
        >
          Spor Salonlarına Dön
        </Button>

        <Alert severity="error">
          {error ||
            'Spor salonu bulunamadı.'}
        </Alert>
      </Box>
    );
  }

  const licenseStatus =
    getLicenseStatus(
      gym.licenseEndDate,
    );

  const openModule = (
    modulePath: string,
  ): void => {
    navigate(
      `/super-admin/gyms/${gym.id}/${modulePath}`,
    );
  };

  return (
    <Box>
      <Button
        startIcon={<ArrowBackRounded />}
        onClick={() =>
          navigate('/super-admin/gyms')
        }
        sx={{
          mb: 2,
          textTransform: 'none',
          fontWeight: 700,
        }}
      >
        Spor Salonlarına Dön
      </Button>

      <Card
        elevation={0}
        sx={{
          border:
            '1px solid #e8edf3',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: {
              xs: 2.5,
              md: 3.5,
            },
            py: 3,
            color: '#101828',
            background: '#ffffff',
            borderBottom: '1px solid #e8edf3',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: {
                xs: 'flex-start',
                sm: 'center',
              },
              flexDirection: {
                xs: 'column',
                sm: 'row',
              },
              gap: 2,
            }}
          >
            <Box>
              <Box
                component="h1"
                sx={{
                  m: 0,
                  fontSize: {
                    xs: 27,
                    md: 34,
                  },
                  lineHeight: 1.2,
                  fontWeight: 800,
                }}
              >
                {gym.name}
              </Box>

              <Box
                sx={{
                  mt: 0.8,
                  color: '#667085',
                }}
              >
                Salon yönetim ve kontrol
                merkezi
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Chip
                icon={
                  <VerifiedRounded />
                }
                label={
                  gym.isActive
                    ? 'Aktif Salon'
                    : 'Pasif Salon'
                }
                color={
                  gym.isActive
                    ? 'success'
                    : 'default'
                }
                sx={{ fontWeight: 700 }}
              />

              <Chip
                label={
                  licenseStatus.label
                }
                color={
                  licenseStatus.severity
                }
                sx={{ fontWeight: 700 }}
              />
            </Box>
          </Box>
        </Box>

        <CardContent
          sx={{
            p: {
              xs: 2.5,
              md: 3.5,
            },
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            <StatCard
              title="Toplam Üye"
              value={String(
                gym.memberCount ?? 0,
              )}
              icon={<GroupsRounded />}
            />

            <StatCard
              title="Kullanıcı"
              value={String(
                gym.userCount ?? 0,
              )}
              icon={<BadgeRounded />}
            />

            <StatCard
              title="Abonelik Paketi"
              value={gym.subscriptionPlan}
              icon={
                <CreditCardRounded />
              }
            />

            <StatCard
              title="Salon Durumu"
              value={
                gym.isActive
                  ? 'Aktif'
                  : 'Pasif'
              }
              icon={
                <VerifiedRounded />
              }
            />
          </Box>

          <Box
            component="h2"
            sx={{
              mt: 4,
              mb: 2,
              fontSize: 20,
              fontWeight: 800,
              color: '#101828',
            }}
          >
            Salon Bilgileri
          </Box>

          <Card
            elevation={0}
            sx={{
              border:
                '1px solid #e8edf3',
              borderRadius: 2,
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, minmax(0, 1fr))',
                  },
                  gap: 2,
                }}
              >
                <DetailItem
                  icon={<StoreRounded />}
                  label="Salon sahibi"
                  value={
                    gym.ownerName ||
                    'Belirtilmedi'
                  }
                />

                <DetailItem
                  icon={
                    <LocationOnRounded />
                  }
                  label="Şehir"
                  value={
                    gym.city ||
                    'Belirtilmedi'
                  }
                />

                <DetailItem
                  icon={<MailRounded />}
                  label="E-posta"
                  value={
                    gym.email ||
                    'Belirtilmedi'
                  }
                />

                <DetailItem
                  icon={<PhoneRounded />}
                  label="Telefon"
                  value={
                    gym.phone ||
                    'Belirtilmedi'
                  }
                />

                <DetailItem
                  icon={
                    <CalendarMonthRounded />
                  }
                  label="Lisans başlangıç"
                  value={formatDate(
                    gym.licenseStartDate,
                  )}
                />

                <DetailItem
                  icon={
                    <CalendarMonthRounded />
                  }
                  label="Lisans bitiş"
                  value={formatDate(
                    gym.licenseEndDate,
                  )}
                />
              </Box>

              <Divider sx={{ my: 2.5 }} />

              <DetailItem
                icon={
                  <LocationOnRounded />
                }
                label="Adres"
                value={
                  gym.address ||
                  'Adres belirtilmedi'
                }
              />
            </CardContent>
          </Card>

          <Box
            component="h2"
            sx={{
              mt: 4,
              mb: 2,
              fontSize: 20,
              fontWeight: 800,
              color: '#101828',
            }}
          >
            Yönetim Modülleri
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            <ModuleCard
              title="Üyeler"
              description="Salona bağlı üyeleri görüntüleyin ve yönetin."
              icon={<GroupsRounded />}
              onClick={() =>
                openModule('members')
              }
            />

            <ModuleCard
              title="Finans"
              description="Salonun gelir ve gider hareketlerini inceleyin."
              icon={<PaymentsRounded />}
              onClick={() =>
                openModule('finance')
              }
            />

            <ModuleCard
              title="QR ve Kartlar"
              description="Salona ait QR ve giriş kartlarını yönetin."
              icon={<QrCodeRounded />}
              onClick={() =>
                openModule('cards')
              }
            />

            <ModuleCard
              title="Personeller"
              description="Salon yöneticilerini ve personellerini yönetin."
              icon={<BadgeRounded />}
              onClick={() =>
                openModule('staff')
              }
            />

            <ModuleCard
              title="Paketler"
              description="Salonun üyelik paketlerini görüntüleyin."
              icon={
                <CreditCardRounded />
              }
              onClick={() =>
                openModule('packages')
              }
            />

            <ModuleCard
              title="Lisans Yönetimi"
              description="Salon lisansını uzatın veya paketini değiştirin."
              icon={
                <CalendarMonthRounded />
              }
              onClick={() =>
                openModule('license')
              }
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
}

function StatCard({
  title,
  value,
  icon,
}: StatCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid #e8edf3',
        borderRadius: 2.5,
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Box
              sx={{
                fontSize: 13,
                color: '#667085',
              }}
            >
              {title}
            </Box>

            <Box
              sx={{
                mt: 0.6,
                fontSize: 22,
                fontWeight: 800,
                color: '#101828',
              }}
            >
              {value}
            </Box>
          </Box>

          <Box
            sx={{
              width: 46,
              height: 46,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2,
              color: '#1468f3',
              backgroundColor: '#eaf1ff',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

interface DetailItemProps {
  icon: ReactNode;
  label: string;
  value: string;
}

function DetailItem({
  icon,
  label,
  value,
}: DetailItemProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          mt: 0.2,
          color: '#1468f3',
        }}
      >
        {icon}
      </Box>

      <Box>
        <Box
          sx={{
            fontSize: 13,
            color: '#667085',
          }}
        >
          {label}
        </Box>

        <Box
          sx={{
            mt: 0.3,
            fontWeight: 700,
            color: '#101828',
            overflowWrap: 'anywhere',
          }}
        >
          {value}
        </Box>
      </Box>
    </Box>
  );
}

interface ModuleCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}

function ModuleCard({
  title,
  description,
  icon,
  onClick,
}: ModuleCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid #e8edf3',
        borderRadius: 2,
        overflow: 'hidden',
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease',

        '&:hover': {
          transform:
            'translateY(-2px)',
          boxShadow:
            '0 12px 25px rgba(16,24,40,0.08)',
        },
      }}
    >
      <CardActionArea
        onClick={onClick}
        sx={{
          height: '100%',
          p: 0,
          textAlign: 'left',
        }}
      >
        <CardContent>
          <Box
            sx={{
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2.5,
              color: '#1468f3',
              backgroundColor: '#eaf1ff',
            }}
          >
            {icon}
          </Box>

          <Box
            component="h3"
            sx={{
              mt: 2,
              mb: 0,
              fontSize: 17,
              fontWeight: 800,
              color: '#101828',
            }}
          >
            {title}
          </Box>

          <Box
            sx={{
              mt: 0.8,
              minHeight: 42,
              fontSize: 14,
              lineHeight: 1.5,
              color: '#667085',
            }}
          >
            {description}
          </Box>

          <Box
            sx={{
              mt: 2,
              fontSize: 14,
              fontWeight: 800,
              color: '#1468f3',
            }}
          >
            Modülü Aç →
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
