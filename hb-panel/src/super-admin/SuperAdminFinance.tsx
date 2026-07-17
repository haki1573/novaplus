import {
  AddRounded,
  ArrowBackRounded,
  DeleteRounded,
  EditRounded,
  PaymentsRounded,
  SearchRounded,
  TrendingDownRounded,
  TrendingUpRounded,
  AccountBalanceWalletRounded,
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

import type { FormEvent, ReactNode } from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import { api } from '../services/api';

type FinanceType = 'income' | 'expense';

interface FinanceItem {
  id: number;
  title: string;
  amount: number;
  type: FinanceType;
  description?: string;
  createdAt: string;
}

interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

interface FinanceForm {
  title: string;
  amount: string;
  type: FinanceType;
  description: string;
}

interface ErrorResponse {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
}

const emptyForm: FinanceForm = {
  title: '',
  amount: '',
  type: 'income',
  description: '',
};

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  const requestError = error as ErrorResponse;
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

function formatMoney(
  value: number,
): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(Number(value) || 0);
}

function formatDate(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('tr-TR');
}

export function SuperAdminFinance() {
  const navigate = useNavigate();

  const { gymId } =
    useParams<{
      gymId: string;
    }>();

  const [records, setRecords] =
    useState<FinanceItem[]>([]);

  const [summary, setSummary] =
    useState<FinanceSummary>({
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
    });

  const [search, setSearch] =
    useState('');

  const [filterType, setFilterType] =
    useState<'all' | FinanceType>('all');

  const [loading, setLoading] =
    useState(true);

  const [pageError, setPageError] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [editingRecord, setEditingRecord] =
    useState<FinanceItem | null>(null);

  const [form, setForm] =
    useState<FinanceForm>(emptyForm);

  const [formError, setFormError] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const loadFinance =
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

        const [
          recordsResponse,
          summaryResponse,
        ] = await Promise.all([
          api.get<FinanceItem[]>(
            `/super-admin/gyms/${gymId}/finance`,
          ),
          api.get<FinanceSummary>(
            `/super-admin/gyms/${gymId}/finance/summary`,
          ),
        ]);

        setRecords(recordsResponse.data);
        setSummary(summaryResponse.data);
      } catch (error: unknown) {
        setPageError(
          getErrorMessage(
            error,
            'Finans verileri alınamadı.',
          ),
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    void loadFinance();
  }, [gymId]);

  const filteredRecords =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLocaleLowerCase('tr-TR');

      return records.filter((record) => {
        const matchesSearch =
          !normalizedSearch ||
          [
            record.title,
            record.description,
            String(record.amount),
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase('tr-TR')
            .includes(normalizedSearch);

        const matchesType =
          filterType === 'all' ||
          record.type === filterType;

        return (
          matchesSearch &&
          matchesType
        );
      });
    }, [
      records,
      search,
      filterType,
    ]);

  const openCreateDialog =
    (): void => {
      setEditingRecord(null);
      setForm(emptyForm);
      setFormError('');
      setDialogOpen(true);
    };

  const openEditDialog = (
    record: FinanceItem,
  ): void => {
    setEditingRecord(record);

    setForm({
      title: record.title,
      amount: String(record.amount),
      type: record.type,
      description:
        record.description || '',
    });

    setFormError('');
    setDialogOpen(true);
  };

  const closeDialog = (): void => {
    if (saving) {
      return;
    }

    setDialogOpen(false);
    setEditingRecord(null);
    setForm(emptyForm);
    setFormError('');
  };

  const updateField = (
    field: keyof FinanceForm,
    value: string,
  ): void => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateForm =
    (): string | null => {
      if (!form.title.trim()) {
        return 'Başlık alanı zorunludur.';
      }

      const amount =
        Number(form.amount);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return 'Tutar sıfırdan büyük olmalıdır.';
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
      title: form.title.trim(),
      amount: Number(form.amount),
      type: form.type,
      description:
        form.description.trim(),
    };

    try {
      setSaving(true);

      if (editingRecord) {
        await api.put(
          `/super-admin/gyms/${gymId}/finance/${editingRecord.id}`,
          payload,
        );

        setSuccessMessage(
          'Finans kaydı başarıyla güncellendi.',
        );
      } else {
        await api.post(
          `/super-admin/gyms/${gymId}/finance`,
          payload,
        );

        setSuccessMessage(
          'Yeni finans kaydı eklendi.',
        );
      }

      setDialogOpen(false);
      setEditingRecord(null);
      setForm(emptyForm);

      await loadFinance();

      window.setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (error: unknown) {
      setFormError(
        getErrorMessage(
          error,
          editingRecord
            ? 'Finans kaydı güncellenemedi.'
            : 'Finans kaydı eklenemedi.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (
    record: FinanceItem,
  ): Promise<void> => {
    if (!gymId) {
      return;
    }

    const confirmed =
      window.confirm(
        `${record.title} kaydını silmek istediğine emin misin?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(record.id);
      setPageError('');

      await api.delete(
        `/super-admin/gyms/${gymId}/finance/${record.id}`,
      );

      setSuccessMessage(
        'Finans kaydı silindi.',
      );

      await loadFinance();

      window.setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (error: unknown) {
      setPageError(
        getErrorMessage(
          error,
          'Finans kaydı silinemedi.',
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
            Salon Finans
          </Box>

          <Box
            sx={{
              mt: 0.7,
              color: '#667085',
            }}
          >
            Seçilen salonun gelir, gider ve kasa durumunu yönetin.
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
          Yeni Kayıt
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
          mb: 3,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(3, minmax(0, 1fr))',
          },
          gap: 2,
        }}
      >
        <SummaryCard
          title="Toplam Gelir"
          value={formatMoney(
            summary.totalIncome,
          )}
          icon={<TrendingUpRounded />}
          valueColor="#16a34a"
        />

        <SummaryCard
          title="Toplam Gider"
          value={formatMoney(
            summary.totalExpense,
          )}
          icon={<TrendingDownRounded />}
          valueColor="#dc2626"
        />

        <SummaryCard
          title="Net Kasa"
          value={formatMoney(
            summary.balance,
          )}
          icon={
            <AccountBalanceWalletRounded />
          }
          valueColor={
            summary.balance >= 0
              ? '#2563eb'
              : '#dc2626'
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
          <Box
            sx={{
              mb: 3,
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(260px, 1fr) 180px',
              },
              gap: 1.5,
            }}
          >
            <TextField
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Başlık, açıklama veya tutar ara..."
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
            />

            <TextField
              select
              label="Tür"
              value={filterType}
              onChange={(event) =>
                setFilterType(
                  event.target.value as
                    | 'all'
                    | FinanceType,
                )
              }
              fullWidth
            >
              <MenuItem value="all">
                Tümü
              </MenuItem>

              <MenuItem value="income">
                Gelir
              </MenuItem>

              <MenuItem value="expense">
                Gider
              </MenuItem>
            </TextField>
          </Box>

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
                      Başlık
                    </TableCell>

                    <TableCell>
                      Tür
                    </TableCell>

                    <TableCell>
                      Tutar
                    </TableCell>

                    <TableCell>
                      Açıklama
                    </TableCell>

                    <TableCell>
                      Tarih
                    </TableCell>

                    <TableCell align="center">
                      İşlemler
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredRecords.map(
                    (record) => (
                      <TableRow
                        key={record.id}
                        hover
                      >
                        <TableCell
                          sx={{
                            fontWeight: 700,
                          }}
                        >
                          {record.title}
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={
                              record.type ===
                              'income'
                                ? 'Gelir'
                                : 'Gider'
                            }
                            color={
                              record.type ===
                              'income'
                                ? 'success'
                                : 'error'
                            }
                            size="small"
                          />
                        </TableCell>

                        <TableCell
                          sx={{
                            fontWeight: 800,
                            color:
                              record.type ===
                              'income'
                                ? '#16a34a'
                                : '#dc2626',
                          }}
                        >
                          {record.type ===
                          'income'
                            ? '+'
                            : '-'}
                          {formatMoney(
                            record.amount,
                          )}
                        </TableCell>

                        <TableCell>
                          {record.description ||
                            '-'}
                        </TableCell>

                        <TableCell>
                          {formatDate(
                            record.createdAt,
                          )}
                        </TableCell>

                        <TableCell align="center">
                          <Tooltip title="Düzenle">
                            <IconButton
                              color="primary"
                              onClick={() =>
                                openEditDialog(
                                  record,
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
                                  record.id
                                }
                                onClick={() => {
                                  void handleDelete(
                                    record,
                                  );
                                }}
                              >
                                {deletingId ===
                                record.id ? (
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

                  {filteredRecords.length ===
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
                        <PaymentsRounded
                          sx={{
                            mb: 1,
                            fontSize: 42,
                            display: 'block',
                            mx: 'auto',
                            color:
                              '#98a2b3',
                          }}
                        />

                        Finans kaydı bulunamadı.
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
            {editingRecord
              ? 'Finans Kaydını Düzenle'
              : 'Yeni Finans Kaydı'}
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
              label="Başlık"
              value={form.title}
              onChange={(event) =>
                updateField(
                  'title',
                  event.target.value,
                )
              }
              disabled={saving}
              required
              fullWidth
            />

            <TextField
              select
              label="Kayıt Türü"
              value={form.type}
              onChange={(event) =>
                updateField(
                  'type',
                  event.target.value,
                )
              }
              disabled={saving}
              fullWidth
            >
              <MenuItem value="income">
                Gelir
              </MenuItem>

              <MenuItem value="expense">
                Gider
              </MenuItem>
            </TextField>

            <TextField
              label="Tutar"
              type="number"
              value={form.amount}
              onChange={(event) =>
                updateField(
                  'amount',
                  event.target.value,
                )
              }
              disabled={saving}
              required
              fullWidth
              slotProps={{
                htmlInput: {
                  min: 0.01,
                  step: '0.01',
                },
              }}
            />

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
              ) : editingRecord ? (
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
  icon: ReactNode;
  valueColor: string;
}

function SummaryCard({
  title,
  value,
  icon,
  valueColor,
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
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            gap: 2,
          }}
        >
          <Box>
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
                fontSize: 24,
                fontWeight: 800,
                color: valueColor,
              }}
            >
              {value}
            </Box>
          </Box>

          <Box
            sx={{
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2.5,
              color: valueColor,
              backgroundColor: '#f8fafc',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
