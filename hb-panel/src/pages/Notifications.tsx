import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import {
  CheckCircleRounded,
  CreditCardRounded,
  DoneAllRounded,
  EventBusyRounded,
  LockRounded,
  MarkEmailReadRounded,
  NotificationsActiveRounded,
  SmsRounded,
  WarningAmberRounded,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';

import { Sidebar } from '../components/Sidebar';
import { PageHeader } from '../components/ui/PageHeader';
import { PageContainer } from '../components/ui/PageContainer';
import { StatCard } from '../components/ui/StatCard';
import { ActionBar } from '../components/ui/ActionBar';
import { SectionCard } from '../components/ui/SectionCard';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingPage } from '../components/ui/LoadingPage';
import { StatusChip } from '../components/ui/StatusChip';
import { api } from '../services/api';

type NotificationCategory =
  | 'ALL'
  | 'STOCK'
  | 'MEMBERSHIP'
  | 'LOCKER'
  | 'SMS'
  | 'LICENSE'
  | 'SYSTEM';

type NotificationSeverity =
  | 'INFO'
  | 'WARNING'
  | 'CRITICAL';

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  category: Exclude<
    NotificationCategory,
    'ALL'
  >;
  severity: NotificationSeverity;
  isRead: boolean;
  sourceKey?: string | null;
  actionPath?: string | null;
  createdAt: string;
};

type NotificationSummary = {
  total: number;
  unread: number;
  critical: number;
  warning: number;
};

const filters: Array<{
  label: string;
  value: NotificationCategory;
}> = [
  { label: 'Tümü', value: 'ALL' },
  { label: 'Stok', value: 'STOCK' },
  {
    label: 'Üyelik',
    value: 'MEMBERSHIP',
  },
  { label: 'Dolap', value: 'LOCKER' },
  { label: 'SMS', value: 'SMS' },
  { label: 'Lisans', value: 'LICENSE' },
  { label: 'Sistem', value: 'SYSTEM' },
];

function iconForCategory(
  category: NotificationItem['category'],
) {
  switch (category) {
    case 'STOCK':
      return <CreditCardRounded />;
    case 'MEMBERSHIP':
      return <EventBusyRounded />;
    case 'LOCKER':
      return <LockRounded />;
    case 'SMS':
      return <SmsRounded />;
    case 'LICENSE':
      return <WarningAmberRounded />;
    case 'SYSTEM':
      return <NotificationsActiveRounded />;
  }
}

