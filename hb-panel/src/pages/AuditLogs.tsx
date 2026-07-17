import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';

import {
  DownloadRounded,
  HistoryRounded,
  SearchRounded,
} from '@mui/icons-material';

import { Sidebar } from '../components/Sidebar';
import { api } from '../services/api';
import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionCard } from '../components/ui/SectionCard';
import { StatCard } from '../components/ui/StatCard';
import { LoadingPage } from '../components/ui/LoadingPage';
import { EmptyState } from '../components/ui/EmptyState';

type AuditLog = {
  id: string;
  userName: string | null;
  module: string;
  action: string;
  description: string;
  entityType: string | null;
  entityId: string | null;
  amount: number | null;
  ipAddress: string | null;
  result: 'SUCCESS' | 'FAILED';
  createdAt: string;
};

type Summary = {
  total: number;
  success: number;
  failed: number;
  latest: AuditLog | null;
};

const modules = [
  'MEMBER',
  'FINANCE',
  'ACCESS_CARD',
  'CAFE',
  'SMS',
  'LOCKER',
  'STAFF',
  'SYSTEM',
];

export function AuditLogs() {
  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const [dateFrom, setDateFrom] =
    useState(today);

  const [dateTo, setDateTo] =
    useState(today);

  const [module, setModule] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [logs, setLogs] =
    useState<AuditLog[]>([]);

  const [summary, setSummary] =
    useState<Summary>({
      total: 0,
      success: 0,
      failed: 0,
      latest: null,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const load = useCallback(
    async () => {
      try {
        setLoading(true);

        const [
          logsResponse,
          summaryResponse,
        ] = await Promise.all([
          api.get<AuditLog[]>(
            '/audit-logs',
            {
              params: {
                dateFrom,
                dateTo,
                module:
                  module || undefined,
                search:
                  search || undefined,
              },
            },
          ),

          api.get<Summary>(
            '/audit-logs/summary',
            {
              params: {
                dateFrom,
                dateTo,
              },
            },
          ),
        ]);

        setLogs(
          logsResponse.data,
        );

        setSummary(
          summaryResponse.data,
        );

        setError('');
      } catch {
        setError(
          'İşlem geçmişi alınamadı.',
        );
      } finally {
        setLoading(false);
      }
    },
    [
      dateFrom,
      dateTo,
      module,
      search,
    ],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv =
    async () => {
      const response =
        await api.get(
          '/audit-logs/export.csv',
          {
            params: {
              dateFrom,
              dateTo,
              module:
                module || undefined,
              search:
                search || undefined,
            },
            responseType: 'blob',
          },
        );

      const url =
        URL.createObjectURL(
          new Blob(
            [response.data],
            {
              type:
                'text/csv;charset=utf-8',
            },
          ),
        );

      const link =
        document.createElement('a');

      link.href = url;
      link.download =
        `islem-gecmisi-${dateFrom}-${dateTo}.csv`;

      document.body.appendChild(
        link,
      );

      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    };

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
          title="İşlem Merkezi"
          subtitle="Salonunuzdaki kritik işlemleri, kullanıcı hareketlerini ve finansal aksiyonları izleyin."
          icon={<HistoryRounded />}
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
          >
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(3, 1fr)',
            },
            gap: 2,
            mb: 3,
          }}
        >
          <StatCard
            title="Toplam İşlem"
            value={summary.total}
            icon={<HistoryRounded />}
          />
          <StatCard
            title="Başarılı"
            value={summary.success}
            icon={<HistoryRounded />}
            accent="#16a34a"
            iconBackground="#ecfdf3"
          />
          <StatCard
            title="Başarısız"
            value={summary.failed}
            icon={<HistoryRounded />}
            accent="#dc2626"
            iconBackground="#fff1f2"
          />
        </Box>

        <SectionCard
          title="İşlem Geçmişi"
          subtitle="Tarih, modül ve arama filtresiyle kayıtları inceleyin."
          actions={
            <Stack
              direction={{
                xs: 'column',
                lg: 'row',
              }}
              spacing={1}
            >
              <TextField
                size="small"
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
                size="small"
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
                size="small"
                label="Modül"
                value={module}
                onChange={(event) =>
                  setModule(
                    event.target.value,
                  )
                }
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="">
                  Tüm modüller
                </MenuItem>

                {modules.map(
                  (item) => (
                    <MenuItem
                      key={item}
                      value={item}
                    >
                      {item}
                    </MenuItem>
                  ),
                )}
              </TextField>

              <TextField
                size="small"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Ara..."
                slotProps={{
                  input: {
                    startAdornment:
                      <SearchRounded
                        sx={{
                          mr: 1,
                          color:
                            '#94a3b8',
                        }}
                      />,
                  },
                }}
              />
            </Stack>
          }
        >
          {loading ? (
            <LoadingPage
              label="İşlem geçmişi yükleniyor..."
              minHeight={360}
            />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={<HistoryRounded />}
              title="Kayıt bulunamadı"
              description="Seçilen filtrelere uygun işlem kaydı yok."
            />
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 1120 }}>
                <TableHead>
                  <TableRow sx={{ background: '#f8fafc' }}>
                    <TableCell>Tarih</TableCell>
                    <TableCell>Kullanıcı</TableCell>
                    <TableCell>Modül</TableCell>
                    <TableCell>İşlem</TableCell>
                    <TableCell>Açıklama</TableCell>
                    <TableCell>Tutar</TableCell>
                    <TableCell>IP</TableCell>
                    <TableCell>Sonuç</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {logs.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        {new Date(
                          item.createdAt,
                        ).toLocaleString(
                          'tr-TR',
                        )}
                      </TableCell>

                      <TableCell>
                        {item.userName || 'Sistem'}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={item.module}
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell>
                        {item.action}
                      </TableCell>

                      <TableCell sx={{ fontWeight: 700 }}>
                        {item.description}
                      </TableCell>

                      <TableCell>
                        {item.amount !== null
                          ? `₺${Number(item.amount).toLocaleString('tr-TR')}`
                          : '—'}
                      </TableCell>

                      <TableCell>
                        {item.ipAddress || '—'}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            item.result === 'SUCCESS'
                              ? 'Başarılı'
                              : 'Başarısız'
                          }
                          color={
                            item.result === 'SUCCESS'
                              ? 'success'
                              : 'error'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </SectionCard>
      </PageContainer>
    </Box>
  );
}
