import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import {
  AccountBalanceWalletRounded,
  AssessmentRounded,
  BadgeRounded,
  DownloadRounded,
  GroupsRounded,
  Inventory2Rounded,
  LockRounded,
  SmsRounded,
  StorefrontRounded,
  SensorDoorRounded,
  LoginRounded,
  LogoutRounded,
  CheckCircleRounded,
  CancelRounded,
} from '@mui/icons-material';

import { Sidebar } from '../components/Sidebar';
import { api } from '../services/api';

import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingPage } from '../components/ui/LoadingPage';
import { StatusChip } from '../components/ui/StatusChip';

type ReportType =
  | 'members'
  | 'finance'
  | 'turnstile'
  | 'sms'
  | 'lockers'
  | 'cafe'
  | 'staff';

type ReportOverview = {
  dateFrom: string;
  dateTo: string;

  members: {
    total: number;
    active: number;
    passive: number;
    newInRange: number;
    packageDistribution: Array<{
      name: string;
      count: number;
    }>;
  };

  finance: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    records: Array<{
      id: number;
      title: string;
      type: 'income' | 'expense';
      amount: number;
      description?: string;
      createdAt: string;
    }>;
  };

  sms: {
    balance: number;
    totalPurchased: number;
    totalUsed: number;
    totalMessages: number;
    sent: number;
    failed: number;
    successRate: number;
    history: Array<{
      id: string;
      phone: string;
      status: string;
      smsCost: number;
      message: string;
      createdAt: string;
    }>;
  };

  lockers: {
    total: number;
    available: number;
    occupied: number;
    outOfService: number;
    totalMovements: number;
    history: Array<{
      id: string;
      lockerId: string;
      action: string;
      description?: string;
      createdAt: string;
    }>;
  };

  turnstile: {
    totalEvents: number;
    entries: number;
    exits: number;
    approved: number;
    rejected: number;
    approvalRate: number;
    busiestTurnstile: {
      turnstileId: string;
      turnstileName: string;
      count: number;
    } | null;
    usage: Array<{
      turnstileId: string;
      turnstileName: string;
      count: number;
    }>;
    rejectionReasons: Array<{
      reason: string;
      count: number;
    }>;
    events: Array<{
      id: string;
      turnstileId: string;
      turnstileName: string;
      memberName?: string | null;
      credentialType?: string | null;
      credentialCode?: string | null;
      direction: string;
      result: string;
      reason?: string | null;
      createdAt: string;
    }>;
  };

  cafe: {
    totalSales: number;
    totalRevenue: number;
    totalProducts: number;
    activeProducts: number;
    lowStockProducts: number;
    sales: Array<{
      id: string;
      memberId?: number;
      paymentMethod: string;
      totalAmount: number;
      createdAt: string;
    }>;
  };

  staff: {
    total: number;
    active: number;
    insideNow: number;
    totalAttendance: number;
    totalMinutes: number;
    attendance: Array<{
      id: string;
      workDate: string;
      checkInTime: string;
      checkOutTime: string | null;
      durationMinutes: number;
      accessType: string;
      staff?: {
        fullName?: string;
      };
    }>;
  };
};

function money(value: number) {
  return new Intl.NumberFormat(
    'tr-TR',
    {
      style: 'currency',
      currency: 'TRY',
    },
  ).format(Number(value) || 0);
}

function duration(minutes: number) {
  const total =
    Math.max(
      0,
      Number(minutes) || 0,
    );

  return `${Math.floor(total / 60)}s ${total % 60}dk`;
}

function reportError(
  error: unknown,
) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const message = (
      error as {
        response?: {
          data?: {
            message?:
              | string
              | string[];
          };
        };
      }
    ).response?.data?.message;

    if (
      Array.isArray(message)
    ) {
      return message.join(', ');
    }

    if (
      typeof message ===
      'string'
    ) {
      return message;
    }
  }

  return 'Rapor verileri alınamadı.';
}

