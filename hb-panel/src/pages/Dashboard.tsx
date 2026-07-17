import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AccountBalanceWalletRounded,
  AddRounded,
  BadgeRounded,
  CheckCircleRounded,
  ChevronRightRounded,
  CreditCardRounded,
  NotificationsRounded,
  PeopleAltRounded,
  PointOfSaleRounded,
  RestaurantRounded,
  SendRounded,
  SmartToyRounded,
  WarningAmberRounded,
} from '@mui/icons-material';

import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';

import { useNavigate } from 'react-router-dom';

import { Sidebar } from '../components/Sidebar';
import { GlobalSearch } from '../components/GlobalSearch';
import { QuickActions } from '../components/QuickActions';
import { api } from '../services/api';

type Member = {
  id: number;
  fullName: string;
};

type CheckInLog = {
  id: number;
  checkInTime: string;
  accessType?: 'CARD' | 'QR';
  member?: Member;
};

type DailyFinance = {
  date: string;
  label: string;
  income: number;
  expense: number;
};

type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  passiveMembers: number;
  totalCheckIns: number;
  todayCheckIns: number;
  expiringMemberships: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyBalance: number;
  recentCheckIns: CheckInLog[];
};

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  severity:
    | 'INFO'
    | 'WARNING'
    | 'CRITICAL';
  isRead: boolean;
  actionPath?: string | null;
};

type DashboardOverview = {
  stats: DashboardStats;
  dailyFinance: DailyFinance[];
  notifications: NotificationItem[];
  notificationSummary: {
    total: number;
    unread: number;
    critical: number;
    warning: number;
  };
  lockerSummary: {
    total: number;
    available: number;
    occupied: number;
    outOfService: number;
  };
  walletCafeSummary: {
    cafe: {
      lowStockProducts: number;
      totalStock: number;
    };
  };
  novaBriefing: {
    summary: {
      expiringMembers: number;
      inactiveMembers: number;
      todayIncome: number;
      todayExpense: number;
    };
  } | null;
  staffInsideCount: number;
  todayCafe: {
    salesCount: number;
    revenue: number;
  };
};

type StoredUser = {
  firstName?: string;
  fullName?: string;
  gym?: {
    name?: string;
  } | null;
};

const emptyStats: DashboardStats = {
  totalMembers: 0,
  activeMembers: 0,
  passiveMembers: 0,
  totalCheckIns: 0,
  todayCheckIns: 0,
  expiringMemberships: 0,
  monthlyIncome: 0,
  monthlyExpense: 0,
  monthlyBalance: 0,
  recentCheckIns: [],
};

function readUser(): StoredUser {
  try {
    const raw =
      localStorage.getItem('user');

    return raw
      ? JSON.parse(raw)
      : {};
  } catch {
    return {};
  }
}

