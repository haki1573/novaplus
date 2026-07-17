import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AddRounded,
  DevicesRounded,
  ErrorOutlineRounded,
  MemoryRounded,
  RouterRounded,
  SettingsEthernetRounded,
  SystemUpdateAltRounded,
  HistoryRounded,
  NotificationsActiveRounded,
  WifiOffRounded,
  WifiRounded,
} from '@mui/icons-material';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Snackbar,
  Tab,
  Tabs,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { Sidebar } from '../components/Sidebar';
import { PageHeader } from '../components/ui/PageHeader';
import { api } from '../services/api';

type DeviceType =
  | 'TURNSTILE'
  | 'LOCKER'
  | 'POS_TERMINAL'
  | 'QR_READER'
  | 'CAMERA'
  | 'SMART_SCALE'
  | 'VENDING_MACHINE'
  | 'GATEWAY'
  | 'OTHER';

type DeviceStatus =
  | 'ONLINE'
  | 'OFFLINE'
  | 'MAINTENANCE'
  | 'DISABLED'
  | 'ERROR';

type ConnectionType =
  | 'ETHERNET'
  | 'WIFI'
  | 'RS485'
  | 'USB'
  | 'SERIAL'
  | 'OTHER';

interface Device {
  id: string;
  type: DeviceType;
  name: string;
  serialNumber: string;
  manufacturer: string | null;
  model: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  location: string | null;
  firmwareVersion: string | null;
  latestFirmwareVersion: string | null;
  status: DeviceStatus;
  connectionType: ConnectionType;
  latencyMs: number | null;
  uptimeSeconds: number | null;
  lastSeen: string | null;
  lastRestartAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  isActive: boolean;
}

interface DashboardResponse {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  maintenanceDevices: number;
  errorDevices: number;
  errorsLast24Hours: number;
  updatePendingDevices: number;
  recentDevices: Device[];
}


interface DeviceEvent {
  id: string;
  deviceId: string | null;
  deviceName: string;
  deviceType: string;
  eventType: string;
  severity:
    | 'INFO'
    | 'WARNING'
    | 'CRITICAL';
  title: string;
  description: string;
  previousValue: string | null;
  currentValue: string | null;
  createdAt: string;
}

interface DeviceAlarm {
  id: string;
  title: string;
  description: string;
  severity:
    | 'INFO'
    | 'WARNING'
    | 'CRITICAL';
  isRead: boolean;
  createdAt: string;
}

const deviceLabels: Record<DeviceType, string> = {
  TURNSTILE: 'Turnike',
  LOCKER: 'Akıllı Dolap',
  POS_TERMINAL: 'POS Terminali',
  QR_READER: 'QR Okuyucu',
  CAMERA: 'Kamera',
  SMART_SCALE: 'Akıllı Tartı',
  VENDING_MACHINE: 'İçecek Otomatı',
  GATEWAY: 'Gateway',
  OTHER: 'Diğer',
};

function formatDate(value: string | null) {
  if (!value) return 'Henüz yok';

  return new Date(value).toLocaleString('tr-TR');
}