const tabs: Array<{
  type: ReportType;
  label: string;
  icon: React.ReactElement;
}> = [
  {
    type: 'members',
    label: 'Üyeler',
    icon: <GroupsRounded />,
  },
  {
    type: 'finance',
    label: 'Finans',
    icon:
      <AccountBalanceWalletRounded />,
  },
  {
    type: 'turnstile',
    label: 'Turnike',
    icon:
      <SensorDoorRounded />,
  },
  {
    type: 'sms',
    label: 'SMS',
    icon: <SmsRounded />,
  },
  {
    type: 'lockers',
    label: 'Dolaplar',
    icon: <LockRounded />,
  },
  {
    type: 'cafe',
    label: 'Kafe',
    icon: <StorefrontRounded />,
  },
  {
    type: 'staff',
    label: 'Personel',
    icon: <BadgeRounded />,
  },
];

export function Reports() {
  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const monthStart =
    `${today.slice(0, 7)}-01`;

  const [dateFrom, setDateFrom] =
    useState(monthStart);

  const [dateTo, setDateTo] =
    useState(today);

  const [type, setType] =
    useState<ReportType>(
      'members',
    );

  const [data, setData] =
    useState<ReportOverview | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const load = useCallback(
    async () => {
      try {
        setLoading(true);

        const response =
          await api.get<ReportOverview>(
            '/reports/overview',
            {
              params: {
                dateFrom,
                dateTo,
              },
            },
          );

        setData(response.data);
        setError('');
      } catch (requestError) {
        setError(
          reportError(
            requestError,
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [dateFrom, dateTo],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv =
    async () => {
      try {
        const response =
          await api.get(
            '/reports/export.csv',
            {
              params: {
                type,
                dateFrom,
                dateTo,
              },
              responseType: 'blob',
            },
          );

        const url =
          window.URL
            .createObjectURL(
              new Blob(
                [response.data],
                {
                  type:
                    'text/csv;charset=utf-8',
                },
              ),
            );

        const link =
          document.createElement(
            'a',
          );

        link.href = url;
        link.download =
          `novaplus-${type}-${dateFrom}-${dateTo}.csv`;

        document.body.appendChild(
          link,
        );

        link.click();
        link.remove();

        window.URL
          .revokeObjectURL(
            url,
          );
      } catch (requestError) {
        setError(
          reportError(
            requestError,
          ),
        );
      }
    };

  const tabIndex =
    useMemo(
      () =>
        tabs.findIndex(
          (item) =>
            item.type === type,
        ),
      [type],
    );

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
          title="Raporlar Merkezi"
          subtitle="Üye, finans, turnike, kafe ve personel verilerini tarih aralığıyla inceleyin."
          icon={
            <AssessmentRounded />
          }
          actions={
            <Button
              variant="contained"
              startIcon={
                <DownloadRounded />
              }
              onClick={() =>
                void exportCsv()
              }
            >
              CSV / Excel
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

        <SectionCard
          title="Rapor Filtreleri"
          subtitle="Tarih aralığını ve rapor türünü seçin."
          overflow="visible"
        >
          <Stack
            direction={{
              xs: 'column',
              md: 'row',
            }}
            spacing={1.5}
            sx={{ p: 2.5 }}
          >
            <TextField
              type="date"
              label="Başlangıç"
              value={dateFrom}
              onChange={(event) =>
                setDateFrom(
                  event.target.value,
                )
              }
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            <TextField
              type="date"
              label="Bitiş"
              value={dateTo}
              onChange={(event) =>
                setDateTo(
                  event.target.value,
                )
              }
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            <TextField
              select
              label="Rapor Türü"
              value={type}
              onChange={(event) =>
                setType(
                  event.target.value as ReportType,
                )
              }
              sx={{
                minWidth: 190,
              }}
            >
              {tabs.map((item) => (
                <MenuItem
                  key={item.type}
                  value={item.type}
                >
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Tabs
            value={tabIndex}
            onChange={(
              _event,
              index: number,
            ) =>
              setType(
                tabs[index].type,
              )
            }
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 2,
              borderTop:
                '1px solid #eef2f7',
            }}
          >
            {tabs.map((item) => (
              <Tab
                key={item.type}
                icon={item.icon}
                iconPosition="start"
                label={item.label}
              />
            ))}
          </Tabs>
        </SectionCard>

        <Box sx={{ mt: 3 }}>
          {loading || !data ? (
            <SectionCard>
              <LoadingPage
                label="Raporlar hazırlanıyor..."
                minHeight={380}
              />
            </SectionCard>
          ) : type === 'members' ? (
            <MembersReport
              data={data}
            />
          ) : type === 'finance' ? (
            <FinanceReport
              data={data}
            />
          ) : type === 'turnstile' ? (
            <TurnstileReport
              data={data}
            />
          ) : type === 'sms' ? (
            <SmsReport data={data} />
          ) : type === 'lockers' ? (
            <LockerReport
              data={data}
            />
          ) : type === 'cafe' ? (
            <CafeReport
              data={data}
            />
          ) : (
            <StaffReport
              data={data}
            />
          )}
        </Box>
      </PageContainer>
    </Box>
  );
}

function SummaryGrid({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          xl: 'repeat(4, 1fr)',
        },
        gap: 2,
        mb: 3,
      }}
    >
      {children}
    </Box>
  );
}

function MembersReport({
  data,
}: {
  data: ReportOverview;
}) {
  return (
    <>
      <SummaryGrid>
        <StatCard
          title="Toplam Üye"
          value={data.members.total}
          icon={<GroupsRounded />}
        />
        <StatCard
          title="Aktif Üye"
          value={data.members.active}
          icon={<GroupsRounded />}
          accent="#16a34a"
          iconBackground="#ecfdf3"
        />
        <StatCard
          title="Pasif Üye"
          value={data.members.passive}
          icon={<GroupsRounded />}
          accent="#dc2626"
          iconBackground="#fff1f2"
        />
        <StatCard
          title="Yeni Üye"
          value={data.members.newInRange}
          icon={<GroupsRounded />}
          accent="#7c3aed"
          iconBackground="#f5f3ff"
        />
      </SummaryGrid>

      <SectionCard
        title="Paket Dağılımı"
        subtitle="Üyelerin paketlere göre dağılımı"
      >
        {data.members
          .packageDistribution
          .length === 0 ? (
          <EmptyState
            icon={
              <Inventory2Rounded />
            }
            title="Paket verisi bulunamadı"
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ background: '#f8fafc' }}>
                <TableCell>Paket</TableCell>
                <TableCell>Üye Sayısı</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.members
                .packageDistribution
                .map((item) => (
                  <TableRow
                    key={item.name}
                    hover
                  >
                    <TableCell sx={{ fontWeight: 900 }}>
                      {item.name}
                    </TableCell>
                    <TableCell>
                      {item.count}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </>
  );
}

function FinanceReport({
  data,
}: {
  data: ReportOverview;
}) {
  return (
    <>
      <SummaryGrid>
        <StatCard
          title="Toplam Gelir"
          value={money(data.finance.totalIncome)}
          icon={<AccountBalanceWalletRounded />}
          accent="#16a34a"
          iconBackground="#ecfdf3"
        />
        <StatCard
          title="Toplam Gider"
          value={money(data.finance.totalExpense)}
          icon={<AccountBalanceWalletRounded />}
          accent="#dc2626"
          iconBackground="#fff1f2"
        />
        <StatCard
          title="Net Bakiye"
          value={money(data.finance.balance)}
          icon={<AccountBalanceWalletRounded />}
        />
        <StatCard
          title="Kayıt Sayısı"
          value={data.finance.records.length}
          icon={<AssessmentRounded />}
        />
      </SummaryGrid>

      <SectionCard title="Finans Hareketleri">
        <Table>
          <TableHead>
            <TableRow sx={{ background: '#f8fafc' }}>
              <TableCell>Başlık</TableCell>
              <TableCell>Tür</TableCell>
              <TableCell>Tutar</TableCell>
              <TableCell>Tarih</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.finance.records.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 900 }}>
                  {item.title}
                </TableCell>
                <TableCell>
                  <StatusChip
                    label={
                      item.type === 'income'
                        ? 'Gelir'
                        : 'Gider'
                    }
                    tone={
                      item.type === 'income'
                        ? 'success'
                        : 'error'
                    }
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 900 }}>
                  {money(item.amount)}
                </TableCell>
                <TableCell>
                  {new Date(
                    item.createdAt,
                  ).toLocaleString(
                    'tr-TR',
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </>
  );
}

function TurnstileReport({
  data,
}: {
  data: ReportOverview;
}) {
  return (
    <>
      <SummaryGrid>
        <StatCard
          title="Giriş"
          value={
            data.turnstile.entries
          }
          icon={
            <LoginRounded />
          }
          accent="#2563eb"
          iconBackground="#eff6ff"
        />

        <StatCard
          title="Çıkış"
          value={
            data.turnstile.exits
          }
          icon={
            <LogoutRounded />
          }
          accent="#7c3aed"
          iconBackground="#f5f3ff"
        />

        <StatCard
          title="Onaylanan"
          value={
            data.turnstile.approved
          }
          icon={
            <CheckCircleRounded />
          }
          accent="#16a34a"
          iconBackground="#ecfdf3"
        />

        <StatCard
          title="Reddedilen"
          value={
            data.turnstile.rejected
          }
          icon={
            <CancelRounded />
          }
          accent="#dc2626"
          iconBackground="#fff1f2"
        />
      </SummaryGrid>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg:
              'repeat(2, minmax(0, 1fr))',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <SectionCard
          title="Turnike Kullanımı"
          subtitle={
            data.turnstile
              .busiestTurnstile
              ? `En yoğun: ${data.turnstile.busiestTurnstile.turnstileName}`
              : 'Henüz turnike geçişi yok'
          }
        >
          {data.turnstile
            .usage.length === 0 ? (
            <EmptyState
              icon={
                <SensorDoorRounded />
              }
              title="Turnike verisi bulunamadı"
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    background:
                      '#f8fafc',
                  }}
                >
                  <TableCell>
                    Turnike
                  </TableCell>
                  <TableCell>
                    Geçiş
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.turnstile
                  .usage.map(
                    (item) => (
                      <TableRow
                        key={
                          item.turnstileId
                        }
                        hover
                      >
                        <TableCell
                          sx={{
                            fontWeight:
                              900,
                          }}
                        >
                          {
                            item.turnstileName
                          }
                        </TableCell>

                        <TableCell>
                          {item.count}
                        </TableCell>
                      </TableRow>
                    ),
                  )}
              </TableBody>
            </Table>
          )}
        </SectionCard>

        <SectionCard
          title="Reddetme Nedenleri"
          subtitle={`Onay oranı %${data.turnstile.approvalRate}`}
        >
          {data.turnstile
            .rejectionReasons
            .length === 0 ? (
            <EmptyState
              icon={
                <CheckCircleRounded />
              }
              title="Reddedilen geçiş yok"
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    background:
                      '#f8fafc',
                  }}
                >
                  <TableCell>
                    Neden
                  </TableCell>
                  <TableCell>
                    Adet
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.turnstile
                  .rejectionReasons
                  .map(
                    (item) => (
                      <TableRow
                        key={
                          item.reason
                        }
                        hover
                      >
                        <TableCell>
                          {item.reason}
                        </TableCell>

                        <TableCell>
                          {item.count}
                        </TableCell>
                      </TableRow>
                    ),
                  )}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      </Box>

      <SectionCard
        title="Turnike Geçişleri"
        subtitle={`${data.turnstile.totalEvents} kayıt`}
      >
        {data.turnstile
          .events.length === 0 ? (
          <EmptyState
            icon={
              <SensorDoorRounded />
            }
            title="Turnike geçişi bulunamadı"
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  background:
                    '#f8fafc',
                }}
              >
                <TableCell>
                  Turnike
                </TableCell>
                <TableCell>
                  Üye
                </TableCell>
                <TableCell>
                  Yön
                </TableCell>
                <TableCell>
                  Sonuç
                </TableCell>
                <TableCell>
                  Erişim
                </TableCell>
                <TableCell>
                  Neden
                </TableCell>
                <TableCell>
                  Tarih
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {data.turnstile
                .events
                .slice(0, 200)
                .map((item) => (
                  <TableRow
                    key={item.id}
                    hover
                  >
                    <TableCell
                      sx={{
                        fontWeight:
                          900,
                      }}
                    >
                      {item.turnstileName ||
                        item.turnstileId}
                    </TableCell>

                    <TableCell>
                      {item.memberName ||
                        '—'}
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          item.direction ===
                          'ENTRY'
                            ? 'Giriş'
                            : item.direction ===
                                'EXIT'
                              ? 'Çıkış'
                              : item.direction
                        }
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell>
                      <StatusChip
                        label={
                          item.result ===
                          'APPROVED'
                            ? 'Onaylandı'
                            : item.result ===
                                'REJECTED'
                              ? 'Reddedildi'
                              : 'Hata'
                        }
                        tone={
                          item.result ===
                          'APPROVED'
                            ? 'success'
                            : 'error'
                        }
                      />
                    </TableCell>

                    <TableCell>
                      {item.credentialType ||
                        '—'}
                    </TableCell>

                    <TableCell>
                      {item.reason || '—'}
                    </TableCell>

                    <TableCell>
                      {new Date(
                        item.createdAt,
                      ).toLocaleString(
                        'tr-TR',
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </>
  );
}

function SmsReport({
  data,
}: {
  data: ReportOverview;
}) {
  return (
    <>
      <SummaryGrid>
        <StatCard
          title="Kalan SMS"
          value={data.sms.balance}
          icon={<SmsRounded />}
        />
        <StatCard
          title="Gönderilen"
          value={data.sms.sent}
          icon={<SmsRounded />}
          accent="#16a34a"
          iconBackground="#ecfdf3"
        />
        <StatCard
          title="Başarısız"
          value={data.sms.failed}
          icon={<SmsRounded />}
          accent="#dc2626"
          iconBackground="#fff1f2"
        />
        <StatCard
          title="Başarı Oranı"
          value={`%${data.sms.successRate}`}
          icon={<SmsRounded />}
        />
      </SummaryGrid>

      <SectionCard title="SMS Geçmişi">
        <Table>
          <TableHead>
            <TableRow sx={{ background: '#f8fafc' }}>
              <TableCell>Telefon</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell>Maliyet</TableCell>
              <TableCell>Mesaj</TableCell>
              <TableCell>Tarih</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.sms.history.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.phone}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={item.status}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{item.smsCost}</TableCell>
                <TableCell>
                  <Typography
                    noWrap
                    sx={{
                      maxWidth: 320,
                    }}
                  >
                    {item.message}
                  </Typography>
                </TableCell>
                <TableCell>
                  {new Date(
                    item.createdAt,
                  ).toLocaleString(
                    'tr-TR',
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </>
  );
}

function LockerReport({
  data,
}: {
  data: ReportOverview;
}) {
  return (
    <>
      <SummaryGrid>
        <StatCard
          title="Toplam Dolap"
          value={data.lockers.total}
          icon={<LockRounded />}
        />
        <StatCard
          title="Boş"
          value={data.lockers.available}
          icon={<LockRounded />}
          accent="#16a34a"
          iconBackground="#ecfdf3"
        />
        <StatCard
          title="Dolu"
          value={data.lockers.occupied}
          icon={<LockRounded />}
          accent="#7c3aed"
          iconBackground="#f5f3ff"
        />
        <StatCard
          title="Arızalı"
          value={data.lockers.outOfService}
          icon={<LockRounded />}
          accent="#dc2626"
          iconBackground="#fff1f2"
        />
      </SummaryGrid>

      <SectionCard title="Dolap Hareketleri">
        <Table>
          <TableHead>
            <TableRow sx={{ background: '#f8fafc' }}>
              <TableCell>Dolap</TableCell>
              <TableCell>İşlem</TableCell>
              <TableCell>Açıklama</TableCell>
              <TableCell>Tarih</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.lockers.history.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.lockerId}</TableCell>
                <TableCell>{item.action}</TableCell>
                <TableCell>
                  {item.description || '—'}
                </TableCell>
                <TableCell>
                  {new Date(
                    item.createdAt,
                  ).toLocaleString(
                    'tr-TR',
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </>
  );
}

function CafeReport({
  data,
}: {
  data: ReportOverview;
}) {
  return (
    <>
      <SummaryGrid>
        <StatCard
          title="Toplam Satış"
          value={data.cafe.totalSales}
          icon={<StorefrontRounded />}
        />
        <StatCard
          title="Toplam Ciro"
          value={money(data.cafe.totalRevenue)}
          icon={<StorefrontRounded />}
          accent="#16a34a"
          iconBackground="#ecfdf3"
        />
        <StatCard
          title="Aktif Ürün"
          value={data.cafe.activeProducts}
          icon={<Inventory2Rounded />}
        />
        <StatCard
          title="Düşük Stok"
          value={data.cafe.lowStockProducts}
          icon={<Inventory2Rounded />}
          accent="#dc2626"
          iconBackground="#fff1f2"
        />
      </SummaryGrid>

      <SectionCard title="Kafe Satışları">
        <Table>
          <TableHead>
            <TableRow sx={{ background: '#f8fafc' }}>
              <TableCell>Satış No</TableCell>
              <TableCell>Üye</TableCell>
              <TableCell>Ödeme</TableCell>
              <TableCell>Tutar</TableCell>
              <TableCell>Tarih</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.cafe.sales.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.id}</TableCell>
                <TableCell>{item.memberId || '—'}</TableCell>
                <TableCell>{item.paymentMethod}</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>
                  {money(item.totalAmount)}
                </TableCell>
                <TableCell>
                  {new Date(
                    item.createdAt,
                  ).toLocaleString(
                    'tr-TR',
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </>
  );
}

function StaffReport({
  data,
}: {
  data: ReportOverview;
}) {
  return (
    <>
      <SummaryGrid>
        <StatCard
          title="Toplam Personel"
          value={data.staff.total}
          icon={<BadgeRounded />}
        />
        <StatCard
          title="Aktif Personel"
          value={data.staff.active}
          icon={<BadgeRounded />}
          accent="#16a34a"
          iconBackground="#ecfdf3"
        />
        <StatCard
          title="Şu An İçeride"
          value={data.staff.insideNow}
          icon={<BadgeRounded />}
          accent="#7c3aed"
          iconBackground="#f5f3ff"
        />
        <StatCard
          title="Toplam Çalışma"
          value={duration(data.staff.totalMinutes)}
          icon={<BadgeRounded />}
        />
      </SummaryGrid>

      <SectionCard title="Personel Çalışma Kayıtları">
        <Table>
          <TableHead>
            <TableRow sx={{ background: '#f8fafc' }}>
              <TableCell>Personel</TableCell>
              <TableCell>Tarih</TableCell>
              <TableCell>Giriş</TableCell>
              <TableCell>Çıkış</TableCell>
              <TableCell>Süre</TableCell>
              <TableCell>Erişim</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.staff.attendance.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 900 }}>
                  {item.staff?.fullName || 'Personel'}
                </TableCell>
                <TableCell>{item.workDate}</TableCell>
                <TableCell>
                  {new Date(
                    item.checkInTime,
                  ).toLocaleTimeString(
                    'tr-TR',
                  )}
                </TableCell>
                <TableCell>
                  {item.checkOutTime
                    ? new Date(
                        item.checkOutTime,
                      ).toLocaleTimeString(
                        'tr-TR',
                      )
                    : 'İçeride'}
                </TableCell>
                <TableCell>
                  {duration(
                    item.durationMinutes,
                  )}
                </TableCell>
                <TableCell>
                  {item.accessType}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </>
  );
}
