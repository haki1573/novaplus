import {
  AddRounded,
  ArrowBackRounded,
  DeleteRounded,
  EditRounded,
  GroupRounded,
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
  IconButton,
  InputAdornment,
  MenuItem,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { FormEvent } from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import { api } from '../services/api';

type UserRole =
  | 'GYM_ADMIN'
  | 'STAFF';

interface StaffItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  gymId: string;
  isActive: boolean;
  createdAt: string;
}

interface StaffForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
}

interface ErrorResponse {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
}

const emptyForm: StaffForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'STAFF',
  isActive: true,
};

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  const requestError =
    error as ErrorResponse;

  const message =
    requestError.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(' ');
  }

  if (typeof message === 'string') {
    return message;
  }

  return fallbackMessage;
}

function formatDate(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString(
    'tr-TR',
  );
}

export function SuperAdminStaff() {
  const navigate = useNavigate();

  const { gymId } =
    useParams<{
      gymId: string;
    }>();

  const [staff, setStaff] =
    useState<StaffItem[]>([]);

  const [search, setSearch] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [pageError, setPageError] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [editingStaff, setEditingStaff] =
    useState<StaffItem | null>(null);

  const [form, setForm] =
    useState<StaffForm>(emptyForm);

  const [formError, setFormError] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [statusChangingId, setStatusChangingId] =
    useState<string | null>(null);

  const loadStaff =
    async (): Promise<void> => {
      if (!gymId) {
        setPageError(
          'Spor salonu kimliği bulunamadı.',
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setPageError('');

        const response =
          await api.get<StaffItem[]>(
            `/super-admin/gyms/${gymId}/staff`,
          );

        setStaff(response.data);
      } catch (error: unknown) {
        setPageError(
          getErrorMessage(
            error,
            'Personeller alınamadı.',
          ),
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    void loadStaff();
  }, [gymId]);

  const filteredStaff =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLocaleLowerCase(
            'tr-TR',
          );

      if (!normalizedSearch) {
        return staff;
      }

      return staff.filter(
        (item) =>
          [
            item.firstName,
            item.lastName,
            item.email,
            item.role,
          ]
            .join(' ')
            .toLocaleLowerCase(
              'tr-TR',
            )
            .includes(
              normalizedSearch,
            ),
      );
    }, [staff, search]);

  const openCreateDialog =
    (): void => {
      setEditingStaff(null);
      setForm(emptyForm);
      setFormError('');
      setDialogOpen(true);
    };

  const openEditDialog = (
    item: StaffItem,
  ): void => {
    setEditingStaff(item);

    setForm({
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      password: '',
      role: item.role,
      isActive: item.isActive,
    });

    setFormError('');
    setDialogOpen(true);
  };

  const closeDialog = (): void => {
    if (saving) {
      return;
    }

    setDialogOpen(false);
    setEditingStaff(null);
    setForm(emptyForm);
    setFormError('');
  };

  const validateForm =
    (): string | null => {
      if (!form.firstName.trim()) {
        return 'Personel adı zorunludur.';
      }

      if (!form.lastName.trim()) {
        return 'Personel soyadı zorunludur.';
      }

      if (
        !form.email.trim() ||
        !form.email.includes('@')
      ) {
        return 'Geçerli bir e-posta adresi girin.';
      }

      if (
        !editingStaff &&
        form.password.length < 8
      ) {
        return 'Şifre en az 8 karakter olmalıdır.';
      }

      if (
        editingStaff &&
        form.password &&
        form.password.length < 8
      ) {
        return 'Yeni şifre en az 8 karakter olmalıdır.';
      }

      return null;
    };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (!gymId) {
      return;
    }

    setFormError('');

    const validationError =
      validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      firstName:
        form.firstName.trim(),
      lastName:
        form.lastName.trim(),
      email:
        form.email
          .trim()
          .toLowerCase(),
      password:
        form.password || undefined,
      role: form.role,
      isActive: form.isActive,
    };

    try {
      setSaving(true);

      if (editingStaff) {
        await api.patch(
          `/super-admin/gyms/${gymId}/staff/${editingStaff.id}`,
          payload,
        );

        setSuccessMessage(
          'Personel bilgileri güncellendi.',
        );
      } else {
        await api.post(
          `/super-admin/gyms/${gymId}/staff`,
          payload,
        );

        setSuccessMessage(
          'Yeni personel eklendi.',
        );
      }

      setDialogOpen(false);
      setEditingStaff(null);
      setForm(emptyForm);

      await loadStaff();

      window.setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (error: unknown) {
      setFormError(
        getErrorMessage(
          error,
          editingStaff
            ? 'Personel güncellenemedi.'
            : 'Personel eklenemedi.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    item: StaffItem,
  ): Promise<void> => {
    if (!gymId) {
      return;
    }

    try {
      setStatusChangingId(item.id);
      setPageError('');

      await api.patch(
        `/super-admin/gyms/${gymId}/staff/${item.id}/status`,
        {
          isActive: !item.isActive,
        },
      );

      await loadStaff();
    } catch (error: unknown) {
      setPageError(
        getErrorMessage(
          error,
          'Personel durumu değiştirilemedi.',
        ),
      );
    } finally {
      setStatusChangingId(null);
    }
  };

  const handleDelete = async (
    item: StaffItem,
  ): Promise<void> => {
    if (!gymId) {
      return;
    }

    const confirmed =
      window.confirm(
        `${item.firstName} ${item.lastName} adlı personeli silmek istediğine emin misin?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(item.id);
      setPageError('');

      await api.delete(
        `/super-admin/gyms/${gymId}/staff/${item.id}`,
      );

      setSuccessMessage(
        'Personel silindi.',
      );

      await loadStaff();

      window.setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (error: unknown) {
      setPageError(
        getErrorMessage(
          error,
          'Personel silinemedi.',
        ),
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box>
      <Button
        startIcon={
          <ArrowBackRounded />
        }
        onClick={() =>
          navigate(
            `/super-admin/gyms/${gymId}`,
          )
        }
        sx={{
          mb: 2,
          textTransform: 'none',
          fontWeight: 700,
        }}
      >
        Salon Yönetimine Dön
      </Button>

      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: {
            xs: 'flex-start',
            sm: 'center',
          },
          flexDirection: {
            xs: 'column',
            sm: 'row',
          },
          gap: 2,
        }}
      >
        <Box>
          <Box
            component="h1"
            sx={{
              m: 0,
              fontSize: {
                xs: 28,
                md: 34,
              },
              fontWeight: 800,
              color: '#101828',
            }}
          >
            Salon Personelleri
          </Box>

          <Box
            sx={{
              mt: 0.7,
              color: '#667085',
            }}
          >
            Salon yöneticilerini ve personelleri yönetin.
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={openCreateDialog}
          sx={{
            minHeight: 44,
            textTransform: 'none',
            fontWeight: 800,
          }}
        >
          Yeni Personel
        </Button>
      </Box>

      {pageError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
        >
          {pageError}
        </Alert>
      )}

      {successMessage && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
        >
          {successMessage}
        </Alert>
      )}

      <Box
        sx={{
          mb: 2.5,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(3, minmax(0, 1fr))',
          },
          gap: 2,
        }}
      >
        <SummaryCard
          title="Toplam Kullanıcı"
          value={staff.length}
        />

        <SummaryCard
          title="Salon Yöneticisi"
          value={
            staff.filter(
              (item) =>
                item.role ===
                'GYM_ADMIN',
            ).length
          }
        />

        <SummaryCard
          title="Personel"
          value={
            staff.filter(
              (item) =>
                item.role === 'STAFF',
            ).length
          }
        />
      </Box>

      <Card
        elevation={0}
        sx={{
          border:
            '1px solid #e8edf3',
          borderRadius: 3,
        }}
      >
        <CardContent>
          <TextField
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Ad, soyad, e-posta veya rol ara..."
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded
                      sx={{
                        color: '#667085',
                      }}
                    />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 3 }}
          />

          {loading ? (
            <Box
              sx={{
                py: 8,
                display: 'flex',
                justifyContent:
                  'center',
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                overflowX: 'auto',
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      Ad Soyad
                    </TableCell>

                    <TableCell>
                      E-posta
                    </TableCell>

                    <TableCell>
                      Rol
                    </TableCell>

                    <TableCell>
                      Durum
                    </TableCell>

                    <TableCell>
                      Kayıt Tarihi
                    </TableCell>

                    <TableCell align="center">
                      İşlemler
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredStaff.map(
                    (item) => (
                      <TableRow
                        key={item.id}
                        hover
                      >
                        <TableCell
                          sx={{
                            fontWeight: 700,
                          }}
                        >
                          {item.firstName}{' '}
                          {item.lastName}
                        </TableCell>

                        <TableCell>
                          {item.email}
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={
                              item.role ===
                              'GYM_ADMIN'
                                ? 'Salon Yöneticisi'
                                : 'Personel'
                            }
                            color={
                              item.role ===
                              'GYM_ADMIN'
                                ? 'primary'
                                : 'default'
                            }
                            size="small"
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={
                              item.isActive
                                ? 'Aktif'
                                : 'Pasif'
                            }
                            color={
                              item.isActive
                                ? 'success'
                                : 'default'
                            }
                            size="small"
                          />
                        </TableCell>

                        <TableCell>
                          {formatDate(
                            item.createdAt,
                          )}
                        </TableCell>

                        <TableCell align="center">
                          <Tooltip
                            title={
                              item.isActive
                                ? 'Pasif yap'
                                : 'Aktif yap'
                            }
                          >
                            <span>
                              <Switch
                                checked={
                                  item.isActive
                                }
                                disabled={
                                  statusChangingId ===
                                  item.id
                                }
                                onChange={() => {
                                  void handleStatusChange(
                                    item,
                                  );
                                }}
                              />
                            </span>
                          </Tooltip>

                          <Tooltip title="Düzenle">
                            <IconButton
                              color="primary"
                              onClick={() =>
                                openEditDialog(
                                  item,
                                )
                              }
                            >
                              <EditRounded />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Sil">
                            <span>
                              <IconButton
                                color="error"
                                disabled={
                                  deletingId ===
                                  item.id
                                }
                                onClick={() => {
                                  void handleDelete(
                                    item,
                                  );
                                }}
                              >
                                {deletingId ===
                                item.id ? (
                                  <CircularProgress
                                    size={20}
                                  />
                                ) : (
                                  <DeleteRounded />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ),
                  )}

                  {filteredStaff.length ===
                    0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        align="center"
                        sx={{
                          py: 6,
                          color:
                            '#667085',
                        }}
                      >
                        <GroupRounded
                          sx={{
                            mb: 1,
                            fontSize: 44,
                            display: 'block',
                            mx: 'auto',
                            color:
                              '#98a2b3',
                          }}
                        />

                        Personel bulunamadı.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
        >
          <DialogTitle
            sx={{ fontWeight: 800 }}
          >
            {editingStaff
              ? 'Personeli Düzenle'
              : 'Yeni Personel Ekle'}
          </DialogTitle>

          <DialogContent
            dividers
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {formError && (
              <Alert severity="error">
                {formError}
              </Alert>
            )}

            <TextField
              label="Ad"
              value={form.firstName}
              onChange={(event) =>
                setForm({
                  ...form,
                  firstName:
                    event.target.value,
                })
              }
              disabled={saving}
              required
              fullWidth
            />

            <TextField
              label="Soyad"
              value={form.lastName}
              onChange={(event) =>
                setForm({
                  ...form,
                  lastName:
                    event.target.value,
                })
              }
              disabled={saving}
              required
              fullWidth
            />

            <TextField
              label="E-posta"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({
                  ...form,
                  email:
                    event.target.value,
                })
              }
              disabled={saving}
              required
              fullWidth
            />

            <TextField
              select
              label="Rol"
              value={form.role}
              onChange={(event) =>
                setForm({
                  ...form,
                  role:
                    event.target
                      .value as UserRole,
                })
              }
              disabled={saving}
              fullWidth
            >
              <MenuItem value="GYM_ADMIN">
                Salon Yöneticisi
              </MenuItem>

              <MenuItem value="STAFF">
                Personel
              </MenuItem>
            </TextField>

            <TextField
              label={
                editingStaff
                  ? 'Yeni Şifre (isteğe bağlı)'
                  : 'Şifre'
              }
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({
                  ...form,
                  password:
                    event.target.value,
                })
              }
              disabled={saving}
              required={!editingStaff}
              helperText={
                editingStaff
                  ? 'Boş bırakırsanız mevcut şifre değişmez.'
                  : 'En az 8 karakter.'
              }
              fullWidth
            />

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'space-between',
                px: 1,
              }}
            >
              <Box>
                <Box
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  Aktif Kullanıcı
                </Box>

                <Box
                  sx={{
                    fontSize: 13,
                    color: '#667085',
                  }}
                >
                  Pasif kullanıcı sisteme giriş yapamaz.
                </Box>
              </Box>

              <Switch
                checked={form.isActive}
                onChange={(event) =>
                  setForm({
                    ...form,
                    isActive:
                      event.target.checked,
                  })
                }
                disabled={saving}
              />
            </Box>
          </DialogContent>

          <DialogActions
            sx={{
              px: 3,
              py: 2,
            }}
          >
            <Button
              type="button"
              onClick={closeDialog}
              disabled={saving}
              sx={{
                textTransform: 'none',
              }}
            >
              İptal
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{
                minWidth: 140,
                textTransform: 'none',
                fontWeight: 800,
              }}
            >
              {saving ? (
                <CircularProgress
                  size={21}
                  sx={{
                    color: '#ffffff',
                  }}
                />
              ) : editingStaff ? (
                'Güncelle'
              ) : (
                'Kaydet'
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}

interface SummaryCardProps {
  title: string;
  value: number;
}

function SummaryCard({
  title,
  value,
}: SummaryCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        border:
          '1px solid #e8edf3',
        borderRadius: 3,
      }}
    >
      <CardContent>
        <Box
          sx={{
            fontSize: 13,
            color: '#667085',
          }}
        >
          {title}
        </Box>

        <Box
          sx={{
            mt: 0.5,
            fontSize: 26,
            fontWeight: 800,
            color: '#101828',
          }}
        >
          {value}
        </Box>
      </CardContent>
    </Card>
  );
}
