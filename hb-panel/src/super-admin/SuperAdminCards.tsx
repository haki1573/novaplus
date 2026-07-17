import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AddRounded,
  AutorenewRounded,
  CreditCardRounded,
  DeleteRounded,
  EditRounded,
  QrCode2Rounded,
  SearchRounded,
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
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import { api } from '../services/api';

type AccessCardStatus =
  | 'ACTIVE'
  | 'PASSIVE'
  | 'LOST'
  | 'CANCELLED';

interface Member {
  id: number;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

interface AccessCard {
  id: string;
  gymId: string;
  memberId: number;
  cardNumber: string;
  qrCode: string;
  status: AccessCardStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  member?: Member;
}

interface CardForm {
  memberId: string;
  cardNumber: string;
  qrCode: string;
  status: AccessCardStatus;
  note: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

const initialForm: CardForm = {
  memberId: '',
  cardNumber: '',
  qrCode: '',
  status: 'ACTIVE',
  note: '',
};

const statusLabels: Record<
  AccessCardStatus,
  string
> = {
  ACTIVE: 'Aktif',
  PASSIVE: 'Pasif',
  LOST: 'Kayıp',
  CANCELLED: 'İptal',
};

const statusColors: Record<
  AccessCardStatus,
  'success' | 'default' | 'warning' | 'error'
> = {
  ACTIVE: 'success',
  PASSIVE: 'default',
  LOST: 'warning',
  CANCELLED: 'error',
};

function getMemberName(
  member?: Member,
): string {
  if (!member) {
    return 'Üye bulunamadı';
  }

  return (
    member.fullName ||
    member.name ||
    `Üye #${member.id}`
  );
}

function getErrorMessage(
  error: unknown,
): string {
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

  return 'İşlem sırasında bir hata oluştu.';
}

export function SuperAdminCards() {
  const { gymId } = useParams<{
    gymId: string;
  }>();

  const navigate = useNavigate();

  const [cards, setCards] = useState<
    AccessCard[]
  >([]);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState('');

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [editingCard, setEditingCard] =
    useState<AccessCard | null>(null);

  const [form, setForm] =
    useState<CardForm>(initialForm);

  const [
    deleteDialogOpen,
    setDeleteDialogOpen,
  ] = useState(false);

  const [
    selectedCard,
    setSelectedCard,
  ] = useState<AccessCard | null>(null);

  const [snackbar, setSnackbar] =
    useState<SnackbarState>({
      open: false,
      message: '',
      severity: 'success',
    });

  const showSnackbar = (
    message: string,
    severity: SnackbarState['severity'],
  ) => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const loadData = useCallback(
    async () => {
      if (!gymId) {
        return;
      }

      try {
        setLoading(true);

        const [
          cardsResponse,
          membersResponse,
        ] = await Promise.all([
          api.get<AccessCard[]>(
            `/super-admin/gyms/${gymId}/cards`,
          ),
          api.get<Member[]>(
            `/super-admin/gyms/${gymId}/members`,
          ),
        ]);

        const normalizeArray = <T,>(payload: any): T[] => {
          if (Array.isArray(payload)) return payload;
          if (Array.isArray(payload?.data)) return payload.data;
          if (Array.isArray(payload?.items)) return payload.items;
          if (Array.isArray(payload?.members)) return payload.members;
          if (Array.isArray(payload?.cards)) return payload.cards;
          return [];
        };

        setCards(
          normalizeArray<AccessCard>(
            cardsResponse.data,
          ),
        );

        setMembers(
          normalizeArray<Member>(
            membersResponse.data,
          ),
        );
      } catch (error) {
        showSnackbar(
          getErrorMessage(error),
          'error',
        );
      } finally {
        setLoading(false);
      }
    },
    [gymId],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCards = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase('tr-TR');

    if (!query) {
      return cards;
    }

    return cards.filter((card) => {
      const searchable = [
        card.cardNumber,
        card.qrCode,
        card.note || '',
        getMemberName(card.member),
        statusLabels[card.status],
      ]
        .join(' ')
        .toLocaleLowerCase('tr-TR');

      return searchable.includes(query);
    });
  }, [cards, search]);

