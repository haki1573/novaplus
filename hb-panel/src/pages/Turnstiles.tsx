import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  AddRounded,
  DoorFrontRounded,
  EmergencyRounded,
  SensorsRounded,
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
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  Sidebar,
} from '../components/Sidebar';

import {
  PageHeader,
} from '../components/ui/PageHeader';

import {
  api,
} from '../services/api';

type Direction =
  | 'ENTRY'
  | 'EXIT'
  | 'BOTH'
  | 'STAFF'
  | 'VIP';

type Status =
  | 'ONLINE'
  | 'OFFLINE'
  | 'MAINTENANCE';

interface Turnstile {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  ipAddress: string | null;
  location: string | null;
  direction: Direction;
  status: Status;
  isActive: boolean;
  lastHeartbeatAt: string | null;
  lastPassageAt: string | null;
  firmwareVersion: string | null;
  latencyMs: number | null;
  lastError: string | null;
}

interface TurnstileEvent {
  id: string;
  turnstileId?: string;
  turnstileName: string;
  memberName: string | null;
  credentialType: string | null;
  direction: string;
  result: string;
  reason: string | null;
  createdAt: string;
}

interface DashboardResponse {
  summary: {
    total: number;
    online: number;
    offline: number;
    maintenance: number;
    approvedToday: number;
    rejectedToday: number;
  };
  turnstiles: Turnstile[];
  recentEvents: TurnstileEvent[];
}

interface OrganizationDashboardResponse {
  organizationId: string;
  summary: {
    totalGyms: number;
    totalTurnstiles: number;
    online: number;
    offline: number;
    maintenance: number;
    approvedToday: number;
    rejectedToday: number;
  };
  gyms: Array<{
    gymId: string;
    gymName: string;
    city: string | null;
    isActive: boolean;
    summary: DashboardResponse['summary'];
    turnstiles: Turnstile[];
  }>;
  recentEvents: TurnstileEvent[];
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return 'Henüz yok';
  }

  return new Date(
    value,
  ).toLocaleString(
    'tr-TR',
  );
}

