import { useEffect, useMemo, useState } from 'react';
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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  AddRounded,
  BuildRounded,
  ContentCopyRounded,
  KeyRounded,
  LockOpenRounded,
  LockRounded,
  PersonAddAlt1Rounded,
  RestartAltRounded,
} from '@mui/icons-material';
import { Sidebar } from '../components/Sidebar';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { api } from '../services/api';

type LockerStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'OUT_OF_SERVICE';

type Member = {
  id: number;
  fullName?: string;
  name?: string;
  phone?: string;
};

type Locker = {
  id: string;
  number: string;
  status: LockerStatus;
  memberId: number | null;
  member?: Member | null;
  accessCode: string | null;
  qrToken: string | null;
  isLocked: boolean;
  assignedAt?: string | null;
  notes?: string | null;
};

type Summary = {
  total: number;
  available: number;
  occupied: number;
  outOfService: number;
};

type HistoryItem = {
  id: string;
  lockerId: string;
  memberId: number | null;
  action: string;
  description?: string | null;
  createdAt: string;
};

function memberName(member?: Member | null) {
  return (
    member?.fullName ||
    member?.name ||
    'Üye bilgisi yok'
  );
}

function statusInfo(status: LockerStatus) {
  if (status === 'AVAILABLE') {
    return {
      label: 'Boş',
      color: 'success' as const,
    };
  }

  if (status === 'OCCUPIED') {
    return {
      label: 'Dolu',
      color: 'primary' as const,
    };
  }

  return {
    label: 'Arızalı',
    color: 'error' as const,
  };
}

function getError(error: any) {
  const message =
    error?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  return (
    message ||
    'İşlem sırasında hata oluştu.'
  );
}

