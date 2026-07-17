import {
  AddRounded,
  ApartmentRounded,
  CloseRounded,
  EditRounded,
  ManageAccountsRounded,
  WorkspacePremiumRounded,
  PauseCircleRounded,
  PlayCircleRounded,
  RestartAltRounded,
  SearchRounded,
  SortRounded,
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
  TextField,
} from '@mui/material';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { FormEvent } from 'react';

import { useNavigate } from 'react-router-dom';

import { api } from '../services/api';

interface Gym {
  id: string;
  name: string;
  slug: string;
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  subscriptionPlan: string;
  licenseStartDate: string | null;
  licenseEndDate: string | null;
  licenseStatus?: string;
  billingCycle?: string;
  trialEndDate?: string | null;
  lastPaymentDate?: string | null;
  nextPaymentDate?: string | null;
  isActive: boolean;
  logoUrl: string | null;
  memberCount: number;
  userCount: number;
  createdAt?: string | null;
}

interface GymForm {
  name: string;
  slug: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  subscriptionPlan: string;
  licenseStartDate: string;
  licenseEndDate: string;
  managerFirstName: string;
  managerLastName: string;
  managerEmail: string;
  managerPassword: string;
}

interface ErrorResponse {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
}

type DialogMode = 'create' | 'edit';

type StatusFilter = 'ALL' | 'ACTIVE' | 'PASSIVE';

type PlanFilter =
  | 'ALL'
  | 'BASIC'
  | 'PROFESSIONAL'
  | 'ENTERPRISE';

type SortOption =
  | 'DEFAULT'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'MEMBERS_DESC'
  | 'LICENSE_ASC'
  | 'NEWEST';

const createEmptyForm = (): GymForm => ({
  name: '',
  slug: '',
  ownerName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  subscriptionPlan: 'BASIC',
  licenseStartDate: '',
  licenseEndDate: '',
  managerFirstName: '',
  managerLastName: '',
  managerEmail: '',
  managerPassword: '',
});

function createSlug(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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

function formatDate(value: string | null): string {
  if (!value) {
    return 'Süresiz';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Geçersiz tarih';
  }

  return date.toLocaleDateString('tr-TR');
}

function formatDateForInput(
  value: string | null,
): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function getDaysRemaining(
  value: string | null,
): number | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.ceil(
    (
      date.getTime() -
      Date.now()
    ) /
      (24 * 60 * 60 * 1000),
  );
}

function licenseStatusLabel(
  status?: string,
) {
  switch (status) {
    case 'TRIAL':
      return 'Deneme';
    case 'EXPIRED':
      return 'Süresi Dolmuş';
    case 'SUSPENDED':
      return 'Askıda';
    default:
      return 'Aktif Lisans';
  }
}

function getLicensePresentation(
  gym: Gym,
) {
  const days =
    getDaysRemaining(
      gym.licenseEndDate,
    );

  if (
    gym.licenseStatus ===
      'SUSPENDED'
  ) {
    return {
      label: 'Askıda',
      detail:
        'Lisans kullanımı durduruldu',
      color: '#b42318',
      background: '#fef3f2',
      border: '#fecdca',
    };
  }

  if (
    gym.licenseStatus ===
      'EXPIRED' ||
    (
      days !== null &&
      days < 0
    )
  ) {
    return {
      label: 'Süresi Doldu',
      detail:
        gym.licenseEndDate
          ? formatDate(
              gym.licenseEndDate,
            )
          : 'Lisans tarihi yok',
      color: '#b42318',
      background: '#fef3f2',
      border: '#fecdca',
    };
  }

  if (
    gym.licenseStatus ===
      'TRIAL'
  ) {
    return {
      label: 'Deneme',
      detail:
        days === null
          ? 'Deneme lisansı'
          : `${Math.max(
              days,
              0,
            )} gün kaldı`,
      color: '#6941c6',
      background: '#f4f3ff',
      border: '#d9d6fe',
    };
  }

  if (
    days !== null &&
    days <= 15
  ) {
    return {
      label: 'Kritik',
      detail:
        days === 0
          ? 'Bugün bitiyor'
          : `${days} gün kaldı`,
      color: '#b42318',
      background: '#fff4ed',
      border: '#fedf89',
    };
  }

  if (
    days !== null &&
    days <= 30
  ) {
    return {
      label: 'Yaklaşıyor',
      detail:
        `${days} gün kaldı`,
      color: '#b54708',
      background: '#fffaeb',
      border: '#fedf89',
    };
  }

  return {
    label: 'Aktif',
    detail:
      days === null
        ? 'Süresiz lisans'
        : `${days} gün kaldı`,
    color: '#027a48',
    background: '#ecfdf3',
    border: '#abefc6',
  };
}

