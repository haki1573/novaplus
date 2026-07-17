import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';

import {
  CheckCircleRounded,
  CloseRounded,
  CreditCardRounded,
  GroupsRounded,
  LoginRounded,
  LogoutRounded,
  QrCode2Rounded,
  SensorsRounded,
  TimerRounded,
} from '@mui/icons-material';

import { api } from '../services/api';
import { Sidebar } from '../components/Sidebar';
import { PageHeader } from '../components/ui/PageHeader';
import { PageContainer } from '../components/ui/PageContainer';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingPage } from '../components/ui/LoadingPage';

interface Member {
  id: number;
  fullName?: string;
  name?: string;
  phone?: string;
  status?: string;
  membershipEnd?: string | null;
  package?: {
    name?: string;
  } | null;
}

interface CheckInLog {
  id: number;
  memberId: number;
  member: Member;
  accessType: 'CARD' | 'QR';
  accessCode: string;
  turnstileId?: string | null;
  checkInTime: string;
  checkOutTime?: string | null;
}

interface CheckInSummary {
  todayEntries: number;
  currentlyInside: number;
  todayExits: number;
  cardEntries: number;
  qrEntries: number;
  averageVisitMinutes: number;
  lastEntryAt: string | null;
}

interface ScanResponse {
  success: boolean;
  message: string;
  subjectType?: 'MEMBER' | 'STAFF';
  action?: 'CHECK_IN' | 'CHECK_OUT';
  lockerReleased?: boolean;
  checkIn: {
    id: number;
    checkInTime: string;
    checkOutTime?: string | null;
    durationMinutes?: number;
    accessType: 'CARD' | 'QR';
    accessCode: string;
    member: Member;
    staff?: {
      id: string;
      fullName: string;
      role: string;
    };
  };
}

function memberName(member?: Member) {
  return (
    member?.fullName ||
    member?.name ||
    'Bilinmeyen üye'
  );
}

function errorMessage(error: unknown) {
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

  return 'Kart veya QR okunamadı.';
}