export function Turnstiles() {
  const [data, setData] =
    useState<DashboardResponse | null>(
      null,
    );

  const [
    organizationData,
    setOrganizationData,
  ] = useState<
    OrganizationDashboardResponse | null
  >(null);

  const [
    selectedGymId,
    setSelectedGymId,
  ] = useState<string>('ALL');

  const [loading, setLoading] =
    useState(true);

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [emergencyOpen, setEmergencyOpen] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [severity, setSeverity] =
    useState<
      'success' | 'error'
    >('success');

  const [form, setForm] =
    useState({
      name: '',
      brand: '',
      model: '',
      serialNumber: '',
      ipAddress: '',
      location: '',
      direction:
        'BOTH' as Direction,
      firmwareVersion: '',
    });

  const load =
    useCallback(async () => {
      try {
        setLoading(true);

        try {
          const organizationResponse =
            await api.get<OrganizationDashboardResponse>(
              '/turnstiles/organization-dashboard',
            );

          if (
            organizationResponse.data
              .summary.totalGyms > 0
          ) {
            setOrganizationData(
              organizationResponse.data,
            );
            setData(null);
            return;
          }
        } catch {
          setOrganizationData(null);
        }

        const response =
          await api.get<DashboardResponse>(
            '/turnstiles/dashboard',
          );

        setData(
          response.data,
        );
      } catch {
        setSeverity('error');
        setMessage(
          'Turnike bilgileri alınamadı.',
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void load();

    const interval =
      window.setInterval(
        () => {
          void load();
        },
        30000,
      );

    return () =>
      window.clearInterval(
        interval,
      );
  }, [load]);

  const createTurnstile =
    async () => {
      try {
        setSaving(true);

        await api.post(
          '/turnstiles',
          {
            ...form,
            brand:
              form.brand || null,
            model:
              form.model || null,
            serialNumber:
              form.serialNumber ||
              null,
            ipAddress:
              form.ipAddress ||
              null,
            location:
              form.location || null,
            firmwareVersion:
              form.firmwareVersion ||
              null,
          },
        );

        setDialogOpen(false);

        setForm({
          name: '',
          brand: '',
          model: '',
          serialNumber: '',
          ipAddress: '',
          location: '',
          direction: 'BOTH',
          firmwareVersion: '',
        });

        setSeverity('success');
        setMessage(
          'Turnike eklendi.',
        );

        await load();
      } catch {
        setSeverity('error');
        setMessage(
          'Turnike eklenemedi.',
        );
      } finally {
        setSaving(false);
      }
    };

  const openGate =
    async (
      turnstile: Turnstile,
    ) => {
      try {
        await api.post(
          `/turnstiles/${turnstile.id}/open`,
          {
            reason:
              'Yönetim panelinden manuel açma',
          },
        );

        setSeverity('success');
        setMessage(
          `${turnstile.name} için açma komutu gönderildi.`,
        );

        await load();
      } catch {
        setSeverity('error');
        setMessage(
          'Turnike açılamadı.',
        );
      }
    };

  const emergencyOpenAll =
    async () => {
      try {
        setSaving(true);

        await api.post(
          '/turnstiles/emergency/open-all',
          {
            reason:
              'Yönetim panelinden acil durum açma',
          },
        );

        setEmergencyOpen(false);
        setSeverity('success');
        setMessage(
          'Acil durum komutu tüm turnikelere gönderildi.',
        );

        await load();
      } catch {
        setSeverity('error');
        setMessage(
          'Acil durum komutu gönderilemedi.',
        );
      } finally {
        setSaving(false);
      }
    };

  const visibleOrganizationGyms =
    organizationData
      ? selectedGymId === 'ALL'
        ? organizationData.gyms
        : organizationData.gyms.filter(
            (gym) =>
              gym.gymId ===
              selectedGymId,
          )
      : [];

  const visibleTurnstiles =
    organizationData
      ? visibleOrganizationGyms.flatMap(
          (gym) =>
            gym.turnstiles.map(
              (turnstile) => ({
                ...turnstile,
                gymName:
                  gym.gymName,
              }),
            ),
        )
      : data?.turnstiles || [];

  const visibleEvents =
    organizationData
      ? organizationData.recentEvents.filter(
          (event) =>
            selectedGymId === 'ALL' ||
            visibleOrganizationGyms.some(
              (gym) =>
                gym.turnstiles.some(
                  (turnstile) =>
                    turnstile.id ===
                    event.turnstileId,
                ),
            ),
        )
      : data?.recentEvents || [];

  const displaySummary =
    organizationData
      ? {
          total:
            selectedGymId === 'ALL'
              ? organizationData.summary
                  .totalTurnstiles
              : visibleOrganizationGyms.reduce(
                  (sum, gym) =>
                    sum +
                    gym.summary.total,
                  0,
                ),
          online:
            selectedGymId === 'ALL'
              ? organizationData.summary.online
              : visibleOrganizationGyms.reduce(
                  (sum, gym) =>
                    sum +
                    gym.summary.online,
                  0,
                ),
          offline:
            selectedGymId === 'ALL'
              ? organizationData.summary.offline
              : visibleOrganizationGyms.reduce(
                  (sum, gym) =>
                    sum +
                    gym.summary.offline,
                  0,
                ),
          maintenance:
            selectedGymId === 'ALL'
              ? organizationData.summary.maintenance
              : visibleOrganizationGyms.reduce(
                  (sum, gym) =>
                    sum +
                    gym.summary.maintenance,
                  0,
                ),
          approvedToday:
            selectedGymId === 'ALL'
              ? organizationData.summary.approvedToday
              : visibleOrganizationGyms.reduce(
                  (sum, gym) =>
                    sum +
                    gym.summary.approvedToday,
                  0,
                ),
          rejectedToday:
            selectedGymId === 'ALL'
              ? organizationData.summary.rejectedToday
              : visibleOrganizationGyms.reduce(
                  (sum, gym) =>
                    sum +
                    gym.summary.rejectedToday,
                  0,
                ),
        }
      : data?.summary || {
          total: 0,
          online: 0,
          offline: 0,
          maintenance: 0,
          approvedToday: 0,
          rejectedToday: 0,
        };

  if (
    loading &&
    !data &&
    !organizationData
  ) {
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

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: {
            xs: 2,
            md: 3,
          },
          minHeight: '100vh',
          bgcolor: '#f4f7fb',
        }}
      >
        <PageHeader
          eyebrow="NOVA ACCESS"
          title="Turnike Yönetim Merkezi"
          subtitle="Turnikeleri, geçişleri ve cihaz sağlığını tek ekrandan yönetin."
          icon={
            <DoorFrontRounded />
          }
          actions={
            <Stack
              direction="row"
              spacing={1}
            >
              <Button
                color="error"
                variant="outlined"
                startIcon={
                  <EmergencyRounded />
                }
                onClick={() =>
                  setEmergencyOpen(
                    true,
                  )
                }
              >
                Acil Aç
              </Button>

              <Button
                variant="contained"
                startIcon={
                  <AddRounded />
                }
                onClick={() =>
                  setDialogOpen(
                    true,
                  )
                }
              >
                Turnike Ekle
              </Button>
            </Stack>
          }
        />

        {organizationData && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              border:
                '1px solid #e5e7eb',
              borderRadius: 3,
            }}
          >
            <Stack
              direction={{
                xs: 'column',
                md: 'row',
              }}
              spacing={2}


            
            sx={{ alignItems: {
                xs: 'stretch',
                md: 'center',
              }, justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  sx={{
                    fontWeight: 900,
                  }}
                >
                  İşletme Turnike Görünümü
                </Typography>

                <Typography
                  sx={{
                    color: '#667085',
                    fontSize: 12,
                  }}
                >
                  {organizationData.summary.totalGyms} şube · {organizationData.summary.totalTurnstiles} turnike
                </Typography>
              </Box>

              <TextField
                select
                size="small"
                label="Şube"
                value={selectedGymId}
                onChange={(event) =>
                  setSelectedGymId(
                    event.target.value,
                  )
                }
                sx={{
                  minWidth: 260,
                }}
              >
                <MenuItem value="ALL">
                  Tüm Şubeler
                </MenuItem>

                {organizationData.gyms.map(
                  (gym) => (
                    <MenuItem
                      key={gym.gymId}
                      value={gym.gymId}
                    >
                      {gym.gymName}
                      {gym.city
                        ? ` — ${gym.city}`
                        : ''}
                    </MenuItem>
                  ),
                )}
              </TextField>
            </Stack>
          </Paper>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm:
                'repeat(2, minmax(0, 1fr))',
              xl:
                'repeat(6, minmax(0, 1fr))',
            },
            gap: 2,
            mb: 3,
          }}
        >
          {[
            ['Toplam', displaySummary.total],
            ['Online', displaySummary.online],
            ['Offline', displaySummary.offline],
            ['Bakımda', displaySummary.maintenance],
            ['Onaylanan', displaySummary.approvedToday],
            ['Reddedilen', displaySummary.rejectedToday],
          ].map(
            ([label, value]) => (
              <Card
                key={String(label)}
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
                      color: '#667085',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {label}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.6,
                      fontSize: 27,
                      fontWeight: 900,
                    }}
                  >
                    {value}
                  </Typography>
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
              xl:
                'repeat(2, minmax(0, 1fr))',
            },
            gap: 2,
            mb: 3,
          }}
        >
          {visibleTurnstiles.map(
            (turnstile) => (
              <Card
                key={turnstile.id}
                elevation={0}
                sx={{
                  border:
                    '1px solid #e5e7eb',
                  borderRadius: 3,
                }}
              >
                <CardContent>
                  <Stack
                    direction="row"

                    spacing={2}
                  
                  sx={{ justifyContent: 'space-between' }}>
                    <Stack
                      direction="row"
                      spacing={1.5}
                    >
                      <Box
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor:
                            turnstile.status ===
                            'ONLINE'
                              ? '#ecfdf3'
                              : '#fef2f2',
                          color:
                            turnstile.status ===
                            'ONLINE'
                              ? '#16a34a'
                              : '#dc2626',
                        }}
                      >
                        {turnstile.status ===
                        'ONLINE' ? (
                          <WifiRounded />
                        ) : (
                          <WifiOffRounded />
                        )}
                      </Box>

                      <Box>
                        <Typography
                          sx={{
                            fontSize: 18,
                            fontWeight: 900,
                          }}
                        >
                          {turnstile.name}
                        </Typography>

                        <Typography
                          sx={{
                            color: '#667085',
                            fontSize: 12,
                          }}
                        >
                          {[
                            turnstile.brand,
                            turnstile.model,
                          ]
                            .filter(Boolean)
                            .join(' ') ||
                            'Marka/model belirtilmedi'}
                        </Typography>

                        {organizationData && (
                          <Typography
                            sx={{
                              mt: 0.25,
                              color: '#1468f3',
                              fontSize: 11,
                              fontWeight: 800,
                            }}
                          >
                            {'gymName' in turnstile
                              ? String(
                                  turnstile.gymName,
                                )
                              : ''}
                          </Typography>
                        )}
                      </Box>
                    </Stack>

                    <Chip
                      color={
                        turnstile.status ===
                        'ONLINE'
                          ? 'success'
                          : turnstile.status ===
                              'MAINTENANCE'
                            ? 'warning'
                            : 'error'
                      }
                      label={
                        turnstile.status
                      }
                      size="small"
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
                      label="Yön"
                      value={
                        turnstile.direction
                      }
                    />

                    <Info
                      label="IP"
                      value={
                        turnstile.ipAddress ||
                        '—'
                      }
                    />

                    <Info
                      label="Son Bağlantı"
                      value={formatDate(
                        turnstile.lastHeartbeatAt,
                      )}
                    />

                    <Info
                      label="Son Geçiş"
                      value={formatDate(
                        turnstile.lastPassageAt,
                      )}
                    />

                    <Info
                      label="Gecikme"
                      value={
                        turnstile.latencyMs !==
                        null
                          ? `${turnstile.latencyMs} ms`
                          : '—'
                      }
                    />

                    <Info
                      label="Firmware"
                      value={
                        turnstile.firmwareVersion ||
                        '—'
                      }
                    />
                  </Box>

                  {turnstile.lastError && (
                    <Alert
                      severity="error"
                      sx={{ mt: 2 }}
                    >
                      {turnstile.lastError}
                    </Alert>
                  )}

                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={
                      <SensorsRounded />
                    }
                    onClick={() =>
                      void openGate(
                        turnstile,
                      )
                    }
                    sx={{ mt: 2 }}
                  >
                    Kapıyı Aç
                  </Button>
                </CardContent>
              </Card>
            ),
          )}
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border:
              '1px solid #e5e7eb',
            borderRadius: 3,
          }}
        >
          <Typography
            sx={{
              mb: 2,
              fontSize: 18,
              fontWeight: 900,
            }}
          >
            Son Geçişler
          </Typography>

          <Stack spacing={1}>
            {visibleEvents.map(
              (event) => (
                <Box
                  key={event.id}
                  sx={{
                    p: 1.2,
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                    border:
                      '1px solid #eef2f7',
                  }}
                >
                  <Stack
                    direction="row"

                    spacing={2}
                  
                  sx={{ justifyContent: 'space-between' }}>
                    <Box>
                      <Typography
                        sx={{
                          fontWeight: 800,
                        }}
                      >
                        {event.memberName ||
                          event.turnstileName}
                      </Typography>

                      <Typography
                        sx={{
                          color: '#667085',
                          fontSize: 12,
                        }}
                      >
                        {event.turnstileName}
                        {' · '}
                        {event.direction}
                        {' · '}
                        {event.reason ||
                          'Geçiş kaydı'}
                      </Typography>
                    </Box>

                    <Stack

                      spacing={0.5}
                    
                    sx={{ alignItems: 'flex-end' }}>
                      <Chip
                        size="small"
                        color={
                          event.result ===
                          'APPROVED'
                            ? 'success'
                            : 'error'
                        }
                        label={
                          event.result
                        }
                      />

                      <Typography
                        sx={{
                          color: '#98a2b3',
                          fontSize: 11,
                        }}
                      >
                        {formatDate(
                          event.createdAt,
                        )}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              ),
            )}
          </Stack>
        </Paper>

        <Dialog
          open={dialogOpen}
          onClose={() =>
            setDialogOpen(false)
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Yeni Turnike
          </DialogTitle>

          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <TextField
                label="Turnike Adı"
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
                select
                label="Yön"
                value={form.direction}
                onChange={(event) =>
                  setForm({
                    ...form,
                    direction:
                      event.target
                        .value as Direction,
                  })
                }
              >
                {[
                  'ENTRY',
                  'EXIT',
                  'BOTH',
                  'STAFF',
                  'VIP',
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
                label="Marka"
                value={form.brand}
                onChange={(event) =>
                  setForm({
                    ...form,
                    brand:
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
                label="Seri Numarası"
                value={
                  form.serialNumber
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    serialNumber:
                      event.target.value,
                  })
                }
              />

              <TextField
                label="IP Adresi"
                value={
                  form.ipAddress
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    ipAddress:
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

          <DialogActions
            sx={{ p: 3 }}
          >
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
                void createTurnstile()
              }
              disabled={saving}
            >
              Kaydet
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={emergencyOpen}
          onClose={() =>
            setEmergencyOpen(false)
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Tüm Turnikeleri Aç
          </DialogTitle>

          <DialogContent>
            <Alert severity="error">
              Bu işlem tüm aktif turnikelere acil açma komutu gönderir. Yalnızca gerçek acil durumlarda kullanılmalıdır.
            </Alert>
          </DialogContent>

          <DialogActions
            sx={{ p: 3 }}
          >
            <Button
              onClick={() =>
                setEmergencyOpen(false)
              }
            >
              Vazgeç
            </Button>

            <Button
              color="error"
              variant="contained"
              onClick={() =>
                void emergencyOpenAll()
              }
              disabled={saving}
            >
              Tümünü Aç
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