function planLabel(
  plan?: string,
) {
  if (
    plan === 'PROFESSIONAL'
  ) {
    return 'Professional';
  }

  if (
    plan === 'ENTERPRISE'
  ) {
    return 'Enterprise';
  }

  return 'Basic';
}

export function Gyms() {
  const navigate = useNavigate();

  const [gyms, setGyms] =
    useState<Gym[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [pageError, setPageError] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [dialogMode, setDialogMode] =
    useState<DialogMode>('create');

  const [selectedGymId, setSelectedGymId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<GymForm>(createEmptyForm());

  const [formError, setFormError] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [statusChangingId, setStatusChangingId] =
    useState<string | null>(null);

  const [searchText, setSearchText] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('ALL');

  const [planFilter, setPlanFilter] =
    useState<PlanFilter>('ALL');

  const [sortOption, setSortOption] =
    useState<SortOption>('DEFAULT');

  const loadGyms = async (): Promise<void> => {
    try {
      setLoading(true);
      setPageError('');

      const response = await api.get<Gym[]>(
        '/super-admin/gyms',
      );

      const payload = response.data as
        | Gym[]
        | {
            data?: Gym[];
            items?: Gym[];
            gyms?: Gym[];
          };

      const gymList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.gyms)
          ? payload.gyms
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.items)
              ? payload.items
              : [];

      setGyms(gymList);
    } catch (error: unknown) {
      setPageError(
        getErrorMessage(
          error,
          'Spor salonları alınamadı.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGyms();
  }, []);

  const filteredGyms = useMemo(() => {
    const normalizedSearch = searchText
      .trim()
      .toLocaleLowerCase('tr-TR');

    const result = gyms.filter((gym) => {
      const searchableText = [
        gym.name,
        gym.slug,
        gym.ownerName,
        gym.city,
        gym.email,
        gym.phone,
        gym.address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' &&
          gym.isActive) ||
        (statusFilter === 'PASSIVE' &&
          !gym.isActive);

      const matchesPlan =
        planFilter === 'ALL' ||
        gym.subscriptionPlan === planFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPlan
      );
    });

    return [...result].sort((a, b) => {
      switch (sortOption) {
        case 'NAME_ASC':
          return a.name.localeCompare(
            b.name,
            'tr',
          );

        case 'NAME_DESC':
          return b.name.localeCompare(
            a.name,
            'tr',
          );

        case 'MEMBERS_DESC':
          return (
            (b.memberCount ?? 0) -
            (a.memberCount ?? 0)
          );

        case 'LICENSE_ASC': {
          const aTime = a.licenseEndDate
            ? new Date(
                a.licenseEndDate,
              ).getTime()
            : Number.POSITIVE_INFINITY;

          const bTime = b.licenseEndDate
            ? new Date(
                b.licenseEndDate,
              ).getTime()
            : Number.POSITIVE_INFINITY;

          return aTime - bTime;
        }

        case 'NEWEST': {
          const aTime = a.createdAt
            ? new Date(a.createdAt).getTime()
            : 0;

          const bTime = b.createdAt
            ? new Date(b.createdAt).getTime()
            : 0;

          return bTime - aTime;
        }

        default:
          return 0;
      }
    });
  }, [
    gyms,
    searchText,
    statusFilter,
    planFilter,
    sortOption,
  ]);

  const hasActiveFilters =
    Boolean(searchText.trim()) ||
    statusFilter !== 'ALL' ||
    planFilter !== 'ALL' ||
    sortOption !== 'DEFAULT';

  const clearFilters = (): void => {
    setSearchText('');
    setStatusFilter('ALL');
    setPlanFilter('ALL');
    setSortOption('DEFAULT');
  };

  const updateField = (
    field: keyof GymForm,
    value: string,
  ): void => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleNameChange = (
    value: string,
  ): void => {
    setForm((current) => ({
      ...current,
      name: value,
      slug:
        dialogMode === 'create'
          ? createSlug(value)
          : current.slug,
    }));
  };

  const openCreateDialog = (): void => {
    setDialogMode('create');
    setSelectedGymId(null);
    setForm(createEmptyForm());
    setFormError('');
    setDialogOpen(true);
  };

  const openEditDialog = (
    gym: Gym,
  ): void => {
    setDialogMode('edit');
    setSelectedGymId(gym.id);

    setForm({
      name: gym.name,
      slug: gym.slug,
      ownerName: gym.ownerName ?? '',
      email: gym.email ?? '',
      phone: gym.phone ?? '',
      address: gym.address ?? '',
      city: gym.city ?? '',
      subscriptionPlan:
        gym.subscriptionPlan || 'BASIC',
      licenseStartDate:
        formatDateForInput(
          gym.licenseStartDate,
        ),
      licenseEndDate:
        formatDateForInput(
          gym.licenseEndDate,
        ),
      managerFirstName: '',
      managerLastName: '',
      managerEmail: '',
      managerPassword: '',
    });

    setFormError('');
    setDialogOpen(true);
  };

  const closeDialog = (): void => {
    if (saving) {
      return;
    }

    setDialogOpen(false);
    setFormError('');
    setSelectedGymId(null);
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) {
      return 'Salon adı zorunludur.';
    }

    if (!form.slug.trim()) {
      return 'Salon bağlantı adı zorunludur.';
    }

    if (
      form.licenseStartDate &&
      form.licenseEndDate &&
      form.licenseEndDate <
        form.licenseStartDate
    ) {
      return 'Lisans bitiş tarihi başlangıç tarihinden önce olamaz.';
    }

    if (dialogMode === 'create') {
      if (!form.managerFirstName.trim()) {
        return 'Yönetici adı zorunludur.';
      }

      if (!form.managerLastName.trim()) {
        return 'Yönetici soyadı zorunludur.';
      }

      if (!form.managerEmail.trim()) {
        return 'Yönetici e-postası zorunludur.';
      }

      if (!form.managerPassword) {
        return 'Yönetici şifresi zorunludur.';
      }

      if (form.managerPassword.length < 8) {
        return 'Yönetici şifresi en az 8 karakter olmalıdır.';
      }
    }

    return null;
  };

  const createPayload = () => ({
    name: form.name.trim(),
    slug: form.slug.trim(),

    ownerName:
      form.ownerName.trim() || undefined,

    email:
      form.email.trim().toLowerCase() ||
      undefined,

    phone:
      form.phone.trim() || undefined,

    address:
      form.address.trim() || undefined,

    city:
      form.city.trim() || undefined,

    subscriptionPlan:
      form.subscriptionPlan,

    licenseStartDate:
      form.licenseStartDate || undefined,

    licenseEndDate:
      form.licenseEndDate || undefined,

    managerFirstName:
      form.managerFirstName.trim(),

    managerLastName:
      form.managerLastName.trim(),

    managerEmail:
      form.managerEmail
        .trim()
        .toLowerCase(),

    managerPassword:
      form.managerPassword,
  });

  const createUpdatePayload = () => ({
    name: form.name.trim(),
    slug: form.slug.trim(),

    ownerName:
      form.ownerName.trim() || null,

    email:
      form.email.trim().toLowerCase() ||
      null,

    phone:
      form.phone.trim() || null,

    address:
      form.address.trim() || null,

    city:
      form.city.trim() || null,

    subscriptionPlan:
      form.subscriptionPlan,

    licenseStartDate:
      form.licenseStartDate || null,

    licenseEndDate:
      form.licenseEndDate || null,
  });

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setFormError('');

    const validationError =
      validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSaving(true);

      if (dialogMode === 'create') {
        await api.post(
          '/super-admin/gyms',
          createPayload(),
        );

        setSuccessMessage(
          'Spor salonu ve salon yöneticisi başarıyla oluşturuldu.',
        );
      } else {
        if (!selectedGymId) {
          setFormError(
            'Düzenlenecek spor salonu bulunamadı.',
          );
          return;
        }

        await api.patch(
          `/super-admin/gyms/${selectedGymId}`,
          createUpdatePayload(),
        );

        setSuccessMessage(
          'Spor salonu bilgileri başarıyla güncellendi.',
        );
      }

      setDialogOpen(false);
      setForm(createEmptyForm());
      setSelectedGymId(null);

      await loadGyms();

      window.setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (error: unknown) {
      setFormError(
        getErrorMessage(
          error,
          dialogMode === 'create'
            ? 'Spor salonu oluşturulamadı.'
            : 'Spor salonu güncellenemedi.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    gym: Gym,
  ): Promise<void> => {
    try {
      setStatusChangingId(gym.id);
      setPageError('');

      await api.patch(
        `/super-admin/gyms/${gym.id}/status`,
        {
          isActive: !gym.isActive,
        },
      );

      setSuccessMessage(
        gym.isActive
          ? 'Spor salonu pasif hâle getirildi.'
          : 'Spor salonu aktif hâle getirildi.',
      );

      await loadGyms();

      window.setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (error: unknown) {
      setPageError(
        getErrorMessage(
          error,
          'Salon durumu değiştirilemedi.',
        ),
      );
    } finally {
      setStatusChangingId(null);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
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
              lineHeight: 1.2,
              fontWeight: 800,
              color: '#101828',
            }}
          >
            Spor Salonları
          </Box>

          <Box
            component="p"
            sx={{
              mt: 0.7,
              mb: 0,
              color: '#667085',
            }}
          >
            NovaPlus+ sistemine bağlı bütün
            salonları yönetin
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={openCreateDialog}
          sx={{
            px: 2.5,
            py: 1.1,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            backgroundColor: '#1468f3',

            '&:hover': {
              backgroundColor: '#0d59d9',
            },
          }}
        >
          Yeni Salon Ekle
        </Button>
      </Box>

      {successMessage && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
        >
          {successMessage}
        </Alert>
      )}

      {pageError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
        >
          {pageError}
        </Alert>
      )}

      <Card
        elevation={0}
        sx={{
          mb: 3,
          border: '1px solid #e8edf3',
          borderRadius: 2,
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(260px, 2fr) repeat(3, minmax(150px, 1fr)) auto',
              },
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            <TextField
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value,
                )
              }
              placeholder="Salon adı, sahibi, şehir, e-posta veya telefon ara..."
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
              label="Durum"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter,
                )
              }
              fullWidth
            >
              <MenuItem value="ALL">
                Tüm Durumlar
              </MenuItem>

              <MenuItem value="ACTIVE">
                Aktif Salonlar
              </MenuItem>

              <MenuItem value="PASSIVE">
                Pasif Salonlar
              </MenuItem>
            </TextField>

            <TextField
              select
              label="Paket"
              value={planFilter}
              onChange={(event) =>
                setPlanFilter(
                  event.target
                    .value as PlanFilter,
                )
              }
              fullWidth
            >
              <MenuItem value="ALL">
                Tüm Paketler
              </MenuItem>

              <MenuItem value="BASIC">
                Basic
              </MenuItem>

              <MenuItem value="PROFESSIONAL">
                Professional
              </MenuItem>

              <MenuItem value="ENTERPRISE">
                Enterprise
              </MenuItem>
            </TextField>

            <TextField
              select
              label="Sırala"
              value={sortOption}
              onChange={(event) =>
                setSortOption(
                  event.target
                    .value as SortOption,
                )
              }
              fullWidth
              slotProps={{
  input: {
    startAdornment: (
      <InputAdornment position="start">
        <SortRounded
          sx={{
            color: '#667085',
          }}
        />
      </InputAdornment>
    ),
  },
}}
            >
              <MenuItem value="DEFAULT">
                Varsayılan
              </MenuItem>

              <MenuItem value="NEWEST">
                En Yeni
              </MenuItem>

              <MenuItem value="NAME_ASC">
                Salon Adı A-Z
              </MenuItem>

              <MenuItem value="NAME_DESC">
                Salon Adı Z-A
              </MenuItem>

              <MenuItem value="MEMBERS_DESC">
                Üye Sayısı
              </MenuItem>

              <MenuItem value="LICENSE_ASC">
                Lisansı En Yakın Biten
              </MenuItem>
            </TextField>

            <Button
              variant="outlined"
              startIcon={
                <RestartAltRounded />
              }
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              sx={{
                minHeight: 56,
                whiteSpace: 'nowrap',
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              Temizle
            </Button>
          </Box>

          <Box
            sx={{
              mt: 1.5,
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
              fontSize: 14,
              color: '#667085',
            }}
          >
            <Box>
              {filteredGyms.length} salon
              gösteriliyor
            </Box>

            {hasActiveFilters && (
              <Box>
                Toplam {gyms.length} salon
                içinden filtrelendi
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {loading && (
        <Box
          sx={{
            py: 8,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {!loading && gyms.length === 0 && (
        <Card
          elevation={0}
          sx={{
            border: '1px solid #e8edf3',
            borderRadius: 2,
          }}
        >
          <CardContent
            sx={{
              py: 8,
              textAlign: 'center',
            }}
          >
            <ApartmentRounded
              sx={{
                mb: 2,
                fontSize: 60,
                color: '#1468f3',
              }}
            />

            <Box
              component="h2"
              sx={{
                m: 0,
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              Henüz spor salonu eklenmedi
            </Box>
          </CardContent>
        </Card>
      )}

      {!loading &&
        gyms.length > 0 &&
        filteredGyms.length === 0 && (
          <Card
            elevation={0}
            sx={{
              border:
                '1px solid #e8edf3',
              borderRadius: 2,
            }}
          >
            <CardContent
              sx={{
                py: 7,
                textAlign: 'center',
              }}
            >
              <SearchRounded
                sx={{
                  mb: 1.5,
                  fontSize: 54,
                  color: '#98a2b3',
                }}
              />

              <Box
                component="h2"
                sx={{
                  m: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#101828',
                }}
              >
                Aramaya uygun salon bulunamadı
              </Box>

              <Box
                sx={{
                  mt: 1,
                  color: '#667085',
                }}
              >
                Arama kelimesini veya filtreleri
                değiştirerek tekrar deneyin.
              </Box>

              <Button
                variant="outlined"
                startIcon={
                  <RestartAltRounded />
                }
                onClick={clearFilters}
                sx={{
                  mt: 2.5,
                  textTransform: 'none',
                  fontWeight: 700,
                }}
              >
                Filtreleri Temizle
              </Button>
            </CardContent>
          </Card>
        )}

      {!loading &&
        gyms.length > 0 && (
          <Box
            sx={{
              mb: 2,
              display: 'grid',
              gridTemplateColumns: {
                xs:
                  'repeat(2, minmax(0, 1fr))',
                md:
                  'repeat(4, minmax(0, 1fr))',
              },
              gap: 1.2,
            }}
          >
            {[
              {
                label:
                  'Aktif Lisans',
                value:
                  gyms.filter(
                    (gym) => {
                      const info =
                        getLicensePresentation(
                          gym,
                        );

                      return (
                        info.label ===
                        'Aktif'
                      );
                    },
                  ).length,
              },
              {
                label:
                  '30 Gün İçinde',
                value:
                  gyms.filter(
                    (gym) => {
                      const days =
                        getDaysRemaining(
                          gym.licenseEndDate,
                        );

                      return (
                        days !== null &&
                        days >= 0 &&
                        days <= 30
                      );
                    },
                  ).length,
              },
              {
                label:
                  'Süresi Dolan',
                value:
                  gyms.filter(
                    (gym) => {
                      const days =
                        getDaysRemaining(
                          gym.licenseEndDate,
                        );

                      return (
                        gym.licenseStatus ===
                          'EXPIRED' ||
                        (
                          days !== null &&
                          days < 0
                        )
                      );
                    },
                  ).length,
              },
              {
                label:
                  'Askıda',
                value:
                  gyms.filter(
                    (gym) =>
                      gym.licenseStatus ===
                      'SUSPENDED',
                  ).length,
              },
            ].map((item) => (
              <Card
                key={item.label}
                elevation={0}
                sx={{
                  border:
                    '1px solid #e8edf3',
                  borderRadius: 2,
                }}
              >
                <CardContent
                  sx={{
                    py:
                      '14px !important',
                  }}
                >
                  <Box
                    sx={{
                      color:
                        '#667085',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {item.label}
                  </Box>

                  <Box
                    sx={{
                      mt: 0.4,
                      color:
                        '#101828',
                      fontSize: 24,
                      fontWeight: 900,
                    }}
                  >
                    {item.value}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

      {!loading &&
        filteredGyms.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr',
              xl: '1fr',
            },
            gap: 1.5,
          }}
        >
          {filteredGyms.map(
            (gym) => {
              const license =
                getLicensePresentation(
                  gym,
                );

              return (
                <Card
                  key={gym.id}
                  elevation={0}
                  sx={{
                    border:
                      '1px solid #e8edf3',
                    borderRadius: 2,
                    opacity:
                      gym.isActive
                        ? 1
                        : 0.72,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: 5,
                      background:
                        license.color,
                    }}
                  />

                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        alignItems:
                          'flex-start',
                        gap: 2,
                      }}
                    >
                      <Box
                        sx={{
                          minWidth: 0,
                        }}
                      >
                        <Box
                          component="h2"
                          sx={{
                            m: 0,
                            color:
                              '#101828',
                            fontSize: 20,
                            fontWeight: 850,
                          }}
                        >
                          {gym.name}
                        </Box>

                        <Box
                          sx={{
                            mt: 0.35,
                            color:
                              '#667085',
                            fontSize: 13,
                          }}
                        >
                          {gym.ownerName || 'Salon sahibi belirtilmedi'}
                          {' · '}
                          {gym.city || 'Şehir belirtilmedi'}
                        </Box>
                      </Box>

                      <Chip
                        label={
                          gym.isActive
                            ? 'Salon Aktif'
                            : 'Salon Pasif'
                        }
                        color={
                          gym.isActive
                            ? 'success'
                            : 'default'
                        }
                        size="small"
                      />
                    </Box>

                    <Box
                      sx={{
                        mt: 2.3,
                        p: 1.6,
                        border:
                          `1px solid ${license.border}`,
                        borderRadius: 2,
                        background:
                          license.background,
                      }}
                    >
                      <Box
                        sx={{
                          display:
                            'flex',
                          justifyContent:
                            'space-between',
                          alignItems:
                            'center',
                          gap: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            gap: 1,
                          }}
                        >
                          <WorkspacePremiumRounded
                            sx={{
                              color:
                                license.color,
                            }}
                          />

                          <Box>
                            <Box
                              sx={{
                                color:
                                  '#475467',
                                fontSize:
                                  11,
                                fontWeight:
                                  800,
                                textTransform:
                                  'uppercase',
                                letterSpacing:
                                  0.7,
                              }}
                            >
                              NovaPlus Lisansı
                            </Box>

                            <Box
                              sx={{
                                mt: 0.2,
                                color:
                                  '#101828',
                                fontSize:
                                  16,
                                fontWeight:
                                  900,
                              }}
                            >
                              {planLabel(
                                gym.subscriptionPlan,
                              )}
                            </Box>
                          </Box>
                        </Box>

                        <Chip
                          label={
                            license.label
                          }
                          size="small"
                          sx={{
                            color:
                              license.color,
                            border:
                              `1px solid ${license.border}`,
                            background:
                              '#ffffffb8',
                            fontWeight:
                              850,
                          }}
                        />
                      </Box>

                      <Box
                        sx={{
                          mt: 1.2,
                          display:
                            'flex',
                          justifyContent:
                            'space-between',
                          flexWrap:
                            'wrap',
                          gap: 1,
                        }}
                      >
                        <Box
                          sx={{
                            color:
                              license.color,
                            fontSize: 13,
                            fontWeight:
                              850,
                          }}
                        >
                          {license.detail}
                        </Box>

                        <Box
                          sx={{
                            color:
                              '#667085',
                            fontSize: 12,
                          }}
                        >
                          Bitiş:{' '}
                          {formatDate(
                            gym.licenseEndDate,
                          )}
                        </Box>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        mt: 2,
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(2, minmax(0, 1fr))',
                        gap: 1.2,
                      }}
                    >
                      <InfoRow
                        label="Sahibi"
                        value={
                          gym.ownerName ||
                          'Belirtilmedi'
                        }
                      />

                      <InfoRow
                        label="Ödeme"
                        value={
                          gym.billingCycle ===
                          'YEARLY'
                            ? 'Yıllık'
                            : 'Aylık'
                        }
                      />

                      <InfoRow
                        label="Üyeler"
                        value={String(
                          gym.memberCount ??
                            0,
                        )}
                      />

                      <InfoRow
                        label="Kullanıcılar"
                        value={String(
                          gym.userCount ??
                            0,
                        )}
                      />
                    </Box>

                    <Box
                      sx={{
                        mt: 2.4,
                        pt: 2,
                        borderTop:
                          '1px solid #e8edf3',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'flex-end',
                        gap: 1,
                      }}
                    >
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={
                          <EditRounded />
                        }
                        onClick={() =>
                          openEditDialog(
                            gym,
                          )
                        }
                        sx={{
                          textTransform:
                            'none',
                          fontWeight: 700,
                        }}
                      >
                        Düzenle
                      </Button>

                      <Button
                        variant="contained"
                        size="small"
                        startIcon={
                          <WorkspacePremiumRounded />
                        }
                        onClick={() =>
                          navigate(
                            `/super-admin/gyms/${gym.id}/license`,
                          )
                        }
                        sx={{
                          order: -1,
                          textTransform: 'none',
                          fontWeight: 800,
                          backgroundColor: '#7c3aed',
                          '&:hover': {
                            backgroundColor: '#6d28d9',
                          },
                        }}
                      >
                        Lisans Yönet
                      </Button>

                      <Button
                        variant="outlined"
                        size="small"
                        color={
                          gym.isActive
                            ? 'warning'
                            : 'success'
                        }
                        startIcon={
                          gym.isActive ? (
                            <PauseCircleRounded />
                          ) : (
                            <PlayCircleRounded />
                          )
                        }
                        disabled={
                          statusChangingId ===
                          gym.id
                        }
                        onClick={() => {
                          void handleStatusChange(
                            gym,
                          );
                        }}
                        sx={{
                          textTransform:
                            'none',
                          fontWeight: 700,
                        }}
                      >
                        {statusChangingId ===
                        gym.id
                          ? 'İşleniyor'
                          : gym.isActive
                            ? 'Pasif Yap'
                            : 'Aktif Yap'}
                      </Button>

                      <Button
                        variant="contained"
                        size="small"
                        startIcon={
                          <ManageAccountsRounded />
                        }
                        onClick={() =>
                          navigate(
                            `/super-admin/gyms/${gym.id}`,
                          )
                        }
                        sx={{
                          textTransform:
                            'none',
                          fontWeight: 700,
                          backgroundColor:
                            '#1468f3',

                          '&:hover': {
                            backgroundColor:
                              '#0d59d9',
                          },
                        }}
                      >
                        Yönet
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              );
            },
          )}
        </Box>
      )}

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="md"
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
        >
          <DialogTitle
            sx={{
              pr: 7,
              fontWeight: 800,
            }}
          >
            {dialogMode === 'create'
              ? 'Yeni Spor Salonu'
              : 'Spor Salonunu Düzenle'}
          </DialogTitle>

          <IconButton
            onClick={closeDialog}
            disabled={saving}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
            }}
          >
            <CloseRounded />
          </IconButton>

          <DialogContent dividers>
            {formError && (
              <Alert
                severity="error"
                sx={{ mb: 2.5 }}
              >
                {formError}
              </Alert>
            )}

            <SectionTitle>
              Salon Bilgileri
            </SectionTitle>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              <TextField
                label="Salon Adı"
                value={form.name}
                onChange={(event) =>
                  handleNameChange(
                    event.target.value,
                  )
                }
                disabled={saving}
                required
                fullWidth
              />

              <TextField
                label="Salon Bağlantı Adı"
                value={form.slug}
                onChange={(event) =>
                  updateField(
                    'slug',
                    createSlug(
                      event.target.value,
                    ),
                  )
                }
                disabled={saving}
                required
                fullWidth
              />

              <TextField
                label="Salon Sahibi"
                value={form.ownerName}
                onChange={(event) =>
                  updateField(
                    'ownerName',
                    event.target.value,
                  )
                }
                disabled={saving}
                fullWidth
              />

              <TextField
                label="Şehir"
                value={form.city}
                onChange={(event) =>
                  updateField(
                    'city',
                    event.target.value,
                  )
                }
                disabled={saving}
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
                label="Salon E-postası"
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
            </Box>

            <TextField
              label="Adres"
              value={form.address}
              onChange={(event) =>
                updateField(
                  'address',
                  event.target.value,
                )
              }
              disabled={saving}
              multiline
              minRows={2}
              fullWidth
              sx={{ mt: 2 }}
            />

            <SectionTitle>
              Abonelik ve Lisans
            </SectionTitle>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(3, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              <TextField
                select
                label="Abonelik Paketi"
                value={form.subscriptionPlan}
                onChange={(event) =>
                  updateField(
                    'subscriptionPlan',
                    event.target.value,
                  )
                }
                disabled={saving}
                fullWidth
              >
                <MenuItem value="BASIC">
                  Basic
                </MenuItem>

                <MenuItem value="PROFESSIONAL">
                  Professional
                </MenuItem>

                <MenuItem value="ENTERPRISE">
                  Enterprise
                </MenuItem>
              </TextField>

              <DateField
                label="Lisans Başlangıç"
                value={
                  form.licenseStartDate
                }
                disabled={saving}
                onChange={(value) =>
                  updateField(
                    'licenseStartDate',
                    value,
                  )
                }
              />

              <DateField
                label="Lisans Bitiş"
                value={form.licenseEndDate}
                disabled={saving}
                onChange={(value) =>
                  updateField(
                    'licenseEndDate',
                    value,
                  )
                }
              />
            </Box>

            {dialogMode === 'create' && (
              <>
                <SectionTitle>
                  Salon Yöneticisi
                </SectionTitle>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(0, 1fr))',
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Yönetici Adı"
                    value={
                      form.managerFirstName
                    }
                    onChange={(event) =>
                      updateField(
                        'managerFirstName',
                        event.target.value,
                      )
                    }
                    disabled={saving}
                    required
                    fullWidth
                  />

                  <TextField
                    label="Yönetici Soyadı"
                    value={
                      form.managerLastName
                    }
                    onChange={(event) =>
                      updateField(
                        'managerLastName',
                        event.target.value,
                      )
                    }
                    disabled={saving}
                    required
                    fullWidth
                  />

                  <TextField
                    label="Yönetici E-postası"
                    type="email"
                    value={
                      form.managerEmail
                    }
                    onChange={(event) =>
                      updateField(
                        'managerEmail',
                        event.target.value,
                      )
                    }
                    disabled={saving}
                    required
                    fullWidth
                  />

                  <TextField
                    label="Yönetici Şifresi"
                    type="password"
                    value={
                      form.managerPassword
                    }
                    onChange={(event) =>
                      updateField(
                        'managerPassword',
                        event.target.value,
                      )
                    }
                    disabled={saving}
                    required
                    fullWidth
                  />
                </Box>
              </>
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
              Vazgeç
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{
                minWidth: 180,
                textTransform: 'none',
                fontWeight: 700,
              }}
            >
              {saving ? (
                <CircularProgress
                  size={22}
                  sx={{ color: '#ffffff' }}
                />
              ) : dialogMode === 'create' ? (
                'Spor Salonunu Oluştur'
              ) : (
                'Değişiklikleri Kaydet'
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({
  label,
  value,
}: InfoRowProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 2,
        fontSize: 14,
      }}
    >
      <Box
        component="span"
        sx={{ color: '#667085' }}
      >
        {label}
      </Box>

      <Box
        component="span"
        sx={{
          fontWeight: 700,
          textAlign: 'right',
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

interface SectionTitleProps {
  children: string;
}

function SectionTitle({
  children,
}: SectionTitleProps) {
  return (
    <Box
      component="h3"
      sx={{
        mt: 3,
        mb: 2,
        fontSize: 16,
        fontWeight: 800,
      }}
    >
      {children}
    </Box>
  );
}

interface DateFieldProps {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

function DateField({
  label,
  value,
  disabled,
  onChange,
}: DateFieldProps) {
  return (
    <Box>
      <Box
        component="label"
        sx={{
          display: 'block',
          mb: 0.75,
          fontSize: 13,
          color: '#475467',
        }}
      >
        {label}
      </Box>

      <TextField
        type="date"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        disabled={disabled}
        fullWidth
      />
    </Box>
  );
}