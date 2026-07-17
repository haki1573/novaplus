import {
  AddRounded,
  ArrowBackRounded,
  AutorenewRounded,
  DeleteRounded,
  EditRounded,
  GroupsRounded,
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
}

interface Member {
  id: number;
  name?: string;
  fullName: string;
  phone: string;
  email: string;
  status: string;
  packageId?: string | null;
  membershipStart?: string | null;
  membershipEnd?: string | null;
  package?: PackageItem | null;
}

interface MemberForm {
  fullName: string;
  phone: string;
  email: string;
  packageId: string;
}

interface ErrorResponse {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
}

const emptyForm: MemberForm = {
  fullName: '',
  phone: '',
  email: '',
  packageId: '',
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
  value?: string | null,
): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString(
    'tr-TR',
  );
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

function getMembershipState(
  member: Member,
): {
  label: string;
  color:
    | 'success'
    | 'warning'
    | 'error'
    | 'default';
} {
  if (!member.membershipEnd) {
    return {
      label:
        member.status || 'Aktif',
      color:
        member.status === 'Pasif'
          ? 'default'
          : 'success',
    };
  }

  const endDate =
    new Date(member.membershipEnd);

  const remainingDays = Math.ceil(
    (endDate.getTime() -
      Date.now()) /
      (1000 * 60 * 60 * 24),
  );

  if (
    remainingDays < 0 ||
    member.status === 'Pasif'
  ) {
    return {
      label: 'Süresi Doldu',
      color: 'error',
    };
  }

  if (remainingDays <= 7) {
    return {
      label: `${remainingDays} Gün Kaldı`,
      color: 'warning',
    };
  }

  return {
    label: 'Aktif',
    color: 'success',
  };
}