function severityStyle(
  severity: NotificationSeverity,
) {
  if (severity === 'CRITICAL') {
    return {
      color: '#dc2626',
      background: '#fef2f2',
      border: '#fecaca',
      label: 'Kritik',
    };
  }

  if (severity === 'WARNING') {
    return {
      color: '#d97706',
      background: '#fffbeb',
      border: '#fde68a',
      label: 'Uyarı',
    };
  }

  return {
    color: '#2563eb',
    background: '#eff6ff',
    border: '#bfdbfe',
    label: 'Bilgi',
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(
    'tr-TR',
  );
}

function getError(error: unknown) {
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
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  return 'Bildirim işlemi sırasında hata oluştu.';
}

export function Notifications() {
  const navigate = useNavigate();

  const [items, setItems] =
    useState<NotificationItem[]>([]);

  const [summary, setSummary] =
    useState<NotificationSummary>({
      total: 0,
      unread: 0,
      critical: 0,
      warning: 0,
    });

  const [filter, setFilter] =
    useState<NotificationCategory>('ALL');

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] =
    useState('');

  async function loadNotifications() {
    try {
      setLoading(true);

      const [
        notificationsResponse,
        summaryResponse,
      ] = await Promise.all([
        api.get<NotificationItem[]>(
          '/notifications',
        ),
        api.get<NotificationSummary>(
          '/notifications/summary',
        ),
      ]);

      setItems(
        notificationsResponse.data,
      );

      setSummary(
        summaryResponse.data,
      );

      setError('');
    } catch (requestError) {
      setError(
        getError(requestError),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          filter === 'ALL' ||
          item.category === filter,
      ),
    [items, filter],
  );

  async function markRead(
    id: string,
  ) {
    try {
      await api.patch(
        `/notifications/${id}/read`,
      );

      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                isRead: true,
              }
            : item,
        ),
      );

      setSummary((current) => ({
        ...current,
        unread: Math.max(
          0,
          current.unread - 1,
        ),
      }));
    } catch (requestError) {
      setError(
        getError(requestError),
      );
    }
  }

  async function markAllRead() {
    try {
      setProcessing(true);

      await api.post(
        '/notifications/read-all',
      );

      setItems((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
        })),
      );

      setSummary((current) => ({
        ...current,
        unread: 0,
      }));
    } catch (requestError) {
      setError(
        getError(requestError),
      );
    } finally {
      setProcessing(false);
    }
  }

  async function resolveNotification(
    id: string,
  ) {
    try {
      await api.patch(
        `/notifications/${id}/resolve`,
      );

      await loadNotifications();
    } catch (requestError) {
      setError(
        getError(requestError),
      );
    }
  }

  async function openNotification(
    notification: NotificationItem,
  ) {
    if (!notification.isRead) {
      await markRead(notification.id);
    }

    if (notification.actionPath) {
      navigate(
        notification.actionPath,
      );
    }
  }

  const summaryCards = [
    {
      label: 'Toplam',
      value: summary.total,
      color: '#2563eb',
    },
    {
      label: 'Okunmamış',
      value: summary.unread,
      color: '#7c3aed',
    },
    {
      label: 'Kritik',
      value: summary.critical,
      color: '#dc2626',
    },
    {
      label: 'Uyarı',
      value: summary.warning,
      color: '#d97706',
    },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background:
          'background.default',
      }}
    >
      <Sidebar />

      <PageContainer>
        <PageHeader
          eyebrow="NOVAPLUS+"
          title="Bildirim Merkezi"
          subtitle="Salonunuzla ilgili güncel uyarıları tek ekranda takip edin."
          icon={
            <Badge
              badgeContent={summary.unread}
              color="error"
            >
              <NotificationsActiveRounded />
            </Badge>
          }
          actions={
            <Button
              variant="contained"
              startIcon={
                processing ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <DoneAllRounded />
                )
              }
              onClick={() => void markAllRead()}
              disabled={processing || summary.unread === 0}
            >
              Tümünü Okundu İşaretle
            </Button>
          }
        />

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            onClose={() =>
              setError('')
            }
          >
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 2,
            mb: 3,
          }}
        >
          {summaryCards.map((card) => (
            <StatCard
              key={card.label}
              title={card.label}
              value={card.value}
              icon={<NotificationsActiveRounded />}
              accent={card.color}
              iconBackground="#f8fafc"
            />
          ))}
        </Box>

        <ActionBar>
          <Stack
            direction="row"
            spacing={1}

            useFlexGap
          
          sx={{ flexWrap: 'wrap' }}>
            {filters.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                clickable
                color={
                  filter === item.value
                    ? 'primary'
                    : 'default'
                }
                variant={
                  filter === item.value
                    ? 'filled'
                    : 'outlined'
                }
                onClick={() =>
                  setFilter(item.value)
                }
              />
            ))}
          </Stack>

        </ActionBar>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            border:
              '1px solid',
            borderColor: 'divider',
            boxShadow:
              '0 10px 30px rgba(15,23,42,0.06)',
          }}
        >
          <Box sx={{ p: 3 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 900 }}
            >
              {filter === 'ALL'
                ? 'Tüm Bildirimler'
                : filters.find(
                    (item) =>
                      item.value ===
                      filter,
                  )?.label}
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                color:
                  'text.secondary',
                fontSize: 14,
              }}
            >
              {visibleItems.length}{' '}
              bildirim gösteriliyor.
            </Typography>
          </Box>

          <Divider />

          {loading ? (
            <LoadingPage
              label="Bildirimler yükleniyor..."
              minHeight={300}
            />
          ) : visibleItems.length === 0 ? (
            <EmptyState
              icon={<CheckCircleRounded />}
              title="Aktif bildirim yok"
              description="Bu kategoride çözülmemiş bir uyarı bulunmuyor."
            />
          ) : (
            visibleItems.map(
              (
                notification,
                index,
              ) => {
                const style =
                  severityStyle(
                    notification.severity,
                  );

                return (
                  <Box
                    key={
                      notification.id
                    }
                  >
                    <Box
                      onClick={() =>
                        void openNotification(
                          notification,
                        )
                      }
                      sx={{
                        p: 3,
                        cursor:
                          notification.actionPath
                            ? 'pointer'
                            : 'default',
                        background:
                          notification.isRead
                            ? 'background.paper'
                            : 'action.hover',
                        '&:hover': {
                          background:
                            'action.hover',
                        },
                      }}
                    >
                      <Stack
                        direction={{
                          xs: 'column',
                          sm: 'row',
                        }}
                        spacing={2}

                      
                      sx={{ alignItems: {
                          xs: 'stretch',
                          sm: 'flex-start',
                        } }}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            flexShrink: 0,
                            display: 'grid',
                            placeItems:
                              'center',
                            borderRadius: 3,
                            color:
                              style.color,
                            background:
                              style.background,
                            border: `1px solid ${style.border}`,
                          }}
                        >
                          {iconForCategory(
                            notification.category,
                          )}
                        </Box>

                        <Box
                          sx={{ flex: 1 }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}


                            useFlexGap
                          
                          sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            {!notification.isRead && (
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius:
                                    '50%',
                                  background:
                                    'primary.main',
                                }}
                              />
                            )}

                            <Typography
                              sx={{
                                fontWeight:
                                  900,
                              }}
                            >
                              {
                                notification.title
                              }
                            </Typography>

                            <StatusChip
                              label={style.label}
                              tone={
                                notification.severity === 'CRITICAL'
                                  ? 'error'
                                  : notification.severity === 'WARNING'
                                    ? 'warning'
                                    : 'info'
                              }
                            />
                          </Stack>

                          <Typography
                            sx={{
                              mt: 0.75,
                              color:
                                'text.secondary',
                            }}
                          >
                            {
                              notification.description
                            }
                          </Typography>

                          <Typography
                            sx={{
                              mt: 1,
                              color:
                                'text.secondary',
                              fontSize: 12,
                            }}
                          >
                            {formatDate(
                              notification.createdAt,
                            )}
                          </Typography>
                        </Box>

                        <Stack
                          direction={{
                            xs: 'row',
                            sm: 'column',
                          }}
                          spacing={1}

                        
                        sx={{ alignItems: 'stretch' }}>
                          {!notification.isRead && (
                            <Button
                              size="small"
                              startIcon={
                                <MarkEmailReadRounded />
                              }
                              onClick={(
                                event,
                              ) => {
                                event.stopPropagation();
                                void markRead(
                                  notification.id,
                                );
                              }}
                            >
                              Okundu
                            </Button>
                          )}

                          <Button
                            size="small"
                            color="inherit"
                            onClick={(
                              event,
                            ) => {
                              event.stopPropagation();
                              void resolveNotification(
                                notification.id,
                              );
                            }}
                          >
                            Çöz
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>

                    {index <
                      visibleItems.length -
                        1 && <Divider />}
                  </Box>
                );
              },
            )
          )}
        </Paper>
      </PageContainer>
    </Box>
  );
}
