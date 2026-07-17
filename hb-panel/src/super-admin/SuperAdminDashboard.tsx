import {
  ApartmentRounded,
  AutoAwesomeRounded,
  BlockRounded,
  ChevronRightRounded,
  CreditCardRounded,
  GroupsRounded,
  SmsRounded,
  TrendingUpRounded,
  VerifiedRounded,
} from '@mui/icons-material';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Typography,
} from '@mui/material';

import {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import { api } from '../services/api';

type GymRow = {
  id: string;
  name: string;
  city: string | null;
  subscriptionPlan: string;
  licenseStatus: string;
  licenseEndDate: string | null;
  daysRemaining: number | null;
  isActive: boolean;
  memberCount: number;
  userCount: number;
  smsBalance: number;
  cardAvailable: number;
  qrAvailable: number;
  cardTotal: number;
  qrTotal: number;
  riskCount: number;
  risks: string[];
  createdAt: string;
};

type CloudDashboard = {
  generatedAt: string;

  summary: {
    totalGyms: number;
    activeGyms: number;
    totalMembers: number;
    totalUsers: number;
    riskyGyms: number;
    expiringGyms: number;
    totalCardAvailable: number;
    totalQrAvailable: number;
    totalSmsBalance: number;
    monthlySaasRevenue: number;
  };

  topGyms: GymRow[];
  riskyGyms: GymRow[];
  expiringGyms: GymRow[];
  recentGyms: GymRow[];
  recommendations: string[];
};

function formatMoney(
  value: number,
) {
  return new Intl.NumberFormat(
    'tr-TR',
    {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    },
  ).format(
    Number(value) || 0,
  );
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return 'Süresiz';
  }

  return new Date(
    value,
  ).toLocaleDateString(
    'tr-TR',
  );
}