function formatUptime(seconds: number | null) {
  if (seconds === null) return '—';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);

  if (days > 0) return `${days} gün ${hours} saat`;

  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours} saat ${minutes} dk`;
}

export function DeviceCenter() {
  const [dashboard, setDashboard] =
    useState<DashboardResponse | null>(null);

  const [devices, setDevices] =
    useState<Device[]>([]);

  const [events, setEvents] =
    useState<DeviceEvent[]>([]);

  const [alarms, setAlarms] =
    useState<DeviceAlarm[]>([]);

  const [activeTab, setActiveTab] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [severity, setSeverity] =
    useState<'success' | 'error'>('success');

  const [typeFilter, setTypeFilter] =
    useState<'ALL' | DeviceType>('ALL');

  const [statusFilter, setStatusFilter] =
    useState<'ALL' | DeviceStatus>('ALL');

  const [form, setForm] = useState({
    type: 'TURNSTILE' as DeviceType,
    name: '',
    serialNumber: '',
    manufacturer: '',
    model: '',
    ipAddress: '',
    macAddress: '',
    location: '',
    firmwareVersion: '',
    latestFirmwareVersion: '',
    connectionType: 'ETHERNET' as ConnectionType,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [
        dashboardResponse,
        devicesResponse,
        eventsResponse,
        alarmsResponse,
      ] = await Promise.all([
        api.get<DashboardResponse>(
          '/devices/dashboard',
        ),
        api.get<Device[]>('/devices'),
        api.get<DeviceEvent[]>(
          '/device-events?limit=250',
        ),
        api.get<DeviceAlarm[]>(
          '/devices/alarms',
        ),
      ]);

      setDashboard(dashboardResponse.data);
      setDevices(devicesResponse.data);
      setEvents(eventsResponse.data);
      setAlarms(alarmsResponse.data);
    } catch {
      setSeverity('error');
      setMessage(
        'Device Center bilgileri alınamadı.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const interval = window.setInterval(
      () => void load(),
      30000,
    );

    return () =>
      window.clearInterval(interval);
  }, [load]);

  const visibleDevices = useMemo(
    () =>
      devices.filter(
        (device) =>
          (typeFilter === 'ALL' ||
            device.type === typeFilter) &&
          (statusFilter === 'ALL' ||
            device.status === statusFilter),
      ),
    [devices, typeFilter, statusFilter],
  );

  const createDevice = async () => {
    try {
      setSaving(true);

      await api.post('/devices', {
        ...form,
        manufacturer:
          form.manufacturer || undefined,
        model: form.model || undefined,
        ipAddress:
          form.ipAddress || undefined,
        macAddress:
          form.macAddress || undefined,
        location:
          form.location || undefined,
        firmwareVersion:
          form.firmwareVersion || undefined,
        latestFirmwareVersion:
          form.latestFirmwareVersion ||
          undefined,
      });

      setDialogOpen(false);
      setForm({
        type: 'TURNSTILE',
        name: '',
        serialNumber: '',
        manufacturer: '',
        model: '',
        ipAddress: '',
        macAddress: '',
        location: '',
        firmwareVersion: '',
        latestFirmwareVersion: '',
        connectionType: 'ETHERNET',
      });

      setSeverity('success');
      setMessage('Cihaz başarıyla eklendi.');
      await load();
    } catch {
      setSeverity('error');
      setMessage('Cihaz eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !dashboard) {
    return (
      <Box
        sx={{
          py: 10,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const stats = [
    {
      label: 'Toplam Cihaz',
      value: dashboard?.totalDevices ?? 0,
      icon: <DevicesRounded />,
    },
    {
      label: 'Online',
      value: dashboard?.onlineDevices ?? 0,
      icon: <WifiRounded />,
    },
    {
      label: 'Offline',
      value: dashboard?.offlineDevices ?? 0,
      icon: <WifiOffRounded />,
    },
    {
      label: 'Bakımda',
      value: dashboard?.maintenanceDevices ?? 0,
      icon: <MemoryRounded />,
    },
    {
      label: 'Firmware Bekleyen',
      value:
        dashboard?.updatePendingDevices ?? 0,
      icon: <SystemUpdateAltRounded />,
    },
    {
      label: 'Son 24 Saat Hata',
      value:
        dashboard?.errorsLast24Hours ?? 0,
      icon: <ErrorOutlineRounded />,
    },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: '100vh',
          p: { xs: 2, md: 3 },
          bgcolor: '#f4f7fb',
        }}
      >
        <PageHeader
          eyebrow="NOVA IOT"
          title="Nova Device Center"
          subtitle="Salon cihazlarını, bağlantı durumlarını, firmware sürümlerini ve sistem sağlığını tek merkezden yönetin."
          icon={<DevicesRounded />}
          actions={
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={() =>
                setDialogOpen(true)
              }
            >
              Cihaz Ekle
            </Button>
          }
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              xl: 'repeat(6, minmax(0, 1fr))',
            },
            gap: 2,
            mb: 3,
          }}
        >
          {stats.map((stat) => (
            <Card
              key={stat.label}
              elevation={0}
              sx={{
                border: '1px solid #e5e7eb',
                borderRadius: 3,
              }}
            >
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography
                      sx={{
                        color: '#667085',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {stat.label}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.6,
                        fontSize: 27,
                        fontWeight: 900,
                      }}
                    >
                      {stat.value}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 2,
                      color: '#2563eb',
                      bgcolor: '#eff6ff',
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        {alarms.length > 0 && (
          <Alert
            severity="warning"
            icon={
              <NotificationsActiveRounded />
            }
            sx={{
              mb: 2,
              borderRadius: 3,
            }}
          >
            <Typography
              sx={{ fontWeight: 900 }}
            >
              {alarms.length} aktif cihaz alarmı
            </Typography>

            <Typography
              sx={{ fontSize: 12 }}
            >
              {alarms
                .slice(0, 3)
                .map(
                  (alarm) =>
                    alarm.title,
                )
                .join(' · ')}
            </Typography>
          </Alert>
        )}

        <Box
          sx={{
            mb: 2,
            borderBottom:
              '1px solid #e5e7eb',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(
              _event,
              value: number,
            ) => setActiveTab(value)}
          >
            <Tab
              icon={<DevicesRounded />}
              iconPosition="start"
              label="Cihazlar"
            />

            <Tab
              icon={<HistoryRounded />}
              iconPosition="start"
              label={`Olay Geçmişi (${events.length})`}
            />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <>
        <Stack
          direction={{
            xs: 'column',
            md: 'row',
          }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <TextField
            select
            size="small"
            label="Cihaz Türü"
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value as
                  | 'ALL'
                  | DeviceType,
              )
            }
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="ALL">
              Tüm Cihazlar
            </MenuItem>

            {Object.entries(deviceLabels).map(
              ([value, label]) => (
                <MenuItem
                  key={value}
                  value={value}
                >
                  {label}
                </MenuItem>
              ),
            )}
          </TextField>

          <TextField
            select
            size="small"
            label="Durum"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | 'ALL'
                  | DeviceStatus,
              )
            }
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="ALL">
              Tüm Durumlar
            </MenuItem>

            {[
              'ONLINE',
              'OFFLINE',
              'MAINTENANCE',
              'ERROR',
              'DISABLED',
            ].map((status) => (
              <MenuItem
                key={status}
                value={status}
              >
                {status}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              xl: 'repeat(2, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          {visibleDevices.map((device) => (
            <Card
              key={device.id}
              elevation={0}
              sx={{
                border: '1px solid #e5e7eb',
                borderRadius: 3,
              }}
            >
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Stack
                    direction="row"
                    spacing={1.5}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor:
                          device.status ===
                          'ONLINE'
                            ? '#ecfdf3'
                            : device.status ===
                                'ERROR'
                              ? '#fef2f2'
                              : '#f8fafc',
                        color:
                          device.status ===
                          'ONLINE'
                            ? '#16a34a'
                            : device.status ===
                                'ERROR'
                              ? '#dc2626'
                              : '#64748b',
                      }}
                    >
                      {device.type ===
                      'GATEWAY' ? (
                        <RouterRounded />
                      ) : (
                        <SettingsEthernetRounded />
                      )}
                    </Box>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 18,
                          fontWeight: 900,
                        }}
                      >
                        {device.name}
                      </Typography>

                      <Typography
                        sx={{
                          color: '#667085',
                          fontSize: 12,
                        }}
                      >
                        {deviceLabels[device.type]}
                        {' · '}
                        {device.serialNumber}
                      </Typography>
                    </Box>
                  </Stack>

                  <Chip
                    size="small"
                    color={
                      device.status === 'ONLINE'
                        ? 'success'
                        : device.status ===
                            'MAINTENANCE'
                          ? 'warning'
                          : device.status ===
                              'ERROR'
                            ? 'error'
                            : 'default'
                    }
                    label={device.status}
                  />
                </Stack>

                <Box
                  sx={{
                    mt: 2,
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(2, minmax(0, 1fr))',
                    gap: 1.2,
                  }}
                >
                  <Info
                    label="Bağlantı"
                    value={device.connectionType}
                  />

                  <Info
                    label="IP"
                    value={device.ipAddress || '—'}
                  />

                  <Info
                    label="Heartbeat"
                    value={formatDate(
                      device.lastSeen,
                    )}
                  />

                  <Info
                    label="Gecikme"
                    value={
                      device.latencyMs !== null
                        ? `${device.latencyMs} ms`
                        : '—'
                    }
                  />

                  <Info
                    label="Firmware"
                    value={
                      device.firmwareVersion ||
                      '—'
                    }
                  />

                  <Info
                    label="Çalışma Süresi"
                    value={formatUptime(
                      device.uptimeSeconds,
                    )}
                  />
                </Box>

                {device.lastError && (
                  <Alert
                    severity="error"
                    sx={{ mt: 2 }}
                  >
                    {device.lastError}
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>

          </>

        )}

        {activeTab === 1 && (
          <Card
            elevation={0}
            sx={{
              border:
                '1px solid #e5e7eb',
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Typography
                sx={{
                  mb: 2,
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                Cihaz Olay Geçmişi
              </Typography>

              <Stack spacing={1}>
                {events.length === 0 && (
                  <Alert severity="info">
                    Henüz cihaz olayı bulunmuyor.
                  </Alert>
                )}

                {events.map((event) => (
                  <Box
                    key={event.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border:
                        '1px solid #eef2f7',
                      bgcolor: '#f8fafc',
                    }}
                  >
                    <Stack
                      direction={{
                        xs: 'column',
                        sm: 'row',
                      }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                        >
                          <Typography
                            sx={{
                              fontWeight: 900,
                            }}
                          >
                            {event.deviceName}
                          </Typography>

                          <Chip
                            size="small"
                            label={
                              event.eventType
                            }
                            color={
                              event.severity ===
                              'CRITICAL'
                                ? 'error'
                                : event.severity ===
                                    'WARNING'
                                  ? 'warning'
                                  : 'default'
                            }
                          />
                        </Stack>

                        <Typography
                          sx={{
                            mt: 0.4,
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          {event.title}
                        </Typography>

                        <Typography
                          sx={{
                            color: '#667085',
                            fontSize: 12,
                          }}
                        >
                          {event.description}
                        </Typography>
                      </Box>

                      <Typography
                        sx={{
                          color: '#98a2b3',
                          fontSize: 11,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(
                          event.createdAt,
                        )}
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        <Dialog
          open={dialogOpen}
          onClose={() =>
            setDialogOpen(false)
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Yeni Cihaz
          </DialogTitle>

          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <TextField
                select
                label="Cihaz Türü"
                value={form.type}
                onChange={(event) =>
                  setForm({
                    ...form,
                    type:
                      event.target
                        .value as DeviceType,
                  })
                }
              >
                {Object.entries(
                  deviceLabels,
                ).map(([value, label]) => (
                  <MenuItem
                    key={value}
                    value={value}
                  >
                    {label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Cihaz Adı"
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name:
                      event.target.value,
                  })
                }
              />

              <TextField
                label="Seri Numarası"
                value={form.serialNumber}
                onChange={(event) =>
                  setForm({
                    ...form,
                    serialNumber:
                      event.target.value,
                  })
                }
              />

              <TextField
                select
                label="Bağlantı Türü"
                value={
                  form.connectionType
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    connectionType:
                      event.target
                        .value as ConnectionType,
                  })
                }
              >
                {[
                  'ETHERNET',
                  'WIFI',
                  'RS485',
                  'USB',
                  'SERIAL',
                  'OTHER',
                ].map((value) => (
                  <MenuItem
                    key={value}
                    value={value}
                  >
                    {value}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Üretici"
                value={form.manufacturer}
                onChange={(event) =>
                  setForm({
                    ...form,
                    manufacturer:
                      event.target.value,
                  })
                }
              />

              <TextField
                label="Model"
                value={form.model}
                onChange={(event) =>
                  setForm({
                    ...form,
                    model:
                      event.target.value,
                  })
                }
              />

              <TextField
                label="IP Adresi"
                value={form.ipAddress}
                onChange={(event) =>
                  setForm({
                    ...form,
                    ipAddress:
                      event.target.value,
                  })
                }
              />

              <TextField
                label="MAC Adresi"
                value={form.macAddress}
                onChange={(event) =>
                  setForm({
                    ...form,
                    macAddress:
                      event.target.value,
                  })
                }
              />

              <TextField
                label="Konum"
                value={form.location}
                onChange={(event) =>
                  setForm({
                    ...form,
                    location:
                      event.target.value,
                  })
                }
              />

              <TextField
                label="Firmware"
                value={
                  form.firmwareVersion
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    firmwareVersion:
                      event.target.value,
                  })
                }
              />
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() =>
                setDialogOpen(false)
              }
            >
              Vazgeç
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void createDevice()
              }
              disabled={
                saving ||
                !form.name.trim() ||
                !form.serialNumber.trim()
              }
            >
              Kaydet
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={Boolean(message)}
          autoHideDuration={5000}
          onClose={() =>
            setMessage('')
          }
        >
          <Alert
            severity={severity}
            variant="filled"
            onClose={() =>
              setMessage('')
            }
          >
            {message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Box>
      <Typography
        sx={{
          color: '#98a2b3',
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          mt: 0.2,
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