export function Dashboard() {
  const navigate = useNavigate();
  const user = useMemo(readUser, []);

  const firstName =
    user.firstName ||
    user.fullName?.split(' ')[0] ||
    'Yönetici';

  const gymName =
    user.gym?.name ||
    'Spor Salonu';

  const [overview, setOverview] =
    useState<DashboardOverview | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [clock, setClock] =
    useState(new Date());

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const response =
          await api.get<DashboardOverview>(
            '/dashboard/overview',
          );

        setOverview(response.data);
        setError('');
      } catch {
        setError(
          'Dashboard verileri alınamadı.',
        );
      } finally {
        setLoading(false);
      }
    };

    void load();

    const refresh =
      window.setInterval(
        () => void load(),
        60000,
      );

    const timer =
      window.setInterval(
        () =>
          setClock(new Date()),
        1000,
      );

    return () => {
      window.clearInterval(
        refresh,
      );
      window.clearInterval(
        timer,
      );
    };
  }, []);

  const formatMoney = (
    value: number,
  ) =>
    new Intl.NumberFormat(
      'tr-TR',
      {
        style: 'currency',
        currency: 'TRY',
        maximumFractionDigits: 0,
      },
    ).format(
      Number(value) || 0,
    );

  const stats =
    overview?.stats ||
    emptyStats;

  const todayIncome =
    overview?.novaBriefing
      ?.summary.todayIncome || 0;

  const todayExpense =
    overview?.novaBriefing
      ?.summary.todayExpense || 0;

  const attentionItems = [
    {
      label:
        'Üyeliği 7 gün içinde bitecek',
      value:
        overview?.novaBriefing
          ?.summary.expiringMembers ||
        stats.expiringMemberships,
      path: '/members',
    },
    {
      label:
        'Uzun süredir gelmeyen üye',
      value:
        overview?.novaBriefing
          ?.summary.inactiveMembers ||
        0,
      path: '/members',
    },
    {
      label:
        'Kafe düşük stok',
      value:
        overview
          ?.walletCafeSummary
          .cafe
          .lowStockProducts || 0,
      path: '/cafe',
    },
    {
      label:
        'Arızalı dolap',
      value:
        overview
          ?.lockerSummary
          .outOfService || 0,
      path: '/lockers',
    },
  ];

  const novaInsights = [
    stats.todayCheckIns > 0
      ? `Bugün ${stats.todayCheckIns} üye girişi kaydedildi.`
      : 'Bugün henüz üye girişi kaydedilmedi.',
    todayIncome > 0
      ? `Bugünkü toplam gelir ${formatMoney(todayIncome)}.`
      : 'Bugün henüz gelir kaydı oluşmadı.',
    (overview?.todayCafe.salesCount || 0) > 0
      ? `Nova Café'de ${overview?.todayCafe.salesCount || 0} satış yapıldı.`
      : 'Nova Café bugün henüz satış yapmadı.',
    (
      overview?.novaBriefing
        ?.summary.expiringMembers ||
      stats.expiringMemberships
    ) > 0
      ? `${
          overview?.novaBriefing
            ?.summary.expiringMembers ||
          stats.expiringMemberships
        } üyeliğin süresi 7 gün içinde dolacak.`
      : 'Yakında bitecek üyelik görünmüyor.',
    overview?.walletCafeSummary.cafe.lowStockProducts
      ? `${overview.walletCafeSummary.cafe.lowStockProducts} içecek kritik stok seviyesinde.`
      : 'Kafe stoklarında kritik durum görünmüyor.',
    overview?.lockerSummary.outOfService
      ? `${overview.lockerSummary.outOfService} dolap arızalı durumda.`
      : 'Akıllı dolaplarda arıza görünmüyor.',
  ];

  const primaryCards = [
    {
      label: 'Aktif Üye',
      value: stats.activeMembers,
      subtitle: `${stats.passiveMembers} pasif üye`,
      icon: <BadgeRounded />,
    },
    {
      label: 'Bugünkü Giriş',
      value: stats.todayCheckIns,
      subtitle: 'Turnike ve check-in hareketi',
      icon: <CheckCircleRounded />,
    },
    {
      label: 'Bugünkü Gelir',
      value: formatMoney(todayIncome),
      subtitle: 'Bugün kaydedilen gelir',
      icon: <PointOfSaleRounded />,
    },
    {
      label: 'Bugünkü Gider',
      value: formatMoney(todayExpense),
      subtitle: 'Bugün kaydedilen gider',
      icon: <AccountBalanceWalletRounded />,
    },
    {
      label: 'Kafe Satışı',
      value: formatMoney(
        overview?.todayCafe.revenue || 0,
      ),
      subtitle: `${overview?.todayCafe.salesCount || 0} satış`,
      icon: <RestaurantRounded />,
    },
    {
      label: 'Üyeliği Bitecek',
      value:
        overview?.novaBriefing
          ?.summary.expiringMembers ||
        stats.expiringMemberships,
      subtitle: 'Önümüzdeki 7 gün',
      icon: <WarningAmberRounded />,
    },
  ];

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          bgcolor: '#f4f7fb',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: '#f4f7fb',
      }}
    >
      <Sidebar />

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: {
            xs: 1.5,
            md: 2.25,
          },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: {
              xs: 2,
              md: 2.5,
            },
            mb: 2,
            borderRadius: 2,
            border:
              '1px solid #e5e7eb',
          }}
        >
          <Stack
            direction={{
              xs: 'column',
              lg: 'row',
            }}
            justifyContent="space-between"
            alignItems={{
              xs: 'stretch',
              lg: 'center',
            }}
            spacing={2}
          >
            <Box>
              <Typography
                sx={{
                  color: '#2563eb',
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 1.4,
                }}
              >
                NOVAPLUS+
              </Typography>

              <Typography
                sx={{
                  mt: 0.4,
                  fontSize: {
                    xs: 26,
                    md: 30,
                  },
                  fontWeight: 950,
                }}
              >
                Günaydın {firstName}
              </Typography>

              <Typography
                sx={{
                  mt: 0.4,
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                {gymName} için bugünün özeti
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
            >
              <GlobalSearch />

              <Tooltip title="Bildirimler">
                <IconButton
                  onClick={() =>
                    navigate(
                      '/notifications',
                    )
                  }
                  sx={{
                    border:
                      '1px solid #e5e7eb',
                    bgcolor: '#fff',
                  }}
                >
                  <Badge
                    color="error"
                    badgeContent={
                      overview
                        ?.notificationSummary
                        .unread || 0
                    }
                  >
                    <NotificationsRounded />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Box
                sx={{
                  minWidth: 80,
                  textAlign: 'right',
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: 18,
                  }}
                >
                  {clock.toLocaleTimeString(
                    'tr-TR',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )}
                </Typography>

                <Typography
                  sx={{
                    color: '#64748b',
                    fontSize: 11,
                  }}
                >
                  {clock.toLocaleDateString(
                    'tr-TR',
                  )}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Paper>

        {error && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
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
                'repeat(3, minmax(0, 1fr))',
            },
            gap: 1.5,
            mb: 2,
          }}
        >
          {primaryCards.map(
            (item) => (
              <Card
                key={item.label}
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border:
                    '1px solid #e8edf5',
                }}
              >
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography
                        sx={{
                          color: '#64748b',
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {item.label}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.5,
                          fontSize: 23,
                          fontWeight: 950,
                        }}
                      >
                        {item.value}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.2,
                          color: '#94a3b8',
                          fontSize: 11,
                        }}
                      >
                        {item.subtitle}
                      </Typography>
                    </Box>

                    <Avatar
                      sx={{
                        bgcolor: '#eff6ff',
                        color: '#2563eb',
                      }}
                    >
                      {item.icon}
                    </Avatar>
                  </Stack>
                </CardContent>
              </Card>
            ),
          )}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg:
                '0.9fr 1.1fr',
            },
            gap: 2,
            mb: 2,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border:
                '1px solid #e8edf5',
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              <WarningAmberRounded
                color="warning"
              />

              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                Dikkat Gerekenler
              </Typography>
            </Stack>

            <Stack spacing={0.5}>
              {attentionItems.map(
                (item) => (
                  <Box
                    key={item.label}
                    onClick={() =>
                      navigate(item.path)
                    }
                    sx={{
                      p: 1.1,
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: '#f8fafc',
                      },
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {item.label}
                      </Typography>

                      <Chip
                        size="small"
                        label={item.value}
                        color={
                          item.value > 0
                            ? 'warning'
                            : 'success'
                        }
                      />
                    </Stack>
                  </Box>
                ),
              )}
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border:
                '1px solid #e8edf5',
            }}
          >
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              Son 7 Gün Gelir
            </Typography>

            <Typography
              sx={{
                mb: 2,
                color: '#94a3b8',
                fontSize: 12,
              }}
            >
              Günlük gelir hareketleri
            </Typography>

            <Stack spacing={1.2}>
              {(overview?.dailyFinance ||
                []).map((item) => {
                const max =
                  Math.max(
                    1,
                    ...(overview
                      ?.dailyFinance ||
                      []
                    ).map(
                      (day) =>
                        day.income,
                    ),
                  );

                return (
                  <Box key={item.date}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      sx={{ mb: 0.5 }}
                    >
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {item.label}
                      </Typography>

                      <Typography
                        sx={{
                          color: '#64748b',
                          fontSize: 12,
                        }}
                      >
                        {formatMoney(
                          item.income,
                        )}
                      </Typography>
                    </Stack>

                    <LinearProgress
                      variant="determinate"
                      value={
                        (item.income /
                          max) *
                        100
                      }
                      sx={{
                        height: 7,
                        borderRadius: 99,
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg:
                '1.1fr 0.9fr',
            },
            gap: 2,
            mb: 2,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              border:
                '1px solid #e8edf5',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 2 }}>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                Son Girişler
              </Typography>
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    Üye
                  </TableCell>
                  <TableCell>
                    Tür
                  </TableCell>
                  <TableCell align="right">
                    Saat
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {stats.recentCheckIns.map(
                  (checkIn) => (
                    <TableRow
                      key={checkIn.id}
                    >
                      <TableCell
                        sx={{
                          fontWeight: 800,
                        }}
                      >
                        {checkIn.member
                          ?.fullName ||
                          '—'}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            checkIn.accessType ===
                            'QR'
                              ? 'QR'
                              : 'Kart'
                          }
                        />
                      </TableCell>

                      <TableCell align="right">
                        {new Date(
                          checkIn.checkInTime,
                        ).toLocaleTimeString(
                          'tr-TR',
                          {
                            hour:
                              '2-digit',
                            minute:
                              '2-digit',
                          },
                        )}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border:
                '1px solid #e8edf5',
            }}
          >
            <Typography
              sx={{
                mb: 1.5,
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              Günlük Kısayollar
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(2, minmax(0, 1fr))',
                gap: 1,
              }}
            >
              {[
                {
                  label: 'Yeni Üye',
                  icon: <AddRounded />,
                  path: '/members',
                },
                {
                  label: 'Kart / QR',
                  icon:
                    <CreditCardRounded />,
                  path:
                    '/access-cards',
                },
                {
                  label:
                    'Kafe Satışı',
                  icon:
                    <RestaurantRounded />,
                  path: '/cafe',
                },
                {
                  label:
                    'SMS Gönder',
                  icon: <SendRounded />,
                  path: '/sms',
                },
              ].map((action) => (
                <Button
                  key={action.label}
                  variant="outlined"
                  startIcon={
                    action.icon
                  }
                  onClick={() =>
                    navigate(
                      action.path,
                    )
                  }
                  sx={{
                    minHeight: 48,
                    justifyContent:
                      'flex-start',
                    textTransform:
                      'none',
                    fontWeight: 800,
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          </Paper>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 2.25,
            mb: 2,
            borderRadius: 2,
            border: '1px solid #dbeafe',
            background:
              'linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%)',
          }}
        >
          <Stack
            direction={{
              xs: 'column',
              md: 'row',
            }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box sx={{ flex: 1 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 1.5 }}
              >
                <Avatar
                  sx={{
                    bgcolor: '#2563eb',
                    width: 40,
                    height: 40,
                  }}
                >
                  <SmartToyRounded />
                </Avatar>

                <Box>
                  <Typography
                    sx={{
                      fontSize: 18,
                      fontWeight: 900,
                    }}
                  >
                    Nova AI Bugünkü Analiz
                  </Typography>

                  <Typography
                    sx={{
                      color: '#64748b',
                      fontSize: 12,
                    }}
                  >
                    Canlı işletme verilerinden kısa yönetici özeti
                  </Typography>
                </Box>
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    lg: 'repeat(2, minmax(0, 1fr))',
                  },
                  gap: 1,
                }}
              >
                {novaInsights.map((insight) => (
                  <Stack
                    key={insight}
                    direction="row"
                    spacing={1}
                    alignItems="flex-start"
                    sx={{
                      p: 1.15,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(255,255,255,0.76)',
                    }}
                  >
                    <CheckCircleRounded
                      sx={{
                        mt: 0.15,
                        color: '#2563eb',
                        fontSize: 18,
                      }}
                    />

                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        lineHeight: 1.5,
                      }}
                    >
                      {insight}
                    </Typography>
                  </Stack>
                ))}
              </Box>
            </Box>

            <Button
              variant="contained"
              startIcon={<SmartToyRounded />}
              onClick={() => navigate('/nova-ai')}
              sx={{
                alignSelf: {
                  xs: 'stretch',
                  md: 'center',
                },
                minWidth: 190,
                minHeight: 46,
                textTransform: 'none',
                fontWeight: 850,
              }}
            >
              Detaylı Analizi Aç
            </Button>
          </Stack>
        </Paper>

        {(overview?.notifications
          ?.length || 0) > 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              border:
                '1px solid #e8edf5',
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                Önemli Bildirimler
              </Typography>

              <Button
                endIcon={
                  <ChevronRightRounded />
                }
                onClick={() =>
                  navigate(
                    '/notifications',
                  )
                }
              >
                Tümünü Gör
              </Button>
            </Stack>

            <Stack spacing={1}>
              {overview?.notifications
                .slice(0, 4)
                .map(
                  (notification) => (
                    <Alert
                      key={
                        notification.id
                      }
                      severity={
                        notification.severity ===
                        'CRITICAL'
                          ? 'error'
                          : notification.severity ===
                              'WARNING'
                            ? 'warning'
                            : 'info'
                      }
                    >
                      <strong>
                        {
                          notification.title
                        }
                      </strong>
                      {' — '}
                      {
                        notification.description
                      }
                    </Alert>
                  ),
                )}
            </Stack>
          </Paper>
        )}

        <QuickActions />
      </Box>
    </Box>
  );
}