  const stats = useMemo(
    () => ({
      total: cards.length,
      active: cards.filter(
        (card) =>
          card.status === 'ACTIVE',
      ).length,
      passive: cards.filter(
        (card) =>
          card.status === 'PASSIVE',
      ).length,
      problem: cards.filter(
        (card) =>
          card.status === 'LOST' ||
          card.status === 'CANCELLED',
      ).length,
    }),
    [cards],
  );

  const openCreateDialog = () => {
    setEditingCard(null);
    setForm(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (
    card: AccessCard,
  ) => {
    setEditingCard(card);
    setForm({
      memberId: String(card.memberId),
      cardNumber: card.cardNumber,
      qrCode: card.qrCode,
      status: card.status,
      note: card.note || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) {
      return;
    }

    setDialogOpen(false);
    setEditingCard(null);
    setForm(initialForm);
  };

  const generateQrCode = async () => {
    if (!gymId) {
      return;
    }

    try {
      const response =
        await api.post<{
          qrCode: string;
        }>(
          `/super-admin/gyms/${gymId}/cards/generate-qr`,
        );

      setForm((current) => ({
        ...current,
        qrCode: response.data.qrCode,
      }));
    } catch (error) {
      showSnackbar(
        getErrorMessage(error),
        'error',
      );
    }
  };

  const saveCard = async () => {
    if (!gymId) {
      return;
    }

    if (!form.memberId) {
      showSnackbar(
        'Lütfen bir üye seçin.',
        'warning',
      );
      return;
    }

    if (
      form.cardNumber.trim().length < 4
    ) {
      showSnackbar(
        'Kart numarası en az 4 karakter olmalıdır.',
        'warning',
      );
      return;
    }

    const payload = {
      memberId: Number(form.memberId),
      cardNumber:
        form.cardNumber.trim(),
      qrCode: form.qrCode.trim(),
      status: form.status,
      note: form.note.trim() || null,
    };

    try {
      setSaving(true);

      if (editingCard) {
        await api.patch(
          `/super-admin/gyms/${gymId}/cards/${editingCard.id}`,
          payload,
        );

        showSnackbar(
          'Kart/QR kaydı güncellendi.',
          'success',
        );
      } else {
        await api.post(
          `/super-admin/gyms/${gymId}/cards`,
          payload,
        );

        showSnackbar(
          'Kart/QR kaydı oluşturuldu.',
          'success',
        );
      }

      closeDialog();
      await loadData();
    } catch (error) {
      showSnackbar(
        getErrorMessage(error),
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (
    card: AccessCard,
    status: AccessCardStatus,
  ) => {
    if (!gymId) {
      return;
    }

    try {
      await api.patch(
        `/super-admin/gyms/${gymId}/cards/${card.id}/status`,
        { status },
      );

      showSnackbar(
        `Kart durumu "${statusLabels[status]}" olarak güncellendi.`,
        'success',
      );

      await loadData();
    } catch (error) {
      showSnackbar(
        getErrorMessage(error),
        'error',
      );
    }
  };

  const askDelete = (
    card: AccessCard,
  ) => {
    setSelectedCard(card);
    setDeleteDialogOpen(true);
  };

  const deleteCard = async () => {
    if (!gymId || !selectedCard) {
      return;
    }

    try {
      setSaving(true);

      await api.delete(
        `/super-admin/gyms/${gymId}/cards/${selectedCard.id}`,
      );

      showSnackbar(
        'Kart/QR kaydı silindi.',
        'success',
      );

      setDeleteDialogOpen(false);
      setSelectedCard(null);

      await loadData();
    } catch (error) {
      showSnackbar(
        getErrorMessage(error),
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!gymId) {
    return (
      <Alert severity="error">
        Spor salonu kimliği bulunamadı.
      </Alert>
    );
  }

  return (
    <Box>
      <Stack
        spacing={2}
        sx={{
          mb: 3,
          flexDirection: {
            xs: 'column',
            md: 'row',
          },
          alignItems: {
            xs: 'stretch',
            md: 'center',
          },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Button
            size="small"
            onClick={() =>
              navigate(
                `/super-admin/gyms/${gymId}`,
              )
            }
            sx={{
              mb: 1,
              px: 0,
              textTransform: 'none',
            }}
          >
            ← Salon yönetimine dön
          </Button>

          <Typography
            variant="h4"
            sx={{ fontWeight: 800 }}
          >
            Kart & QR Yönetimi
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              color: '#667085',
            }}
          >
            Üyelere giriş kartı ve QR kodu
            tanımlayın, durumlarını yönetin.
          </Typography>
        </Box>

        <Stack
          spacing={1.5}
          sx={{
            flexDirection: {
              xs: 'column',
              sm: 'row',
            },
          }}
        >
          <Button
            variant="outlined"
            startIcon={
              <AutorenewRounded />
            }
            onClick={() =>
              void loadData()
            }
            disabled={loading}
            sx={{
              textTransform: 'none',
            }}
          >
            Yenile
          </Button>

          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={openCreateDialog}
            sx={{
              textTransform: 'none',
            }}
          >
            Yeni Kart / QR
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          {
            label: 'Toplam Kayıt',
            value: stats.total,
            icon: <CreditCardRounded />,
          },
          {
            label: 'Aktif',
            value: stats.active,
            icon: <QrCode2Rounded />,
          },
          {
            label: 'Pasif',
            value: stats.passive,
            icon: <CreditCardRounded />,
          },
          {
            label: 'Kayıp / İptal',
            value: stats.problem,
            icon: <QrCode2Rounded />,
          },
        ].map((item) => (
          <Card
            key={item.label}
            elevation={0}
            sx={{
              border:
                '1px solid #e4e7ec',
              borderRadius: 2,
            }}
          >
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {item.label}
                  </Typography>

                  <Typography
                    variant="h4"
                    sx={{
                      mt: 0.5,
                      fontWeight: 800,
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#1468f3',
                    backgroundColor:
                      '#eef4ff',
                  }}
                >
                  {item.icon}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          border:
            '1px solid #e4e7ec',
          borderRadius: 2,
        }}
      >
        <TextField
          fullWidth
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Kart numarası, QR kodu, üye veya durum ara..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border:
            '1px solid #e4e7ec',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <Box
            sx={{
              py: 8,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : filteredCards.length === 0 ? (
          <Box
            sx={{
              px: 2,
              py: 8,
              textAlign: 'center',
            }}
          >
            <QrCode2Rounded
              sx={{
                fontSize: 52,
                color: '#98a2b3',
              }}
            />

            <Typography
              variant="h6"
              sx={{
                mt: 1,
                fontWeight: 700,
              }}
            >
              Kart/QR kaydı bulunamadı
            </Typography>

            <Typography
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              Yeni bir kart veya QR kodu
              ekleyerek başlayın.
            </Typography>
          </Box>
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
                  Kart Numarası
                </TableCell>
                <TableCell>
                  QR Kodu
                </TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Not</TableCell>
                <TableCell>
                  Oluşturulma
                </TableCell>
                <TableCell align="right">
                  İşlemler
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredCards.map(
                (card) => (
                  <TableRow
                    key={card.id}
                    hover
                  >
                    <TableCell>
                      <Typography
                        sx={{ fontWeight: 700 }}
                      >
                        {getMemberName(
                          card.member,
                        )}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Üye #{card.memberId}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        component="code"
                        sx={{ fontWeight: 700 }}
                      >
                        {card.cardNumber}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        component="code"
                        variant="body2"
                        sx={{
                          maxWidth: 240,
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow:
                            'ellipsis',
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {card.qrCode}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <FormControl
                        size="small"
                        sx={{ minWidth: 120 }}
                      >
                        <Select
                          value={card.status}
                          onChange={(event) =>
                            void updateStatus(
                              card,
                              event.target
                                .value as AccessCardStatus,
                            )
                          }
                          renderValue={(
                            value,
                          ) => (
                            <Chip
                              size="small"
                              label={
                                statusLabels[
                                  value as AccessCardStatus
                                ]
                              }
                              color={
                                statusColors[
                                  value as AccessCardStatus
                                ]
                              }
                            />
                          )}
                        >
                          {(
                            Object.keys(
                              statusLabels,
                            ) as AccessCardStatus[]
                          ).map(
                            (status) => (
                              <MenuItem
                                key={status}
                                value={status}
                              >
                                {
                                  statusLabels[
                                    status
                                  ]
                                }
                              </MenuItem>
                            ),
                          )}
                        </Select>
                      </FormControl>
                    </TableCell>

                    <TableCell>
                      {card.note || '—'}
                    </TableCell>

                    <TableCell>
                      {new Date(
                        card.createdAt,
                      ).toLocaleDateString(
                        'tr-TR',
                      )}
                    </TableCell>

                    <TableCell align="right">
                      <Tooltip title="Düzenle">
                        <IconButton
                          onClick={() =>
                            openEditDialog(
                              card,
                            )
                          }
                        >
                          <EditRounded />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Sil">
                        <IconButton
                          color="error"
                          onClick={() =>
                            askDelete(card)
                          }
                        >
                          <DeleteRounded />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingCard
            ? 'Kart / QR Düzenle'
            : 'Yeni Kart / QR Ekle'}
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <FormControl fullWidth>
              <InputLabel id="member-label">
                Üye
              </InputLabel>

              <Select
                labelId="member-label"
                label="Üye"
                value={form.memberId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    memberId:
                      event.target.value,
                  }))
                }
              >
                {members.map((member) => (
                  <MenuItem
                    key={member.id}
                    value={String(member.id)}
                  >
                    {getMemberName(member)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Kart Numarası"
              value={form.cardNumber}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  cardNumber:
                    event.target.value,
                }))
              }
              placeholder="Örn: NP-0001"
            />

            <Stack
              spacing={1}
              sx={{
                flexDirection: {
                  xs: 'column',
                  sm: 'row',
                },
              }}
            >
              <TextField
                fullWidth
                label="QR Kodu"
                value={form.qrCode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    qrCode:
                      event.target.value,
                  }))
                }
                placeholder="Boş bırakılırsa otomatik üretilir"
              />

              <Button
                variant="outlined"
                startIcon={
                  <QrCode2Rounded />
                }
                onClick={() =>
                  void generateQrCode()
                }
                sx={{
                  minWidth: 150,
                  textTransform: 'none',
                }}
              >
                QR Üret
              </Button>
            </Stack>

            <FormControl fullWidth>
              <InputLabel id="status-label">
                Durum
              </InputLabel>

              <Select
                labelId="status-label"
                label="Durum"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status:
                      event.target
                        .value as AccessCardStatus,
                  }))
                }
              >
                {(
                  Object.keys(
                    statusLabels,
                  ) as AccessCardStatus[]
                ).map((status) => (
                  <MenuItem
                    key={status}
                    value={status}
                  >
                    {statusLabels[status]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Not"
              value={form.note}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              placeholder="İsteğe bağlı açıklama"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={closeDialog}
            disabled={saving}
            sx={{ textTransform: 'none' }}
          >
            Vazgeç
          </Button>

          <Button
            variant="contained"
            onClick={() =>
              void saveCard()
            }
            disabled={saving}
            sx={{ textTransform: 'none' }}
          >
            {saving
              ? 'Kaydediliyor...'
              : editingCard
                ? 'Güncelle'
                : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!saving) {
            setDeleteDialogOpen(false);
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Kart kaydını sil
        </DialogTitle>

        <DialogContent>
          <Typography>
            <strong>
              {selectedCard?.cardNumber}
            </strong>{' '}
            numaralı kart/QR kaydı
            silinsin mi? Bu işlem geri
            alınamaz.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() =>
              setDeleteDialogOpen(false)
            }
            disabled={saving}
            sx={{ textTransform: 'none' }}
          >
            Vazgeç
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={() =>
              void deleteCard()
            }
            disabled={saving}
            sx={{ textTransform: 'none' }}
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() =>
          setSnackbar((current) => ({
            ...current,
            open: false,
          }))
        }
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() =>
            setSnackbar((current) => ({
              ...current,
              open: false,
            }))
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