export function Lockers() {
  const [lockers, setLockers] =
    useState<Locker[]>([]);
  const [members, setMembers] =
    useState<Member[]>([]);
  const [history, setHistory] =
    useState<HistoryItem[]>([]);
  const [summary, setSummary] =
    useState<Summary>({
      total: 0,
      available: 0,
      occupied: 0,
      outOfService: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [feedback, setFeedback] =
    useState<{
      type: 'success' | 'error';
      text: string;
    } | null>(null);

  const [createOpen, setCreateOpen] =
    useState(false);

  const [assignOpen, setAssignOpen] =
    useState(false);

  const [openDialog, setOpenDialog] =
    useState(false);

  const [qrOpen, setQrOpen] =
    useState(false);

  const [bulkOpen, setBulkOpen] =
    useState(false);

  const [selectedLocker, setSelectedLocker] =
    useState<Locker | null>(null);

  const [number, setNumber] =
    useState('');

  const [notes, setNotes] =
    useState('');

  const [memberId, setMemberId] =
    useState('');

  const [accessCode, setAccessCode] =
    useState('');

  const [qrToken, setQrToken] =
    useState('');

  const [bulkPrefix, setBulkPrefix] =
    useState('A');

  const [bulkStart, setBulkStart] =
    useState('1');

  const [bulkCount, setBulkCount] =
    useState('20');

  async function load() {
    try {
      setLoading(true);

      const [
        lockersResponse,
        summaryResponse,
        membersResponse,
        historyResponse,
      ] = await Promise.all([
        api.get<Locker[]>('/lockers'),
        api.get<Summary>(
          '/lockers/summary',
        ),
        api.get<Member[]>('/members'),
        api.get<HistoryItem[]>(
          '/lockers/history',
        ),
      ]);

      const normalizeArray = <T,>(payload: any): T[] => {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.items)) return payload.items;
        if (Array.isArray(payload?.members)) return payload.members;
        if (Array.isArray(payload?.lockers)) return payload.lockers;
        if (Array.isArray(payload?.history)) return payload.history;
        return [];
      };

      setLockers(normalizeArray<Locker>(lockersResponse.data));
      setSummary(summaryResponse.data);
      setMembers(normalizeArray<Member>(membersResponse.data));
      setHistory(normalizeArray<HistoryItem>(historyResponse.data));
    } catch {
      setFeedback({
        type: 'error',
        text: 'Dolap verileri alınamadı.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sortedLockers = useMemo(
    () =>
      [...lockers].sort((a, b) =>
        a.number.localeCompare(
          b.number,
          'tr',
          {
            numeric: true,
          },
        ),
      ),
    [lockers],
  );

  async function createLocker() {
    try {
      await api.post('/lockers', {
        number: number.trim(),
        notes: notes.trim() || undefined,
      });

      setCreateOpen(false);
      setNumber('');
      setNotes('');
      setFeedback({
        type: 'success',
        text: 'Dolap oluşturuldu.',
      });
      await load();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getError(error),
      });
    }
  }

  async function assignLocker() {
    if (!selectedLocker || !memberId) {
      return;
    }

    try {
      const response =
        await api.post(
          `/lockers/${selectedLocker.id}/assign`,
          {
            memberId: Number(memberId),
          },
        );

      setAssignOpen(false);
      setMemberId('');
      setSelectedLocker(null);
      setFeedback({
        type: 'success',
        text: `Dolap atandı. Şifre: ${response.data.locker.accessCode}`,
      });
      await load();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getError(error),
      });
    }
  }

  async function openLocker() {
    if (!selectedLocker) {
      return;
    }

    try {
      await api.post(
        `/lockers/${selectedLocker.id}/open`,
        {
          accessCode: accessCode.trim(),
        },
      );

      setOpenDialog(false);
      setAccessCode('');
      setSelectedLocker(null);
      setFeedback({
        type: 'success',
        text: 'Dolap açıldı.',
      });
      await load();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getError(error),
      });
    }
  }

  async function lockLocker(
    locker: Locker,
  ) {
    try {
      await api.post(
        `/lockers/${locker.id}/lock`,
      );
      setFeedback({
        type: 'success',
        text: 'Dolap kilitlendi.',
      });
      await load();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getError(error),
      });
    }
  }

  async function releaseLocker(
    locker: Locker,
  ) {
    const confirmed = window.confirm(
      `${locker.number} numaralı dolap boşaltılsın ve şifresi sıfırlansın mı?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.post(
        `/lockers/${locker.id}/release`,
      );
      setFeedback({
        type: 'success',
        text: 'Dolap boşaltıldı ve erişim bilgileri sıfırlandı.',
      });
      await load();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getError(error),
      });
    }
  }

  async function setOutOfService(
    locker: Locker,
  ) {
    try {
      await api.patch(
        `/lockers/${locker.id}/status`,
        {
          status:
            locker.status ===
            'OUT_OF_SERVICE'
              ? 'AVAILABLE'
              : 'OUT_OF_SERVICE',
        },
      );

      setFeedback({
        type: 'success',
        text:
          locker.status ===
          'OUT_OF_SERVICE'
            ? 'Dolap tekrar kullanıma açıldı.'
            : 'Dolap arızalı olarak işaretlendi.',
      });

      await load();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getError(error),
      });
    }
  }

  async function openByQr() {
    if (!qrToken.trim()) {
      setFeedback({
        type: 'error',
        text: 'QR anahtarı boş olamaz.',
      });
      return;
    }

    try {
      const response =
        await api.post(
          '/lockers/open-by-qr',
          {
            qrToken:
              qrToken.trim(),
          },
        );

      setQrOpen(false);
      setQrToken('');
      setFeedback({
        type: 'success',
        text:
          response.data.message ||
          'Dolap QR ile açıldı.',
      });

      await load();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getError(error),
      });
    }
  }

  async function createMultiple() {
    try {
      const response =
        await api.post(
          '/lockers/bulk',
          {
            prefix:
              bulkPrefix.trim(),
            startNumber:
              Number(bulkStart),
            count:
              Number(bulkCount),
          },
        );

      setBulkOpen(false);
      setFeedback({
        type: 'success',
        text:
          `${response.data.createdCount} dolap oluşturuldu. ${response.data.skippedCount} kayıt atlandı.`,
      });

      await load();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getError(error),
      });
    }
  }

  async function copyQrToken(
    locker: Locker,
  ) {
    if (!locker.qrToken) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        locker.qrToken,
      );

      setFeedback({
        type: 'success',
        text: 'QR anahtarı kopyalandı.',
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'QR anahtarı kopyalanamadı.',
      });
    }
  }

  const summaryCards = [
    {
      title: 'Toplam Dolap',
      value: summary.total,
      color: '#2563eb',
    },
    {
      title: 'Boş',
      value: summary.available,
      color: '#16a34a',
    },
    {
      title: 'Dolu',
      value: summary.occupied,
      color: '#7c3aed',
    },
    {
      title: 'Arızalı',
      value: summary.outOfService,
      color: '#dc2626',
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

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: {
            xs: 2,
            md: 3,
          },
        }}
      >
        <PageHeader
          eyebrow="NOVAPLUS+"
          title="Akıllı Dolaplar"
          subtitle="Dolapları üyeye atayın, şifre veya QR ile yönetin."
          icon={<LockRounded />}
          actions={
            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              spacing={1}
            >
              <Button
                variant="outlined"
                onClick={() => setQrOpen(true)}
              >
                QR ile Aç
              </Button>

              <Button
                variant="outlined"
                onClick={() => setBulkOpen(true)}
              >
                Toplu Oluştur
              </Button>

              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={() => setCreateOpen(true)}
              >
                Yeni Dolap
              </Button>
            </Stack>
          }
        />

        {feedback && (
          <Alert
            severity={feedback.type}
            sx={{ mb: 3 }}
            onClose={() =>
              setFeedback(null)
            }
          >
            {feedback.text}
          </Alert>
        )}

        {loading ? (
          <Box
            sx={{
              py: 8,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
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
              {summaryCards.map(
                (item) => (
                  <StatCard
                    key={item.title}
                    title={item.title}
                    value={item.value}
                    accent={item.color}
                    icon={<LockRounded />}
                    iconBackground={
                      item.title === 'Boş'
                        ? '#ecfdf3'
                        : item.title === 'Dolu'
                          ? '#f5f3ff'
                          : item.title === 'Arızalı'
                            ? '#fff1f2'
                            : '#eff6ff'
                    }
                  />
                ),
              )}
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  xl: '1.4fr 0.6fr',
                },
                gap: 3,
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  border:
                    '1px solid',
                  borderColor:
                    'divider',
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 900,
                    mb: 2,
                  }}
                >
                  Dolaplar
                </Typography>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, 1fr)',
                      lg: 'repeat(3, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  {sortedLockers.map(
                    (locker) => {
                      const status =
                        statusInfo(
                          locker.status,
                        );

                      return (
                        <Card
                          key={locker.id}
                          elevation={0}
                          sx={{
                            borderRadius: 2,
                            border:
                              '1px solid',
                            borderColor:
                              locker.status ===
                              'OUT_OF_SERVICE'
                                ? 'error.light'
                                : 'divider',
                          }}
                        >
                          <CardContent>
                            <Stack
                              direction="row"


                            
                            sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography
                                variant="h5"
                                sx={{
                                  fontWeight: 900,
                                }}
                              >
                                {locker.number}
                              </Typography>

                              <Chip
                                size="small"
                                color={
                                  status.color
                                }
                                label={
                                  status.label
                                }
                              />
                            </Stack>

                            <Typography
                              sx={{
                                mt: 1,
                                color:
                                  'text.secondary',
                                fontSize: 13,
                              }}
                            >
                              {locker.member
                                ? memberName(
                                    locker.member,
                                  )
                                : 'Üye atanmamış'}
                            </Typography>

                            {locker.status ===
                              'OCCUPIED' && (
                              <Box
                                sx={{
                                  mt: 1.5,
                                  p: 1.25,
                                  borderRadius: 2.5,
                                  background:
                                    'action.hover',
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: 11,
                                    color:
                                      'text.secondary',
                                  }}
                                >
                                  Dolap şifresi
                                </Typography>

                                <Typography
                                  component="code"
                                  sx={{
                                    fontWeight: 900,
                                    letterSpacing:
                                      2,
                                  }}
                                >
                                  {
                                    locker.accessCode
                                  }
                                </Typography>

                                <Typography
                                  sx={{
                                    mt: 0.5,
                                    fontSize: 11,
                                    color:
                                      locker.isLocked
                                        ? 'error.main'
                                        : 'success.main',
                                  }}
                                >
                                  {locker.isLocked
                                    ? 'Kilitli'
                                    : 'Açık'}
                                </Typography>
                              </Box>
                            )}

                            <Stack
                              spacing={1}
                              sx={{ mt: 2 }}
                            >
                              {locker.status ===
                                'AVAILABLE' && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={
                                    <PersonAddAlt1Rounded />
                                  }
                                  onClick={() => {
                                    setSelectedLocker(
                                      locker,
                                    );
                                    setAssignOpen(
                                      true,
                                    );
                                  }}
                                >
                                  Üyeye Ata
                                </Button>
                              )}

                              {locker.status ===
                                'OCCUPIED' && (
                                <>
                                  {locker.isLocked ? (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={
                                        <LockOpenRounded />
                                      }
                                      onClick={() => {
                                        setSelectedLocker(
                                          locker,
                                        );
                                        setOpenDialog(
                                          true,
                                        );
                                      }}
                                    >
                                      Dolabı Aç
                                    </Button>
                                  ) : (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={
                                        <LockRounded />
                                      }
                                      onClick={() =>
                                        void lockLocker(
                                          locker,
                                        )
                                      }
                                    >
                                      Kilitle
                                    </Button>
                                  )}

                                  <Button
                                    size="small"
                                    color="secondary"
                                    startIcon={
                                      <ContentCopyRounded />
                                    }
                                    onClick={() =>
                                      void copyQrToken(
                                        locker,
                                      )
                                    }
                                  >
                                    QR Anahtarını Kopyala
                                  </Button>

                                  <Button
                                    size="small"
                                    color="warning"
                                    startIcon={
                                      <RestartAltRounded />
                                    }
                                    onClick={() =>
                                      void releaseLocker(
                                        locker,
                                      )
                                    }
                                  >
                                    Boşalt ve Sıfırla
                                  </Button>
                                </>
                              )}

                              <Button
                                size="small"
                                color={
                                  locker.status ===
                                  'OUT_OF_SERVICE'
                                    ? 'success'
                                    : 'error'
                                }
                                startIcon={
                                  <BuildRounded />
                                }
                                onClick={() =>
                                  void setOutOfService(
                                    locker,
                                  )
                                }
                              >
                                {locker.status ===
                                'OUT_OF_SERVICE'
                                  ? 'Kullanıma Aç'
                                  : 'Arızalı Yap'}
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    },
                  )}

                  {sortedLockers.length ===
                    0 && (
                    <Typography
                      color="text.secondary"
                    >
                      Henüz dolap eklenmedi.
                    </Typography>
                  )}
                </Box>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border:
                    '1px solid',
                  borderColor:
                    'divider',
                }}
              >
                <Box sx={{ p: 3 }}>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 900 }}
                  >
                    Son Hareketler
                  </Typography>
                </Box>

                <Box
                  sx={{
                    maxHeight: 620,
                    overflowY: 'auto',
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          İşlem
                        </TableCell>
                        <TableCell>
                          Tarih
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {history
                        .slice(0, 30)
                        .map((item) => (
                          <TableRow
                            key={item.id}
                          >
                            <TableCell>
                              <Typography
                                sx={{
                                  fontWeight:
                                    800,
                                  fontSize: 12,
                                }}
                              >
                                {
                                  item.description
                                }
                              </Typography>
                            </TableCell>

                            <TableCell
                              sx={{
                                whiteSpace:
                                  'nowrap',
                              }}
                            >
                              {new Date(
                                item.createdAt,
                              ).toLocaleString(
                                'tr-TR',
                              )}
                            </TableCell>
                          </TableRow>
                        ))}

                      {history.length ===
                        0 && (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                          >
                            <Typography
                              sx={{
                                py: 4,
                                textAlign:
                                  'center',
                                color:
                                  'text.secondary',
                              }}
                            >
                              Hareket kaydı yok.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            </Box>
          </>
        )}

        <Dialog
          open={createOpen}
          onClose={() =>
            setCreateOpen(false)
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Yeni Dolap
          </DialogTitle>

          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <TextField
                label="Dolap Numarası"
                value={number}
                onChange={(event) =>
                  setNumber(
                    event.target.value,
                  )
                }
                placeholder="A-15"
                fullWidth
              />

              <TextField
                label="Not"
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value,
                  )
                }
                multiline
                minRows={2}
                fullWidth
              />
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button
              onClick={() =>
                setCreateOpen(false)
              }
            >
              İptal
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void createLocker()
              }
            >
              Oluştur
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={assignOpen}
          onClose={() =>
            setAssignOpen(false)
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Dolabı Üyeye Ata
          </DialogTitle>

          <DialogContent>
            <TextField
              select
              label="Üye"
              value={memberId}
              onChange={(event) =>
                setMemberId(
                  event.target.value,
                )
              }
              fullWidth
              sx={{ mt: 1 }}
            >
              {members.map(
                (member) => (
                  <MenuItem
                    key={member.id}
                    value={String(
                      member.id,
                    )}
                  >
                    {memberName(
                      member,
                    )}
                    {member.phone
                      ? ` · ${member.phone}`
                      : ''}
                  </MenuItem>
                ),
              )}
            </TextField>
          </DialogContent>

          <DialogActions>
            <Button
              onClick={() =>
                setAssignOpen(false)
              }
            >
              İptal
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void assignLocker()
              }
            >
              Ata
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={qrOpen}
          onClose={() =>
            setQrOpen(false)
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            QR ile Dolap Aç
          </DialogTitle>

          <DialogContent>
            <TextField
              label="QR Anahtarı"
              value={qrToken}
              onChange={(event) =>
                setQrToken(
                  event.target.value,
                )
              }
              placeholder="QR okutucudan gelen anahtar"
              fullWidth
              sx={{ mt: 1 }}
            />
          </DialogContent>

          <DialogActions>
            <Button
              onClick={() =>
                setQrOpen(false)
              }
            >
              İptal
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void openByQr()
              }
            >
              Dolabı Aç
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={bulkOpen}
          onClose={() =>
            setBulkOpen(false)
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Toplu Dolap Oluştur
          </DialogTitle>

          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <TextField
                label="Bölüm Harfi"
                value={bulkPrefix}
                onChange={(event) =>
                  setBulkPrefix(
                    event.target.value,
                  )
                }
                placeholder="A"
                fullWidth
              />

              <TextField
                label="Başlangıç Numarası"
                type="number"
                value={bulkStart}
                onChange={(event) =>
                  setBulkStart(
                    event.target.value,
                  )
                }
                fullWidth
              />

              <TextField
                label="Dolap Adedi"
                type="number"
                value={bulkCount}
                onChange={(event) =>
                  setBulkCount(
                    event.target.value,
                  )
                }
                helperText="Tek seferde en fazla 200 dolap"
                fullWidth
              />
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button
              onClick={() =>
                setBulkOpen(false)
              }
            >
              İptal
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void createMultiple()
              }
            >
              Oluştur
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={openDialog}
          onClose={() =>
            setOpenDialog(false)
          }
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>
            Dolap Şifresi
          </DialogTitle>

          <DialogContent>
            <TextField
              label="6 Haneli Şifre"
              value={accessCode}
              onChange={(event) =>
                setAccessCode(
                  event.target.value,
                )
              }
              fullWidth
              sx={{ mt: 1 }}
              slotProps={{
                htmlInput: {
                  maxLength: 6,
                },
                input: {
                  startAdornment: (
                    <KeyRounded
                      sx={{ mr: 1 }}
                    />
                  ),
                },
              }}
            />
          </DialogContent>

          <DialogActions>
            <Button
              onClick={() =>
                setOpenDialog(false)
              }
            >
              İptal
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void openLocker()
              }
            >
              Aç
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