export function SuperAdminMembers() {
  const navigate = useNavigate();

  const { gymId } =
    useParams<{
      gymId: string;
    }>();

  const [members, setMembers] =
    useState<Member[]>([]);

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

  const [editingMember, setEditingMember] =
    useState<Member | null>(null);

  const [form, setForm] =
    useState<MemberForm>(emptyForm);

  const [formError, setFormError] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [renewingId, setRenewingId] =
    useState<number | null>(null);

  const loadMembers =
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
          await api.get<Member[]>(
            `/super-admin/gyms/${gymId}/members`,
          );

        setMembers(response.data);
      } catch (error: unknown) {
        setPageError(
          getErrorMessage(
            error,
            'Salon üyeleri alınamadı.',
          ),
        );
      } finally {
        setLoading(false);
      }
    };

  const loadPackages =
    async (): Promise<void> => {
      if (!gymId) {
        return;
      }

      try {
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
      }
    };

  useEffect(() => {
    void Promise.all([
      loadMembers(),
      loadPackages(),
    ]);
  }, [gymId]);

  const filteredMembers =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLocaleLowerCase(
            'tr-TR',
          );

      if (!normalizedSearch) {
        return members;
      }

      return members.filter(
        (member) => {
          const searchableText = [
            member.fullName,
            member.phone,
            member.email,
            member.package?.name,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase(
              'tr-TR',
            );

          return searchableText.includes(
            normalizedSearch,
          );
        },
      );
    }, [members, search]);

  const updateField = (
    field: keyof MemberForm,
    value: string,
  ): void => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openCreateDialog =
    (): void => {
      setEditingMember(null);
      setForm(emptyForm);
      setFormError('');
      setDialogOpen(true);
    };

  const openEditDialog = (
    member: Member,
  ): void => {
    setEditingMember(member);

    setForm({
      fullName:
        member.fullName || '',
      phone:
        member.phone || '',
      email:
        member.email || '',
      packageId:
        member.packageId ||
        member.package?.id ||
        '',
    });

    setFormError('');
    setDialogOpen(true);
  };

  const closeDialog = (): void => {
    if (saving) {
      return;
    }

    setDialogOpen(false);
    setEditingMember(null);
    setForm(emptyForm);
    setFormError('');
  };

  const validateForm =
    (): string | null => {
      if (!form.fullName.trim()) {
        return 'Ad soyad alanı zorunludur.';
      }

      if (
        form.email.trim() &&
        !form.email.includes('@')
      ) {
        return 'Geçerli bir e-posta adresi girin.';
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
      name: form.fullName.trim(),
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email:
        form.email.trim().toLowerCase(),
      packageId:
        form.packageId || null,
    };

    try {
      setSaving(true);

      if (editingMember) {
        await api.put(
          `/super-admin/gyms/${gymId}/members/${editingMember.id}`,
          payload,
        );

        setSuccessMessage(
          'Üye başarıyla güncellendi.',
        );
      } else {
        await api.post(
          `/super-admin/gyms/${gymId}/members`,
          payload,
        );

        setSuccessMessage(
          'Yeni üye başarıyla eklendi.',
        );
      }

      setDialogOpen(false);
      setEditingMember(null);
      setForm(emptyForm);

      await loadMembers();

      window.setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (error: unknown) {
      setFormError(
        getErrorMessage(
          error,
          editingMember
            ? 'Üye güncellenemedi.'
            : 'Üye eklenemedi.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (
    member: Member,
  ): Promise<void> => {
    if (!gymId) {
      return;
    }

    const confirmed =
      window.confirm(
        `${member.fullName} adlı üyeyi silmek istediğine emin misin?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(member.id);
      setPageError('');

      await api.delete(
        `/super-admin/gyms/${gymId}/members/${member.id}`,
      );

      setSuccessMessage(
        'Üye başarıyla silindi.',
      );

      await loadMembers();

      window.setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (error: unknown) {
      setPageError(
        getErrorMessage(
          error,
          'Üye silinemedi.',
        ),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleRenew = async (
    member: Member,
  ): Promise<void> => {
    if (!gymId) {
      return;
    }

    if (
      !member.packageId &&
      !member.package
    ) {
      setPageError(
        'Üyenin yenilenecek bir paketi yok.',
      );
      return;
    }

    const packageName =
      member.package?.name ||
      'mevcut paket';

    const confirmed =
      window.confirm(
        `${member.fullName} adlı üyenin ${packageName} üyeliği yenilensin mi?\n\nPaket ücreti Finans bölümüne gelir olarak eklenecek.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setRenewingId(member.id);
      setPageError('');

      await api.post(
        `/super-admin/gyms/${gymId}/members/${member.id}/renew`,
      );

      setSuccessMessage(
        'Üyelik başarıyla yenilendi.',
      );

      await loadMembers();

      window.setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (error: unknown) {
      setPageError(
        getErrorMessage(
          error,
          'Üyelik yenilenemedi.',
        ),
      );
    } finally {
      setRenewingId(null);
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
            Salon Üyeleri
          </Box>

          <Box
            sx={{
              mt: 0.7,
              color: '#667085',
            }}
          >
            Seçilen spor salonuna ait üyeleri yönetin.
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.2,
          }}
        >
          <Chip
            icon={<GroupsRounded />}
            label={`${members.length} üye`}
            color="primary"
            sx={{ fontWeight: 700 }}
          />

          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={openCreateDialog}
            sx={{
              minHeight: 42,
              textTransform: 'none',
              fontWeight: 800,
            }}
          >
            Yeni Üye
          </Button>
        </Box>
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
            placeholder="Ad, telefon, e-posta veya paket ara..."
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
                      Telefon
                    </TableCell>

                    <TableCell>
                      E-posta
                    </TableCell>

                    <TableCell>
                      Paket
                    </TableCell>

                    <TableCell>
                      Başlangıç
                    </TableCell>

                    <TableCell>
                      Bitiş
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
                  {filteredMembers.map(
                    (member) => {
                      const state =
                        getMembershipState(
                          member,
                        );

                      return (
                        <TableRow
                          key={member.id}
                          hover
                        >
                          <TableCell
                            sx={{
                              fontWeight: 700,
                            }}
                          >
                            {member.fullName}
                          </TableCell>

                          <TableCell>
                            {member.phone ||
                              '-'}
                          </TableCell>

                          <TableCell>
                            {member.email ||
                              '-'}
                          </TableCell>

                          <TableCell>
                            {member.package
                              ?.name || '-'}
                          </TableCell>

                          <TableCell>
                            {formatDate(
                              member.membershipStart,
                            )}
                          </TableCell>

                          <TableCell>
                            {formatDate(
                              member.membershipEnd,
                            )}
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={
                                state.label
                              }
                              color={
                                state.color
                              }
                              size="small"
                            />
                          </TableCell>

                          <TableCell align="center">
                            <Tooltip title="Üyeliği yenile">
                              <span>
                                <IconButton
                                  color="success"
                                  disabled={
                                    renewingId ===
                                      member.id ||
                                    (!member.packageId &&
                                      !member.package)
                                  }
                                  onClick={() => {
                                    void handleRenew(
                                      member,
                                    );
                                  }}
                                >
                                  {renewingId ===
                                  member.id ? (
                                    <CircularProgress
                                      size={20}
                                    />
                                  ) : (
                                    <AutorenewRounded />
                                  )}
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip title="Üyeyi düzenle">
                              <IconButton
                                color="primary"
                                onClick={() =>
                                  openEditDialog(
                                    member,
                                  )
                                }
                              >
                                <EditRounded />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Üyeyi sil">
                              <span>
                                <IconButton
                                  color="error"
                                  disabled={
                                    deletingId ===
                                    member.id
                                  }
                                  onClick={() => {
                                    void handleDelete(
                                      member,
                                    );
                                  }}
                                >
                                  {deletingId ===
                                  member.id ? (
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
                      );
                    },
                  )}

                  {!loading &&
                    filteredMembers.length ===
                      0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          align="center"
                          sx={{
                            py: 6,
                            color:
                              '#667085',
                          }}
                        >
                          Üye bulunamadı.
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
            {editingMember
              ? 'Üyeyi Düzenle'
              : 'Yeni Üye Ekle'}
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
              label="Ad Soyad"
              value={form.fullName}
              onChange={(event) =>
                updateField(
                  'fullName',
                  event.target.value,
                )
              }
              disabled={saving}
              required
              fullWidth
            />

            <TextField
              label="Telefon"
              value={form.phone}
              onChange={(event) =>
                updateField(
                  'phone',
                  event.target.value,
                )
              }
              disabled={saving}
              fullWidth
            />

            <TextField
              label="E-posta"
              type="email"
              value={form.email}
              onChange={(event) =>
                updateField(
                  'email',
                  event.target.value,
                )
              }
              disabled={saving}
              fullWidth
            />

            <TextField
              select
              label="Üyelik Paketi"
              value={form.packageId}
              onChange={(event) =>
                updateField(
                  'packageId',
                  event.target.value,
                )
              }
              disabled={saving}
              fullWidth
            >
              <MenuItem value="">
                Paket seçilmedi
              </MenuItem>

              {packages.map(
                (item) => (
                  <MenuItem
                    key={item.id}
                    value={item.id}
                  >
                    {item.name} -{' '}
                    {item.durationMonths}{' '}
                    Ay -{' '}
                    {formatCurrency(
                      item.price,
                    )}
                  </MenuItem>
                ),
              )}
            </TextField>

            {packages.length === 0 && (
              <Alert severity="warning">
                Bu salona ait paket bulunmuyor. Önce Paketler modülünden paket oluşturabilirsiniz.
              </Alert>
            )}
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
              ) : editingMember ? (
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