export function CheckIn() {
  const inputRef =
    useRef<HTMLInputElement | null>(null);

  const [code, setCode] = useState('');

  const [mode, setMode] =
    useState<'CHECK_IN' | 'CHECK_OUT'>(
      'CHECK_IN',
    );
  const [logs, setLogs] =
    useState<CheckInLog[]>([]);

  const [summary, setSummary] =
    useState<CheckInSummary>({
      todayEntries: 0,
      currentlyInside: 0,
      todayExits: 0,
      cardEntries: 0,
      qrEntries: 0,
      averageVisitMinutes: 0,
      lastEntryAt: null,
    });

  const [loading, setLoading] =
    useState(true);
  const [scanning, setScanning] =
    useState(false);

  const [lastResult, setLastResult] =
    useState<ScanResponse['checkIn'] | null>(
      null,
    );

  const [lastSubjectType, setLastSubjectType] =
    useState<'MEMBER' | 'STAFF'>('MEMBER');

  const [lastError, setLastError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [severity, setSeverity] =
    useState<'success' | 'error'>(
      'success',
    );

  const loadLogs = useCallback(async () => {
    try {
      const [
        logsResponse,
        summaryResponse,
      ] = await Promise.all([
        api.get<CheckInLog[]>(
          '/check-in/logs',
        ),
        api.get<CheckInSummary>(
          '/check-in/summary',
        ),
      ]);

      setLogs(logsResponse.data);
      setSummary(summaryResponse.data);
    } catch (error) {
      setSeverity('error');
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();

    const focusInput = () => {
      inputRef.current?.focus();
    };

    focusInput();

    window.addEventListener(
      'click',
      focusInput,
    );

    return () => {
      window.removeEventListener(
        'click',
        focusInput,
      );
    };
  }, [loadLogs]);

  const todayLogs = useMemo(() => {
    const today = new Date();

    return logs.filter((log) => {
      const date = new Date(
        log.checkInTime,
      );

      return (
        date.getDate() ===
          today.getDate() &&
        date.getMonth() ===
          today.getMonth() &&
        date.getFullYear() ===
          today.getFullYear()
      );
    });
  }, [logs]);

  const cardCount =
    summary.cardEntries;

  const qrCount =
    summary.qrEntries;

  const currentlyInside =
    summary.currentlyInside;

  const capacity = 120;

  const occupancyRate = Math.min(
    100,
    Math.round(
      (currentlyInside /
        capacity) *
        100,
    ),
  );

  const scanCode = async (
    value: string,
  ) => {
    const normalized = value.trim();

    if (!normalized || scanning) {
      return;
    }

    try {
      setScanning(true);
      setLastError('');

      const response =
        await api.post<ScanResponse>(
          mode === 'CHECK_IN'
            ? '/check-in/scan'
            : '/check-in/checkout',
          {
            code: normalized,
          },
        );

      setLastResult(
        response.data.checkIn,
      );

      setLastSubjectType(
        response.data.subjectType === 'STAFF'
          ? 'STAFF'
          : 'MEMBER',
      );

      setSeverity('success');
      setMessage(
        response.data.message ||
          (mode === 'CHECK_IN'
            ? 'Giriş başarılı.'
            : 'Çıkış başarılı.'),
      );

      await loadLogs();

      window.setTimeout(() => {
        setLastResult(null);
      }, 3500);
    } catch (error) {
      const text = errorMessage(error);

      setLastResult(null);
      setLastError(text);
      setSeverity('error');
      setMessage(text);

      window.setTimeout(() => {
        setLastError('');
      }, 3500);
    } finally {
      setCode('');
      setScanning(false);

      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const lastEntry =
    summary.lastEntryAt ||
    todayLogs[0]?.checkInTime;

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f4f7fb',
      }}
    >
      <Sidebar />

      <PageContainer>
        <PageHeader
          eyebrow="NOVAPLUS+"
          title="Giriş & Çıkış Merkezi"
          subtitle="Üye giriş-çıkışlarını ve salondaki anlık kişi sayısını yönetin."
          icon={<SensorsRounded />}
        />

        <Paper
          elevation={0}
          sx={{
            p: 1.25,
            mb: 3,
            width: 'fit-content',
            maxWidth: '100%',
            borderRadius: 3,
            border: '1px solid #e2e8f0',
          }}
        >
          <ToggleButtonGroup
            exclusive
            value={mode}
            onChange={(
              _event,
              value:
                | 'CHECK_IN'
                | 'CHECK_OUT'
                | null,
            ) => {
              if (value) {
                setMode(value);
                setLastResult(null);
                setLastError('');
                setCode('');
                window.setTimeout(() => {
                  inputRef.current?.focus();
                }, 50);
              }
            }}
            size="small"
          >
            <ToggleButton
              value="CHECK_IN"
              sx={{
                px: 2.5,
                fontWeight: 900,
                textTransform: 'none',
                borderRadius:
                  '10px 0 0 10px !important',
              }}
            >
              <LoginRounded
                sx={{ mr: 1 }}
              />
              Giriş
            </ToggleButton>

            <ToggleButton
              value="CHECK_OUT"
              sx={{
                px: 2.5,
                fontWeight: 900,
                textTransform: 'none',
                borderRadius:
                  '0 10px 10px 0 !important',
              }}
            >
              <LogoutRounded
                sx={{ mr: 1 }}
              />
              Çıkış
            </ToggleButton>
          </ToggleButtonGroup>
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              xl: 'minmax(0, 1.7fr) minmax(320px, 0.8fr)',
            },
            gap: 3,
            mb: 3,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: {
                xs: 2,
                md: 3,
              },
              minHeight: 430,
              borderRadius: 2,
              border:
                lastResult
                  ? '2px solid #22c55e'
                  : lastError
                    ? '2px solid #ef4444'
                    : '1px solid #e2e8f0',
              background:
                lastResult
                  ? 'linear-gradient(135deg, #ecfdf5, #dcfce7)'
                  : lastError
                    ? 'linear-gradient(135deg, #fef2f2, #fee2e2)'
                    : 'white',
              boxShadow:
                '0 16px 40px rgba(15, 23, 42, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition:
                'all 240ms ease',
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: 760,
                textAlign: 'center',
              }}
            >
              {lastResult ? (
                <>
                  <Box
                    sx={{
                      width: 88,
                      height: 88,
                      mx: 'auto',
                      mb: 2,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '50%',
                      color: '#16a34a',
                      background: '#dcfce7',
                    }}
                  >
                    <CheckCircleRounded
                      sx={{ fontSize: 54 }}
                    />
                  </Box>

                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 900,
                      color: '#166534',
                    }}
                  >
                    {lastSubjectType === 'STAFF'
                      ? mode === 'CHECK_IN'
                        ? 'Personel Girişi'
                        : 'Personel Çıkışı'
                      : mode === 'CHECK_IN'
                        ? 'Giriş Başarılı'
                        : 'Çıkış Başarılı'}
                  </Typography>

                  <Typography
                    variant="h3"
                    sx={{
                      mt: 2,
                      fontWeight: 900,
                      color: '#0f172a',
                    }}
                  >
                    {memberName(
                      lastResult.member,
                    )}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,
                      color: '#64748b',
                    }}
                  >
                    {lastSubjectType === 'STAFF'
                      ? 'Personel turnike kaydı'
                      : lastResult.member
                          .package?.name ||
                        'Aktif üyelik'}
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      mt: 2,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Chip
                      color="success"
                      icon={
                        lastResult.accessType ===
                        'CARD' ? (
                          <CreditCardRounded />
                        ) : (
                          <QrCode2Rounded />
                        )
                      }
                      label={
                        lastResult.accessType ===
                        'CARD'
                          ? 'Kart'
                          : 'QR'
                      }
                    />

                    <Typography
                      component="code"
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 2,
                        background:
                          'rgba(255,255,255,0.75)',
                        fontWeight: 800,
                      }}
                    >
                      {lastResult.accessCode}
                    </Typography>
                  </Stack>

                  <Typography
                    sx={{
                      mt: 2,
                      fontWeight: 700,
                      color: '#166534',
                    }}
                  >
                    {new Date(
                      lastResult.checkInTime,
                    ).toLocaleTimeString(
                      'tr-TR',
                    )}
                  </Typography>
                </>
              ) : lastError ? (
                <>
                  <Box
                    sx={{
                      width: 88,
                      height: 88,
                      mx: 'auto',
                      mb: 2,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '50%',
                      color: '#dc2626',
                      background: '#fee2e2',
                    }}
                  >
                    <CloseRounded
                      sx={{ fontSize: 54 }}
                    />
                  </Box>

                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 900,
                      color: '#991b1b',
                    }}
                  >
                    Giriş Reddedildi
                  </Typography>

                  <Typography
                    sx={{
                      mt: 2,
                      fontSize: 20,
                      fontWeight: 700,
                      color: '#7f1d1d',
                    }}
                  >
                    {lastError}
                  </Typography>
                </>
              ) : (
                <>
                  <Box
                    sx={{
                      width: 96,
                      height: 96,
                      mx: 'auto',
                      mb: 3,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 2,
                      color: '#2563eb',
                      background: '#eff6ff',
                    }}
                  >
                    {scanning ? (
                      <CircularProgress />
                    ) : (
                      <SensorsRounded
                        sx={{ fontSize: 54 }}
                      />
                    )}
                  </Box>

                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 900 }}
                  >
                    {mode === 'CHECK_IN'
                      ? 'Kart veya QR okutun'
                      : 'Çıkış için kart veya QR okutun'}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,
                      mb: 3,
                      color: '#64748b',
                    }}
                  >
                    {mode === 'CHECK_IN'
                      ? 'Okuyucu kodu otomatik olarak bu alana gönderir.'
                      : 'Çıkış tamamlandığında varsa üyeye ait dolap otomatik boşaltılır ve şifresi sıfırlanır.'}
                  </Typography>

                  <TextField
                    inputRef={inputRef}
                    fullWidth
                    autoFocus
                    value={code}
                    disabled={scanning}
                    onChange={(event) =>
                      setCode(
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter'
                      ) {
                        event.preventDefault();
                        void scanCode(code);
                      }
                    }}
                    placeholder={
                      mode === 'CHECK_IN'
                        ? 'Giriş kartı veya QR kodu'
                        : 'Çıkış kartı veya QR kodu'
                    }
                    slotProps={{
                      input: {
                        startAdornment: (
                          <LoginRounded
                            sx={{ mr: 1 }}
                          />
                        ),
                      },
                    }}
                    sx={{
                      maxWidth: 560,
                      '& .MuiOutlinedInput-root':
                        {
                          minHeight: 64,
                          borderRadius: 3,
                          fontSize: 18,
                        },
                    }}
                  />

                  <Alert
                    severity="info"
                    sx={{
                      mt: 2,
                      textAlign: 'left',
                    }}
                  >
                    USB okuyucular klavye gibi
                    çalışır ve kodun sonunda
                    Enter gönderir. Çıkış modunda
                    ziyaret kapanır; atanmış dolap
                    otomatik sıfırlanır.
                  </Alert>
                </>
              )}
            </Box>
          </Paper>

          <Stack spacing={2}>
            <StatCard
              title="Bugünkü Giriş"
              value={todayLogs.length}
              subtitle="Bugün okutulan kart ve QR"
              icon={<LoginRounded />}
              accent="#2563eb"
              iconBackground="#eff6ff"
            />

            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                border:
                  '1px solid #e2e8f0',
              }}
            >
              <CardContent>
                <Typography
                  sx={{
                    fontWeight: 800,
                    mb: 1.5,
                  }}
                >
                  Salon Doluluğu
                </Typography>

                <Stack
                  direction="row"
                  sx={{
                    mb: 1,
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    sx={{
                      color: '#64748b',
                    }}
                  >
                    {currentlyInside} /{' '}
                    {capacity}
                  </Typography>

                  <Typography
                    sx={{ fontWeight: 800 }}
                  >
                    %{occupancyRate}
                  </Typography>
                </Stack>

                <LinearProgress
                  variant="determinate"
                  value={occupancyRate}
                  sx={{
                    height: 12,
                    borderRadius: 8,
                  }}
                />
              </CardContent>
            </Card>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap: 2,
              }}
            >
              <Card
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border:
                    '1px solid #e2e8f0',
                }}
              >
                <CardContent>
                  <CreditCardRounded
                    color="primary"
                  />

                  <Typography
                    variant="h5"
                    sx={{
                      mt: 1,
                      fontWeight: 900,
                    }}
                  >
                    {cardCount}
                  </Typography>

                  <Typography
                    sx={{
                      color: '#64748b',
                      fontSize: 13,
                    }}
                  >
                    Kart girişi
                  </Typography>
                </CardContent>
              </Card>

              <Card
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border:
                    '1px solid #e2e8f0',
                }}
              >
                <CardContent>
                  <QrCode2Rounded
                    color="secondary"
                  />

                  <Typography
                    variant="h5"
                    sx={{
                      mt: 1,
                      fontWeight: 900,
                    }}
                  >
                    {qrCount}
                  </Typography>

                  <Typography
                    sx={{
                      color: '#64748b',
                      fontSize: 13,
                    }}
                  >
                    QR girişi
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap: 2,
              }}
            >
              <Card
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border:
                    '1px solid #e2e8f0',
                }}
              >
                <CardContent>
                  <GroupsRounded
                    color="success"
                  />

                  <Typography
                    variant="h5"
                    sx={{
                      mt: 1,
                      fontWeight: 900,
                    }}
                  >
                    {summary.currentlyInside}
                  </Typography>

                  <Typography
                    sx={{
                      color: '#64748b',
                      fontSize: 13,
                    }}
                  >
                    Şu an içeride
                  </Typography>
                </CardContent>
              </Card>

              <Card
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border:
                    '1px solid #e2e8f0',
                }}
              >
                <CardContent>
                  <TimerRounded
                    color="warning"
                  />

                  <Typography
                    variant="h5"
                    sx={{
                      mt: 1,
                      fontWeight: 900,
                    }}
                  >
                    {summary.averageVisitMinutes}
                  </Typography>

                  <Typography
                    sx={{
                      color: '#64748b',
                      fontSize: 13,
                    }}
                  >
                    Ort. dakika
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                border:
                  '1px solid #e2e8f0',
              }}
            >
              <CardContent>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: "center",
                  }}
                >
                  <TimerRounded
                    sx={{
                      color: '#f59e0b',
                    }}
                  />

                  <Box>
                    <Typography
                      sx={{
                        color: '#64748b',
                        fontSize: 13,
                      }}
                    >
                      Son giriş
                    </Typography>

                    <Typography
                      sx={{
                        fontWeight: 900,
                      }}
                    >
                      {lastEntry
                        ? new Date(
                            lastEntry,
                          ).toLocaleTimeString(
                            'tr-TR',
                          )
                        : '—'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border:
              '1px solid #e2e8f0',
            borderRadius: 2,
            boxShadow:
              '0 10px 30px rgba(15, 23, 42, 0.06)',
          }}
        >
          <Box
            sx={{
              p: 3,
              pb: 2,
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
            }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 900 }}
              >
                Son Girişler
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  color: '#64748b',
                  fontSize: 14,
                }}
              >
                En son okutulan kart ve QR
                hareketleri.
              </Typography>
            </Box>

            <Chip
              icon={<GroupsRounded />}
              label={`${todayLogs.length} bugün`}
              color="primary"
              variant="outlined"
            />
          </Box>

          {loading ? (
            <LoadingPage
              label="Giriş kayıtları yükleniyor..."
              minHeight={260}
            />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={<GroupsRounded />}
              title="Henüz giriş kaydı yok"
              description="İlk kart veya QR okutulduğunda burada görünecek."
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor:
                      '#f8fafc',
                  }}
                >
                  <TableCell>Üye</TableCell>
                  <TableCell>
                    Erişim
                  </TableCell>
                  <TableCell>
                    Turnike
                  </TableCell>
                  <TableCell>
                    Giriş
                  </TableCell>
                  <TableCell>
                    Çıkış / Süre
                  </TableCell>
                  <TableCell>
                    Durum
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {logs.slice(0, 20).map(
                  (log) => (
                    <TableRow
                      key={log.id}
                      hover
                    >
                      <TableCell
                        sx={{
                          fontWeight: 800,
                        }}
                      >
                        {memberName(
                          log.member,
                        )}
                      </TableCell>

                      <TableCell>
                        <Stack
                          spacing={0.6}
                          alignItems="flex-start"
                        >
                          <Chip
                            size="small"
                            icon={
                              log.accessType ===
                              'CARD' ? (
                                <CreditCardRounded />
                              ) : (
                                <QrCode2Rounded />
                              )
                            }
                            label={
                              log.accessType ===
                              'CARD'
                                ? 'Kart'
                                : 'QR'
                            }
                            color={
                              log.accessType ===
                              'CARD'
                                ? 'primary'
                                : 'secondary'
                            }
                            variant="outlined"
                          />

                          <Typography
                            component="code"
                            sx={{
                              color: '#64748b',
                              fontSize: 11,
                            }}
                          >
                            {log.accessCode}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        {log.turnstileId ||
                          'Ana Giriş'}
                      </TableCell>

                      <TableCell>
                        {new Date(
                          log.checkInTime,
                        ).toLocaleString(
                          'tr-TR',
                        )}
                      </TableCell>

                      <TableCell>
                        {log.checkOutTime ? (
                          <>
                            <Typography
                              sx={{
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            >
                              {new Date(
                                log.checkOutTime,
                              ).toLocaleTimeString(
                                'tr-TR',
                                {
                                  hour:
                                    '2-digit',
                                  minute:
                                    '2-digit',
                                },
                              )}
                            </Typography>

                            <Typography
                              sx={{
                                color: '#64748b',
                                fontSize: 11,
                              }}
                            >
                              {Math.max(
                                0,
                                Math.round(
                                  (
                                    new Date(
                                      log.checkOutTime,
                                    ).getTime() -
                                    new Date(
                                      log.checkInTime,
                                    ).getTime()
                                  ) /
                                    60000,
                                ),
                              )}{' '}
                              dakika
                            </Typography>
                          </>
                        ) : (
                          '—'
                        )}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            log.checkOutTime
                              ? 'Çıkış Yaptı'
                              : 'İçeride'
                          }
                          color={
                            log.checkOutTime
                              ? 'default'
                              : 'success'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>

        <Snackbar
          open={Boolean(message)}
          autoHideDuration={3500}
          onClose={() =>
            setMessage('')
          }
        >
          <Alert
            variant="filled"
            severity={severity}
            onClose={() =>
              setMessage('')
            }
          >
            {message}
          </Alert>
        </Snackbar>
      </PageContainer>
    </Box>
  );
}
