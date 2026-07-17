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
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
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
  Tooltip,
  Typography,
} from '@mui/material';

import {
  AddRounded,
  BadgeRounded,
  DeleteRounded,
  EditRounded,
  GroupsRounded,
  LoginRounded,
  LogoutRounded,
  PersonRounded,
  ScheduleRounded,
  SearchRounded,
  TimerRounded,
  DownloadRounded,
  DateRangeRounded,
} from '@mui/icons-material';

import { Sidebar } from '../components/Sidebar';
import { api } from '../services/api';

import { PageContainer } from '../components/ui/PageContainer';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { LoadingPage } from '../components/ui/LoadingPage';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatusChip } from '../components/ui/StatusChip';

type StaffRole =
  | 'MANAGER'
  | 'RECEPTION'
  | 'TRAINER'
  | 'CLEANING'
  | 'ACCOUNTING'
  | 'OTHER';

type PermissionMap = {
  dashboard: boolean;
  members: boolean;
  finance: boolean;
  sms: boolean;
  lockers: boolean;
  cafe: boolean;
  reports: boolean;
  checkIn: boolean;
  accessCards: boolean;
  settings: boolean;
};

type StaffItem = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  role: StaffRole;
  cardCode: string | null;
  qrCode: string | null;
  employmentStartDate: string | null;
  isActive: boolean;
  permission?: PermissionMap;
};

type AttendanceItem = {
  id: string;
  staffId: string;
  workDate: string;
  checkInTime: string;
  checkOutTime: string | null;
  durationMinutes: number;
  accessType: 'CARD' | 'QR';
  accessCode: string;
  staff: StaffItem;
};

type DailySummaryItem = {
  staffId: string;
  fullName: string;
  firstCheckIn: string;
  lastCheckOut: string | null;
  totalMinutes: number;
  isInside: boolean;
  sessions: number;
};

type DailySummary = {
  date: string;
  totalStaff: number;
  insideNow: number;
  totalMinutes: number;
  items: DailySummaryItem[];
};

type WeeklyDay = {
  date: string;
  firstCheckIn: string;
  lastCheckOut: string | null;
  totalMinutes: number;
  sessions: number;
  isInside: boolean;
};

type WeeklySummaryItem = {
  staffId: string;
  fullName: string;
  role: StaffRole;
  totalMinutes: number;
  totalSessions: number;
  workedDays: number;
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  averageDailyMinutes: number;
  days: WeeklyDay[];
};

type WeeklySummary = {
  dateFrom: string;
  dateTo: string;
  totalStaff: number;
  totalMinutes: number;
  totalSessions: number;
  items: WeeklySummaryItem[];
};

const emptyPermissions: PermissionMap = {
  dashboard: true,
  members: true,
  finance: false,
  sms: false,
  lockers: false,
  cafe: false,
  reports: false,
  checkIn: true,
  accessCards: false,
  settings: false,
};

const emptyForm = {
  fullName: '',
  phone: '',
  email: '',
  role: 'OTHER' as StaffRole,
  cardCode: '',
  qrCode: '',
  employmentStartDate: '',
  isActive: true,
  permissions: { ...emptyPermissions },
};

const roleLabels: Record<StaffRole, string> = {
  MANAGER: 'Yönetici',
  RECEPTION: 'Resepsiyon',
  TRAINER: 'Eğitmen',
  CLEANING: 'Temizlik',
  ACCOUNTING: 'Muhasebe',
  OTHER: 'Diğer',
};

const permissionLabels: Array<{
  key: keyof PermissionMap;
  label: string;
}> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'members', label: 'Üyeler' },
  { key: 'finance', label: 'Finans' },
  { key: 'sms', label: 'SMS' },
  { key: 'lockers', label: 'Dolaplar' },
  { key: 'cafe', label: 'Kafe' },
  { key: 'reports', label: 'Raporlar' },
  { key: 'checkIn', label: 'Check-in' },
  { key: 'accessCards', label: 'Kart & QR' },
  { key: 'settings', label: 'Ayarlar' },
];

function formatTime(value?: string | null) {
  if (!value) return '—';

  return new Date(value).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number) {
  const total = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(total / 60);
  const remaining = total % 60;

  return `${hours}s ${remaining}dk`;
}

function addDays(
  date: string,
  amount: number,
) {
  const value = new Date(
    `${date}T00:00:00`,
  );

  value.setDate(
    value.getDate() + amount,
  );

  return value
    .toISOString()
    .slice(0, 10);
}