export function SuperAdminDashboard() {
  const navigate =
    useNavigate();

  const [data, setData] =
    useState<
      CloudDashboard | null
    >(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const response =
          await api.get<CloudDashboard>(
            '/super-admin/cloud-dashboard',
          );

        setData(response.data);
      } catch {
        setError(
          'Cloud dashboard bilgileri alınamadı.',
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          py: 10,
          display: 'flex',
          justifyContent:
            'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Alert severity="error">
        {error ||
          'Dashboard bilgisi bulunamadı.'}
      </Alert>
    );
  }

  const cards = [
    {
      title: 'Toplam Salon',
      value:
        data.summary.totalGyms,
      subtitle:
        `${data.summary.activeGyms} aktif`,
      icon:
        <ApartmentRounded />,
    },
    {
      title: 'Toplam Üye',
      value:
        data.summary.totalMembers,
      subtitle:
        'Tüm salonlar',
      icon:
        <GroupsRounded />,
    },
    {
      title: 'Aylık SaaS Geliri',
      value:
        formatMoney(
          data.summary
            .monthlySaasRevenue,
        ),
      subtitle:
        'Lisans ödemeleri',
      icon:
        <TrendingUpRounded />,
    },
    {
      title: 'Riskli Salon',
      value:
        data.summary.riskyGyms,
      subtitle:
        `${data.summary.expiringGyms} lisans yaklaşıyor`,
      icon:
        <BlockRounded />,
    },
    {
      title: 'Kart Stoğu',
      value:
        data.summary
          .totalCardAvailable,
      subtitle:
        'Salonlardaki kullanılabilir',
      icon:
        <CreditCardRounded />,
    },
    {
      title: 'QR Stoğu',
      value:
        data.summary
          .totalQrAvailable,
      subtitle:
        'Salonlardaki kullanılabilir',
      icon:
        <VerifiedRounded />,
    },
    {
      title: 'Toplam SMS',
      value:
        data.summary
          .totalSmsBalance,
      subtitle:
        'Salon bakiyeleri',
      icon:
        <SmsRounded />,
    },
    {
      title: 'Toplam Kullanıcı',
      value:
        data.summary.totalUsers,
      subtitle:
        'Yönetici ve personel',
      icon:
        <GroupsRounded />,
    },
  ];

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexDirection: {
            xs: 'column',
            md: 'row',
          },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
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
            NovaPlus+ Kontrol Merkezi
          </Typography>

          <Typography
            sx={{
              mt: 0.6,
              color: '#667085',
            }}
          >
            Tüm salonların üyelik, lisans, stok ve satış durumunu tek ekrandan yönetin.
          </Typography>
        </Box>

        <Chip
          color="success"
          variant="outlined"
          label="Sistem Aktif"
          sx={{
            alignSelf: {
              xs: 'flex-start',
              md: 'center',
            },
            fontWeight: 800,
          }}
        />
      </Box>

      {error && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm:
              'repeat(2, minmax(0, 1fr))',
            lg:
              'repeat(4, minmax(0, 1fr))',
          },
          gap: 2,
          mb: 3,
        }}
      >
        {cards.map((card) => (
          <Card
            key={card.title}
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
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      color: '#667085',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {card.title}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.7,
                      fontSize: 27,
                      fontWeight: 900,
                    }}
                  >
                    {card.value}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.3,
                      color: '#98a2b3',
                      fontSize: 11,
                    }}
                  >
                    {card.subtitle}
                  </Typography>
                </Box>

                <Avatar
                  sx={{
                    bgcolor: '#eff6ff',
                    color: '#1468f3',
                  }}
                >
                  {card.icon}
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            xl:
              'repeat(2, minmax(0, 1fr))',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <OperationCard
          title="En Büyük Salonlar"
          subtitle="Üye sayısına göre sıralama"
        >
          {data.topGyms.map(
            (gym, index) => (
              <GymLine
                key={gym.id}
                gym={gym}
                prefix={`${index + 1}.`}
                value={`${gym.memberCount} üye`}
                onClick={() =>
                  navigate(
                    `/super-admin/gyms/${gym.id}`,
                  )
                }
              />
            ),
          )}
        </OperationCard>

        <OperationCard
          title="Riskli Salonlar"
          subtitle="Müdahale gerektiren operasyonlar"
        >
          {data.riskyGyms.map(
            (gym) => (
              <Box
                key={gym.id}
                onClick={() =>
                  navigate(
                    `/super-admin/gyms/${gym.id}`,
                  )
                }
                sx={{
                  p: 1.4,
                  mb: 1,
                  borderRadius: 2,
                  bgcolor: '#fff7ed',
                  border:
                    '1px solid #fed7aa',
                  cursor: 'pointer',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 850,
                      }}
                    >
                      {gym.name}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.35,
                        color: '#9a3412',
                        fontSize: 12,
                      }}
                    >
                      {gym.risks
                        .slice(0, 2)
                        .join(' · ')}
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    color="warning"
                    label={`${gym.riskCount} risk`}
                  />
                </Box>
              </Box>
            ),
          )}

          {data.riskyGyms.length ===
            0 && (
            <Alert severity="success">
              Riskli salon bulunmuyor.
            </Alert>
          )}
        </OperationCard>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            xl:
              'repeat(2, minmax(0, 1fr))',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <OperationCard
          title="Lisansı Yakında Bitecekler"
          subtitle="Önümüzdeki 30 gün"
        >
          {data.expiringGyms.map(
            (gym) => (
              <GymLine
                key={gym.id}
                gym={gym}
                value={`${gym.daysRemaining} gün`}
                action="Lisansı Aç"
                onClick={() =>
                  navigate(
                    `/super-admin/gyms/${gym.id}/license`,
                  )
                }
              />
            ),
          )}

          {data.expiringGyms.length ===
            0 && (
            <Alert severity="success">
              Yakında bitecek lisans bulunmuyor.
            </Alert>
          )}
        </OperationCard>

        <OperationCard
          title="Son Eklenen Salonlar"
          subtitle="En yeni NovaPlus+ müşterileri"
        >
          {data.recentGyms.map(
            (gym) => (
              <GymLine
                key={gym.id}
                gym={gym}
                value={formatDate(
                  gym.createdAt,
                )}
                onClick={() =>
                  navigate(
                    `/super-admin/gyms/${gym.id}`,
                  )
                }
              />
            ),
          )}
        </OperationCard>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 2,
          border:
            '1px solid #bfdbfe',
          bgcolor: '#eff6ff',
        }}
      >
        <Box
          sx={{
            mb: 1.5,
            display: 'flex',
            flexDirection: 'row',
            gap: 1,
            alignItems: 'center',
          }}
        >
          <AutoAwesomeRounded
            sx={{ color: '#2563eb' }}
          />

          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 900,
              color: '#1d4ed8',
            }}
          >
            Nova AI Operasyon Özeti
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {data.recommendations.map(
            (item) => (
              <Box
                key={item}
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: '#ffffff',
                  border:
                    '1px solid #dbeafe',
                }}
              >
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {item}
                </Typography>
              </Box>
            ),
          )}
        </Box>
      </Paper>
    </Box>
  );
}

function OperationCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children:
    React.ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        borderRadius: 2,
        border:
          '1px solid #e8edf3',
      }}
    >
      <Typography
        sx={{
          fontSize: 18,
          fontWeight: 900,
        }}
      >
        {title}
      </Typography>

      <Typography
        sx={{
          mt: 0.3,
          mb: 1.7,
          color: '#98a2b3',
          fontSize: 12,
        }}
      >
        {subtitle}
      </Typography>

      {children}
    </Paper>
  );
}

function GymLine({
  gym,
  prefix,
  value,
  action,
  onClick,
}: {
  gym: GymRow;
  prefix?: string;
  value: string;
  action?: string;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        py: 1.2,
        cursor: 'pointer',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 1.2,
        }}
      >
        {prefix && (
          <Typography
            sx={{
              width: 24,
              fontWeight: 900,
              color: '#1468f3',
            }}
          >
            {prefix}
          </Typography>
        )}

        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontWeight: 850,
            }}
          >
            {gym.name}
          </Typography>

          <Typography
            sx={{
              mt: 0.2,
              color: '#98a2b3',
              fontSize: 11,
            }}
          >
            {gym.city ||
              'Şehir belirtilmedi'}{' '}
            · {gym.subscriptionPlan}
          </Typography>
        </Box>

        <Typography
          sx={{
            color: '#475467',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {value}
        </Typography>

        {action && (
          <Button
            size="small"
            endIcon={
              <ChevronRightRounded />
            }
          >
            {action}
          </Button>
        )}
      </Box>

      <Divider sx={{ mt: 1.2 }} />
    </Box>
  );
}
