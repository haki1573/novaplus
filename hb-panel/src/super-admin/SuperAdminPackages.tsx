import {
  AddRounded,
  ArrowBackRounded,
  DeleteRounded,
  EditRounded,
  Inventory2Rounded,
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

interface PackageItem {
  id: string;
  name: string;
  price: number;
  durationMonths: number;
  description: string;
  status: string;
  gymId: string;
  createdAt: string;
}

interface PackageForm {
  name: string;
  price: string;
  durationMonths: string;
  description: string;
  status: string;
}

interface ErrorResponse {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
}

const emptyForm: PackageForm = {
  name: '',
  price: '',
  durationMonths: '',
  description: '',
  status: 'Aktif',
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

function formatCurrency(
  value: number,
): string {
  return new Intl.NumberFormat(
    'tr-TR',
    {
      style: 'currency',
      currency: 'TRY',
    },
  ).format(Number(value));
}

export function SuperAdminPackages() {
  const navigate = useNavigate();

  const { gymId } =
    useParams<{
      gymId: string;
    }>();

  const [packages, setPackages] =
    useState<PackageItem[]>([]);

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

  const [editingPackage, setEditingPackage] =
    useState<PackageItem | null>(null);

  const [form, setForm] =
    useState<PackageForm>(emptyForm);

  const [formError, setFormError] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const loadPackages =
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
          await api.get<PackageItem[]>(
            `/super-admin/gyms/${gymId}/packages`,
          );

        setPackages(response.data);
      } catch (error: unknown) {
        setPageError(
          getErrorMessage(
            error,
            'Salon paketleri alınamadı.',
          ),
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    void loadPackages();
  }, [gymId]);

  const filteredPackages =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLocaleLowerCase(
            'tr-TR',
          );

      if (!normalizedSearch) {
        return packages;
      }

      return packages.filter(
        (item) => {
          const searchableText = [
            item.name,
            item.description,
            item.status,
            String(item.price),
            String(
              item.durationMonths,
            ),
          ]
            .join(' ')
            .toLocaleLowerCase(
              'tr-TR',
            );

          return searchableText.includes(
            normalizedSearch,
          );
        },
      );
    }, [packages, search]);

  const resetDialog = (): void => {
    if (saving) {
      return;
    }

    setDialogOpen(false);
    setEditingPackage(null);
    setForm(emptyForm);
    setFormError('');
  };

  const openCreateDialog =
    (): void => {
      setEditingPackage(null);
      setForm(emptyForm);
      setFormError('');
      setDialogOpen(true);
    };

  const openEditDialog = (
    item: PackageItem,
  ): void => {
    setEditingPackage(item);

    setForm({
      name: item.name,
      price: String(item.price),
      durationMonths: String(
        item.durationMonths,
      ),
      description:
        item.description || '',
      status:
        item.status || 'Aktif',
    });

    setFormError('');
    setDialogOpen(true);
  };

  const updateField = (
    field: keyof PackageForm,
    value: string,
  ): void => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateForm =
    (): string | null => {
      if (!form.name.trim()) {
        return 'Paket adı zorunludur.';
      }

      const price = Number(form.price);

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        return 'Geçerli bir fiyat girin.';
      }

      const durationMonths = Number(
        form.durationMonths,
      );

      if (
        !Number.isInteger(
          durationMonths,
        ) ||
        durationMonths <= 0
      ) {
        return 'Paket süresi en az 1 ay olmalıdır.';
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
      name: form.name.trim(),
      price: Number(form.price),
      durationMonths: Number(
        form.durationMonths,
      ),
      description:
        form.description.trim(),
      status: form.status,
    };

    try {
      setSaving(true);

      if (editingPackage) {
        await api.put(
          `/super-admin/gyms/${gymId}/packages/${editingPackage.id}`,
          payload,
        );

        setSuccessMessage(
          'Paket başarıyla güncellendi.',
        );
      } else {
        await api.post(
          `/super-admin/gyms/${gymId}/packages`,
          payload,
        );

        setSuccessMessage(
          'Yeni paket başarıyla oluşturuldu.',
        );
      }

      setDialogOpen(false);
      setEditingPackage(null);
      setForm(emptyForm);

      await loadPackages();

      window.setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (error: unknown) {
      setFormError(
        getErrorMessage(
          error,
          editingPackage
            ? 'Paket güncellenemedi.'
            : 'Paket oluşturulamadı.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (
    item: PackageItem,
  ): Promise<void> => {
    if (!gymId) {
      return;
    }

    const confirmed =
      window.confirm(
        `${item.name} paketini silmek istediğine emin misin?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(item.id);
      setPageError('');

      await api.delete(
        `/super-admin/gyms/${gymId}/packages/${item.id}`,
      );

      setSuccessMessage(
        'Paket başarıyla silindi.',
      );

      await loadPackages();

      window.setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (error: unknown) {
      setPageError(
        getErrorMessage(
          error,
          'Paket silinemedi.',
        ),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusToggle =
    async (
      item: PackageItem,
    ): Promise<void> => {
      if (!gymId) {
        return;
      }

      try {
        setPageError('');

        await api.put(
          `/super-admin/gyms/${gymId}/packages/${item.id}`,
          {
            status:
              item.status === 'Pasif'
                ? 'Aktif'
                : 'Pasif',
          },
        );

        await loadPackages();
      } catch (error: unknown) {
        setPageError(
          getErrorMessage(
            error,
            'Paket durumu değiştirilemedi.',
          ),
        );
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
            Salon Paketleri
          </Box>

          <Box
            sx={{
              mt: 0.7,
              color: '#667085',
            }}
          >
            Seçilen salonun üyelik paketlerini yönetin.
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={openCreateDialog}
          sx={{
            minHeight: 44,
            px: 2.5,
            textTransform: 'none',
            fontWeight: 800,
          }}
        >
          Yeni Paket
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
          title="Toplam Paket"
          value={String(
            packages.length,
          )}
        />

        <SummaryCard
          title="Aktif Paket"
          value={String(
            packages.filter(
              (item) =>
                item.status !== 'Pasif',
            ).length,
          )}
        />

        <SummaryCard
          title="Pasif Paket"
          value={String(
            packages.filter(
              (item) =>
                item.status === 'Pasif',
            ).length,
          )}
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
            placeholder="Paket adı, açıklama, fiyat veya süre ara..."
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
                      Paket Adı
                    </TableCell>

                    <TableCell>
                      Süre
                    </TableCell>

                    <TableCell>
                      Fiyat
                    </TableCell>

                    <TableCell>
                      Açıklama
                    </TableCell>

                    <TableCell>
                      Durum
                    </TableCell>

                    <TableCell align="center">
                      İşlemler
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredPackages.map(
                    (item) => (
                      <TableRow
                        key={item.id}
                        hover
                      >
                        <TableCell
                          sx={{
                            fontWeight: 800,
                          }}
                        >
                          {item.name}
                        </TableCell>

                        <TableCell>
                          {item.durationMonths}{' '}
                          Ay
                        </TableCell>

                        <TableCell
                          sx={{
                            fontWeight: 700,
                          }}
                        >
                          {formatCurrency(
                            item.price,
                          )}
                        </TableCell>

                        <TableCell>
                          {item.description ||
                            '-'}
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={
                              item.status ||
                              'Aktif'
                            }
                            color={
                              item.status ===
                              'Pasif'
                                ? 'default'
                                : 'success'
                            }
                            size="small"
                            onClick={() => {
                              void handleStatusToggle(
                                item,
                              );
                            }}
                            sx={{
                              cursor:
                                'pointer',
                              fontWeight: 700,
                            }}
                          />
                        </TableCell>

                        <TableCell align="center">
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

                  {filteredPackages.length ===
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
                        <Inventory2Rounded
                          sx={{
                            mb: 1,
                            fontSize: 42,
                            display: 'block',
                            mx: 'auto',
                            color:
                              '#98a2b3',
                          }}
                        />

                        Paket bulunamadı.
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
        onClose={resetDialog}
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
            {editingPackage
              ? 'Paketi Düzenle'
              : 'Yeni Paket Ekle'}
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
              label="Paket Adı"
              value={form.name}
              onChange={(event) =>
                updateField(
                  'name',
                  event.target.value,
                )
              }
              disabled={saving}
              required
              fullWidth
            />

            <TextField
              label="Fiyat"
              type="number"
              value={form.price}
              onChange={(event) =>
                updateField(
                  'price',
                  event.target.value,
                )
              }
              disabled={saving}
              required
              fullWidth
              slotProps={{
                htmlInput: {
                  min: 0,
                  step: '0.01',
                },
              }}
            />

            <TextField
              label="Süre (Ay)"
              type="number"
              value={
                form.durationMonths
              }
              onChange={(event) =>
                updateField(
                  'durationMonths',
                  event.target.value,
                )
              }
              disabled={saving}
              required
              fullWidth
              slotProps={{
                htmlInput: {
                  min: 1,
                  step: 1,
                },
              }}
            />

            <TextField
              select
              label="Durum"
              value={form.status}
              onChange={(event) =>
                updateField(
                  'status',
                  event.target.value,
                )
              }
              disabled={saving}
              fullWidth
            >
              <MenuItem value="Aktif">
                Aktif
              </MenuItem>

              <MenuItem value="Pasif">
                Pasif
              </MenuItem>
            </TextField>

            <TextField
              label="Açıklama"
              value={form.description}
              onChange={(event) =>
                updateField(
                  'description',
                  event.target.value,
                )
              }
              disabled={saving}
              multiline
              minRows={3}
              fullWidth
            />
          </DialogContent>

          <DialogActions
            sx={{
              px: 3,
              py: 2,
            }}
          >
            <Button
              type="button"
              onClick={resetDialog}
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
              ) : editingPackage ? (
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
  value: string;
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