function startOfWeek(
  date: string,
) {
  const value = new Date(
    `${date}T00:00:00`,
  );

  const day =
    value.getDay() || 7;

  value.setDate(
    value.getDate() - day + 1,
  );

  return value
    .toISOString()
    .slice(0, 10);
}

function getError(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const message = (
      error as {
        response?: {
          data?: {
            message?: string | string[];
          };
        };
      }
    ).response?.data?.message;

    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }

  return 'Personel işlemi sırasında hata oluştu.';
}

export function Staff() {
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [summary, setSummary] = useState<DailySummary>({
    date: '',
    totalStaff: 0,
    insideNow: 0,
    totalMinutes: 0,
    items: [],
  });

  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [dateFrom, setDateFrom] =
    useState(
      startOfWeek(
        new Date()
          .toISOString()
          .slice(0, 10),
      ),
    );

  const [dateTo, setDateTo] =
    useState(
      addDays(
        startOfWeek(
          new Date()
            .toISOString()
            .slice(0, 10),
        ),
        6,
      ),
    );

  const [staffFilter, setStaffFilter] =
    useState('');

  const [weekly, setWeekly] =
    useState<WeeklySummary>({
      dateFrom: '',
      dateTo: '',
      totalStaff: 0,
      totalMinutes: 0,
      totalSessions: 0,
      items: [],
    });

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [
        staffResponse,
        attendanceResponse,
        summaryResponse,
        weeklyResponse,
      ] = await Promise.all([
        api.get<StaffItem[]>('/staff'),

        api.get<AttendanceItem[]>(
          '/staff/attendance',
          {
            params: {
              dateFrom:
                tab === 2
                  ? dateFrom
                  : date,
              dateTo:
                tab === 2
                  ? dateTo
                  : date,
              staffId:
                staffFilter ||
                undefined,
            },
          },
        ),

        api.get<DailySummary>(
          '/staff/attendance/daily-summary',
          {
            params: {
              date,
            },
          },
        ),

        api.get<WeeklySummary>(
          '/staff/attendance/weekly-summary',
          {
            params: {
              dateFrom,
              dateTo,
              staffId:
                staffFilter ||
                undefined,
            },
          },
        ),
      ]);

      setStaff(staffResponse.data);
      setAttendance(attendanceResponse.data);
      setSummary(summaryResponse.data);
      setWeekly(weeklyResponse.data);
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getError(error),
      });
    } finally {
      setLoading(false);
    }
  }, [date, dateFrom, dateTo, staffFilter, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const summaryMap = useMemo(
    () =>
      new Map(
        summary.items.map((item) => [
          item.staffId,
          item,
        ]),
      ),
    [summary],
  );

  const filteredStaff = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase('tr-TR');

    if (!query) return staff;

    return staff.filter((item) =>
      [
        item.fullName,
        item.phone,
        item.email,
        roleLabels[item.role],
        item.cardCode || '',
        item.qrCode || '',
      ]
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(query),
    );
  }, [search, staff]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: StaffItem) => {
    setEditing(item);
    setForm({
      fullName: item.fullName,
      phone: item.phone || '',
      email: item.email || '',
      role: item.role,
      cardCode: item.cardCode || '',
      qrCode: item.qrCode || '',
      employmentStartDate:
        item.employmentStartDate || '',
      isActive: item.isActive,
      permissions: {
        ...emptyPermissions,
        ...(item.permission || {}),
      },
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.fullName.trim()) {
      setFeedback({
        type: 'error',
        text: 'Personel adı zorunludur.',
      });
      return;
    }

    if (!form.cardCode.trim() && !form.qrCode.trim()) {
      setFeedback({
        type: 'error',
        text: 'Kart veya QR kodundan en az biri zorunludur.',
      });
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      role: form.role,
      cardCode: form.cardCode.trim() || null,
      qrCode: form.qrCode.trim() || null,
      employmentStartDate:
        form.employmentStartDate || null,
      isActive: form.isActive,
      permissions: form.permissions,
    };

    try {
      if (editing) {
        await api.patch(`/staff/${editing.id}`, payload);
      } else {
        await api.post('/staff', payload);
      }

      setDialogOpen(false);
      setFeedback({
        type: 'success',
        text: editing
          ? 'Personel güncellendi.'
          : 'Personel oluşturuldu.',
      });

      await load();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getError(error),
      });
    }
  };

  const archive = async () => {
    if (!deleteId) return;

    try {
      await api.delete(`/staff/${deleteId}`);
      setDeleteId(null);
      setFeedback({
        type: 'success',
        text: 'Personel arşivlendi.',
      });
      await load();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getError(error),
      });
    }
  };

  const exportCsv = async () => {
    try {
      const response =
        await api.get(
          '/staff/attendance/export.csv',
          {
            params: {
              dateFrom,
              dateTo,
              staffId:
                staffFilter ||
                undefined,
            },
            responseType: 'blob',
          },
        );

      const url =
        window.URL.createObjectURL(
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
        `personel-raporu-${dateFrom}-${dateTo}.csv`;

      document.body.appendChild(
        link,
      );

      link.click();
      link.remove();

      window.URL.revokeObjectURL(
        url,
      );
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getError(error),
      });
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

      <PageContainer>
        <PageHeader
          eyebrow="NOVAPLUS+"
          title="Personel Yönetimi"
          subtitle="Personel kayıtlarını, turnike hareketlerini ve günlük çalışma sürelerini yönetin."
          icon={<BadgeRounded />}
          actions={
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={openCreate}
            >
              Yeni Personel
            </Button>
          }
        />

        {feedback && (
          <Alert
            severity={feedback.type}
            sx={{ mb: 3 }}
            onClose={() => setFeedback(null)}
          >
            {feedback.text}
          </Alert>
        )}

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
          <StatCard
            title="Toplam Personel"
            value={staff.length}
            icon={<GroupsRounded />}
            accent="#2563eb"
            iconBackground="#eff6ff"
          />

          <StatCard
            title="Bugün Gelen"
            value={summary.totalStaff}
            icon={<LoginRounded />}
            accent="#16a34a"
            iconBackground="#ecfdf3"
          />

          <StatCard
            title="Şu Anda İçeride"
            value={summary.insideNow}
            icon={<PersonRounded />}
            accent="#7c3aed"
            iconBackground="#f5f3ff"
          />

          <StatCard
            title="Bugünkü Toplam Çalışma"
            value={formatDuration(summary.totalMinutes)}
            icon={<TimerRounded />}
            accent="#d97706"
            iconBackground="#fffbeb"
          />
        </Box>

        <SectionCard
          title="Personel Takibi"
          subtitle="Günlük personel durumu ve çalışma çizelgesi"
          actions={
            <Stack
              direction={{
                xs: 'column',
                lg: 'row',
              }}
              spacing={1}

            
            sx={{ alignItems: {
                xs: 'stretch',
                lg: 'center',
              } }}>
              {tab === 2 ? (
                <>
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
                    label="Personel"
                    value={staffFilter}
                    onChange={(event) =>
                      setStaffFilter(
                        event.target.value,
                      )
                    }
                    sx={{
                      minWidth: 190,
                    }}
                  >
                    <MenuItem value="">
                      Tüm personeller
                    </MenuItem>

                    {staff.map((item) => (
                      <MenuItem
                        key={item.id}
                        value={item.id}
                      >
                        {item.fullName}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Button
                    variant="outlined"
                    startIcon={
                      <DownloadRounded />
                    }
                    onClick={() =>
                      void exportCsv()
                    }
                  >
                    CSV / Excel
                  </Button>
                </>
              ) : (
                <>
                  <TextField
                    size="small"
                    type="date"
                    value={date}
                    onChange={(event) =>
                      setDate(
                        event.target.value,
                      )
                    }
                  />

                  <TextField
                    size="small"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Personel ara..."
                    slotProps={{
                      input: {
                        startAdornment: (
                          <SearchRounded
                            sx={{
                              mr: 1,
                              color:
                                '#94a3b8',
                            }}
                          />
                        ),
                      },
                    }}
                  />
                </>
              )}
            </Stack>
          }
        >
          <Tabs
            value={tab}
            onChange={(_event, value: number) =>
              setTab(value)
            }
            sx={{
              px: 2,
              borderBottom: '1px solid #eef2f7',
            }}
          >
            <Tab label="Personel Listesi" />
            <Tab label="Günlük Çizelge" />
            <Tab
              icon={<DateRangeRounded />}
              iconPosition="start"
              label="Haftalık Rapor"
            />
          </Tabs>

          {loading ? (
            <LoadingPage
              label="Personel verileri yükleniyor..."
              minHeight={320}
            />
          ) : tab === 0 ? (
            filteredStaff.length === 0 ? (
              <EmptyState
                icon={<GroupsRounded />}
                title="Personel bulunamadı"
                description="Yeni personel ekleyerek başlayabilirsiniz."
              />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 1120 }}>
                  <TableHead>
                    <TableRow sx={{ background: '#f8fafc' }}>
                      <TableCell>Personel</TableCell>
                      <TableCell>Görev</TableCell>
                      <TableCell>Kart / QR</TableCell>
                      <TableCell>İlk Giriş</TableCell>
                      <TableCell>Son Çıkış</TableCell>
                      <TableCell>Toplam Süre</TableCell>
                      <TableCell>Durum</TableCell>
                      <TableCell align="center">
                        İşlemler
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {filteredStaff.map((item) => {
                      const today = summaryMap.get(item.id);

                      return (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Typography sx={{ fontWeight: 900 }}>
                              {item.fullName}
                            </Typography>
                            <Typography
                              sx={{
                                color: '#64748b',
                                fontSize: 12,
                              }}
                            >
                              {item.phone || item.email || '—'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={roleLabels[item.role]}
                              variant="outlined"
                            />
                          </TableCell>

                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography
                                component="code"
                                sx={{ fontSize: 12 }}
                              >
                                {item.cardCode || 'Kart yok'}
                              </Typography>
                              <Typography
                                component="code"
                                sx={{
                                  color: '#64748b',
                                  fontSize: 12,
                                }}
                              >
                                {item.qrCode || 'QR yok'}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell>
                            {formatTime(today?.firstCheckIn)}
                          </TableCell>

                          <TableCell>
                            {formatTime(today?.lastCheckOut)}
                          </TableCell>

                          <TableCell sx={{ fontWeight: 800 }}>
                            {formatDuration(
                              today?.totalMinutes || 0,
                            )}
                          </TableCell>

                          <TableCell>
                            {today?.isInside ? (
                              <StatusChip
                                label="İçeride"
                                tone="success"
                              />
                            ) : item.isActive ? (
                              <StatusChip
                                label="Çıkış Yaptı"
                                tone="neutral"
                              />
                            ) : (
                              <StatusChip
                                label="Pasif"
                                tone="error"
                              />
                            )}
                          </TableCell>

                          <TableCell align="center">
                            <Tooltip title="Düzenle">
                              <IconButton
                                color="primary"
                                onClick={() => openEdit(item)}
                              >
                                <EditRounded />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Arşivle">
                              <IconButton
                                color="error"
                                onClick={() =>
                                  setDeleteId(item.id)
                                }
                              >
                                <DeleteRounded />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )
          ) : tab === 1 ? (
            attendance.length === 0 ? (
              <EmptyState
                icon={<ScheduleRounded />}
                title="Bu tarihte kayıt bulunamadı"
                description="Personel turnikeden geçtiğinde kayıtlar burada görünecek."
              />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 900 }}>
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
                    {attendance.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ fontWeight: 900 }}>
                          {item.staff?.fullName || 'Personel'}
                        </TableCell>
                        <TableCell>{item.workDate}</TableCell>
                        <TableCell>
                          {formatTime(item.checkInTime)}
                        </TableCell>
                        <TableCell>
                          {item.checkOutTime ? (
                            formatTime(item.checkOutTime)
                          ) : (
                            <StatusChip
                              label="İçeride"
                              tone="success"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDuration(item.durationMinutes)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.accessType}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )
          ) : weekly.items.length === 0 ? (
            <EmptyState
              icon={<DateRangeRounded />}
              title="Seçilen aralıkta çalışma kaydı yok"
              description="Tarih aralığını veya personel filtresini değiştirin."
            />
          ) : (
            <>
              <Box
                sx={{
                  p: 2,
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(3, 1fr)',
                  },
                  gap: 2,
                  borderBottom:
                    '1px solid #eef2f7',
                }}
              >
                <StatCard
                  title="Rapordaki Personel"
                  value={weekly.totalStaff}
                  icon={<GroupsRounded />}
                />

                <StatCard
                  title="Toplam Çalışma"
                  value={formatDuration(
                    weekly.totalMinutes,
                  )}
                  icon={<TimerRounded />}
                  accent="#16a34a"
                  iconBackground="#ecfdf3"
                />

                <StatCard
                  title="Toplam Oturum"
                  value={weekly.totalSessions}
                  icon={<ScheduleRounded />}
                  accent="#7c3aed"
                  iconBackground="#f5f3ff"
                />
              </Box>

              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 1050 }}>
                  <TableHead>
                    <TableRow sx={{ background: '#f8fafc' }}>
                      <TableCell>Personel</TableCell>
                      <TableCell>Görev</TableCell>
                      <TableCell>Çalışılan Gün</TableCell>
                      <TableCell>Oturum</TableCell>
                      <TableCell>Toplam Süre</TableCell>
                      <TableCell>Günlük Ortalama</TableCell>
                      <TableCell>İlk Giriş</TableCell>
                      <TableCell>Son Çıkış</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {weekly.items.map((item) => (
                      <TableRow key={item.staffId} hover>
                        <TableCell sx={{ fontWeight: 900 }}>
                          {item.fullName}
                        </TableCell>
                        <TableCell>
                          {roleLabels[item.role]}
                        </TableCell>
                        <TableCell>
                          {item.workedDays}
                        </TableCell>
                        <TableCell>
                          {item.totalSessions}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>
                          {formatDuration(item.totalMinutes)}
                        </TableCell>
                        <TableCell>
                          {formatDuration(
                            item.averageDailyMinutes,
                          )}
                        </TableCell>
                        <TableCell>
                          {formatTime(item.firstCheckIn)}
                        </TableCell>
                        <TableCell>
                          {formatTime(item.lastCheckOut)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </>
          )}
        </SectionCard>
      </PageContainer>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {editing ? 'Personeli Düzenle' : 'Yeni Personel'}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2.25} sx={{ mt: 1 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '1fr 1fr',
                },
                gap: 2,
              }}
            >
              <TextField
                label="Ad Soyad"
                value={form.fullName}
                onChange={(event) =>
                  setForm({
                    ...form,
                    fullName: event.target.value,
                  })
                }
                fullWidth
              />

              <TextField
                select
                label="Görev"
                value={form.role}
                onChange={(event) =>
                  setForm({
                    ...form,
                    role: event.target.value as StaffRole,
                  })
                }
                fullWidth
              >
                {Object.entries(roleLabels).map(
                  ([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ),
                )}
              </TextField>

              <TextField
                label="Telefon"
                value={form.phone}
                onChange={(event) =>
                  setForm({
                    ...form,
                    phone: event.target.value,
                  })
                }
                fullWidth
              />

              <TextField
                label="E-posta"
                value={form.email}
                onChange={(event) =>
                  setForm({
                    ...form,
                    email: event.target.value,
                  })
                }
                fullWidth
              />

              <TextField
                label="Kart Kodu"
                value={form.cardCode}
                onChange={(event) =>
                  setForm({
                    ...form,
                    cardCode: event.target.value,
                  })
                }
                placeholder="STAFF-CARD-001"
                fullWidth
              />

              <TextField
                label="QR Kodu"
                value={form.qrCode}
                onChange={(event) =>
                  setForm({
                    ...form,
                    qrCode: event.target.value,
                  })
                }
                placeholder="STAFF-QR-001"
                fullWidth
              />

              <TextField
                type="date"
                label="İşe Başlama Tarihi"
                value={form.employmentStartDate}
                onChange={(event) =>
                  setForm({
                    ...form,
                    employmentStartDate:
                      event.target.value,
                  })
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
              />

              <TextField
                select
                label="Durum"
                value={form.isActive ? 'ACTIVE' : 'PASSIVE'}
                onChange={(event) =>
                  setForm({
                    ...form,
                    isActive:
                      event.target.value === 'ACTIVE',
                  })
                }
                fullWidth
              >
                <MenuItem value="ACTIVE">Aktif</MenuItem>
                <MenuItem value="PASSIVE">Pasif</MenuItem>
              </TextField>
            </Box>

            <Box>
              <Typography
                sx={{
                  mb: 1,
                  fontWeight: 900,
                }}
              >
                Salon Yetkileri
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr 1fr',
                    md: 'repeat(5, 1fr)',
                  },
                  gap: 0.5,
                }}
              >
                {permissionLabels.map((item) => (
                  <FormControlLabel
                    key={item.key}
                    control={
                      <Checkbox
                        checked={form.permissions[item.key]}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            permissions: {
                              ...form.permissions,
                              [item.key]: event.target.checked,
                            },
                          })
                        }
                      />
                    }
                    label={item.label}
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDialogOpen(false)}>
            İptal
          </Button>
          <Button
            variant="contained"
            onClick={() => void save()}
          >
            {editing ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Personeli arşivle"
        description="Bu personel listeden kaldırılacak; geçmiş giriş ve çıkış kayıtları korunacaktır."
        confirmLabel="Arşivle"
        destructive
        onClose={() => setDeleteId(null)}
        onConfirm={() => void archive()}
      />
    </Box>
  );
}
