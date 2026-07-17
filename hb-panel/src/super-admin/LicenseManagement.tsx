import {
  ArrowBackRounded,
  CalendarMonthRounded,
  CheckCircleRounded,
  CreditCardRounded,
  ErrorRounded,
  SaveRounded,
  UpdateRounded,
  WarningAmberRounded,
} from '@mui/icons-material';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  TextField,
} from '@mui/material';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import { api } from '../services/api';

type SubscriptionPlan =
  | 'BASIC'
  | 'PROFESSIONAL'
  | 'ENTERPRISE';

interface Gym {
  id: string;
  name: string;
  slug: string;
  subscriptionPlan: SubscriptionPlan;
  licenseStartDate: string | null;
  licenseEndDate: string | null;
  isActive: boolean;
}

interface ErrorResponse {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
}

interface LicenseStatus {
  label: string;
  description: string;
  color:
    | 'success'
    | 'warning'
    | 'error'
    | 'default';
  icon:
    | 'success'
    | 'warning'
    | 'error';
  remainingDays: number | null;
}

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
  value: string | null,
): string {
  if (!value) {
    return 'Belirtilmedi';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Geçersiz tarih';
  }

  return date.toLocaleDateString(
    'tr-TR',
  );
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

function addMonthsToDate(
  date: Date,
  months: number,
): Date {
  const result = new Date(date);

  result.setMonth(
    result.getMonth() + months,
  );

  return result;
}

function calculateLicenseStatus(
  endDateValue: string | null,
): LicenseStatus {
  if (!endDateValue) {
    return {
      label: 'Süresiz lisans',
      description:
        'Bu salon için lisans bitiş tarihi tanımlanmamış.',
      color: 'success',
      icon: 'success',
      remainingDays: null,
    };
  }

  const endDate =
    new Date(endDateValue);

  if (Number.isNaN(endDate.getTime())) {
    return {
      label: 'Geçersiz tarih',
      description:
        'Lisans bitiş tarihi geçerli değil.',
      color: 'error',
      icon: 'error',
      remainingDays: null,
    };
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const remainingDays = Math.ceil(
    (endDate.getTime() -
      today.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (remainingDays < 0) {
    return {
      label: 'Lisans süresi doldu',
      description:
        `${Math.abs(remainingDays)} gün önce sona erdi.`,
      color: 'error',
      icon: 'error',
      remainingDays,
    };
  }

  if (remainingDays === 0) {
    return {
      label: 'Lisans bugün bitiyor',
      description:
        'Salonun lisansı bugün sona erecek.',
      color: 'error',
      icon: 'error',
      remainingDays,
    };
  }

  if (remainingDays <= 15) {
    return {
      label: `${remainingDays} gün kaldı`,
      description:
        'Lisans kritik seviyede. Uzatma yapılması önerilir.',
      color: 'error',
      icon: 'error',
      remainingDays,
    };
  }

  if (remainingDays <= 30) {
    return {
      label: `${remainingDays} gün kaldı`,
      description:
        'Lisansın bitmesine az kaldı.',
      color: 'warning',
      icon: 'warning',
      remainingDays,
    };
  }

  return {
    label: `${remainingDays} gün kaldı`,
    description:
      'Lisans aktif durumda.',
    color: 'success',
    icon: 'success',
    remainingDays,
  };
}

export function LicenseManagement() {
  const navigate = useNavigate();

  const { gymId } =
    useParams<{
      gymId: string;
    }>();

  const [gym, setGym] =
    useState<Gym | null>(null);

  const [selectedPlan, setSelectedPlan] =
    useState<SubscriptionPlan>('BASIC');

  const [licenseStartDate, setLicenseStartDate] =
    useState('');

  const [licenseEndDate, setLicenseEndDate] =
    useState('');

  const [extensionMonths, setExtensionMonths] =
    useState('12');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [extending, setExtending] =
    useState(false);

  const [error, setError] =
    useState('');

  const [successMessage, setSuccessMessage] =
    useState('');

  const loadGym =
    async (): Promise<void> => {
      if (!gymId) {
        setError(
          'Spor salonu kimliği bulunamadı.',
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response =
          await api.get<Gym>(
            `/super-admin/gyms/${gymId}`,
          );

        const loadedGym = response.data;

        setGym(loadedGym);
        setSelectedPlan(
          loadedGym.subscriptionPlan,
        );
        setLicenseStartDate(
          formatDateForInput(
            loadedGym.licenseStartDate,
          ),
        );
        setLicenseEndDate(
          formatDateForInput(
            loadedGym.licenseEndDate,
          ),
        );
      } catch (requestError: unknown) {
        setError(
          getErrorMessage(
            requestError,
            'Salon lisans bilgileri alınamadı.',
          ),
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    void loadGym();
  }, [gymId]);

  const licenseStatus = useMemo(
    () =>
      calculateLicenseStatus(
        licenseEndDate || null,
      ),
    [licenseEndDate],
  );

  const saveLicenseSettings =
    async (): Promise<void> => {
      if (!gymId) {
        return;
      }

      if (
        licenseStartDate &&
        licenseEndDate &&
        licenseEndDate <
          licenseStartDate
      ) {
        setError(
          'Lisans bitiş tarihi başlangıç tarihinden önce olamaz.',
        );
        return;
      }

      try {
        setSaving(true);
        setError('');
        setSuccessMessage('');

        await api.patch(
          `/super-admin/gyms/${gymId}`,
          {
            subscriptionPlan:
              selectedPlan,
            licenseStartDate:
              licenseStartDate || null,
            licenseEndDate:
              licenseEndDate || null,
          },
        );

        setSuccessMessage(
          'Lisans ve paket bilgileri başarıyla güncellendi.',
        );

        await loadGym();
      } catch (requestError: unknown) {
        setError(
          getErrorMessage(
            requestError,
            'Lisans bilgileri güncellenemedi.',
          ),
        );
      } finally {
        setSaving(false);
      }
    };

  const extendLicense =
    async (): Promise<void> => {
      if (!gymId) {
        return;
      }

      const months =
        Number(extensionMonths);

      if (
        !Number.isInteger(months) ||
        months <= 0
      ) {
        setError(
          'Geçerli bir uzatma süresi seçin.',
        );
        return;
      }

      try {
        setExtending(true);
        setError('');
        setSuccessMessage('');

        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const currentEndDate =
          licenseEndDate
            ? new Date(licenseEndDate)
            : null;

        let baseDate = today;

        if (
          currentEndDate &&
          !Number.isNaN(
            currentEndDate.getTime(),
          ) &&
          currentEndDate > today
        ) {
          baseDate = currentEndDate;
        }

        const newEndDate =
          addMonthsToDate(
            baseDate,
            months,
          );

        const startDate =
          licenseStartDate ||
          today
            .toISOString()
            .slice(0, 10);

        const newEndDateText =
          newEndDate
            .toISOString()
            .slice(0, 10);

        await api.patch(
          `/super-admin/gyms/${gymId}`,
          {
            subscriptionPlan:
              selectedPlan,
            licenseStartDate:
              startDate,
            licenseEndDate:
              newEndDateText,
          },
        );

        setLicenseStartDate(
          startDate,
        );
        setLicenseEndDate(
          newEndDateText,
        );

        setSuccessMessage(
          `Salon lisansı ${months} ay uzatıldı.`,
        );

        await loadGym();
      } catch (requestError: unknown) {
        setError(
          getErrorMessage(
            requestError,
            'Salon lisansı uzatılamadı.',
          ),
        );
      } finally {
        setExtending(false);
      }
    };

  const renderStatusIcon = () => {
    if (
      licenseStatus.icon === 'error'
    ) {
      return (
        <ErrorRounded
          sx={{ fontSize: 38 }}
        />
      );
    }

    if (
      licenseStatus.icon === 'warning'
    ) {
      return (
        <WarningAmberRounded
          sx={{ fontSize: 38 }}
        />
      );
    }

    return (
      <CheckCircleRounded
        sx={{ fontSize: 38 }}
      />
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 400,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!gym) {
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

        <Alert severity="error">
          {error ||
            'Spor salonu bulunamadı.'}
        </Alert>
      </Box>
    );
  }

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
            md: 'center',
          },
          flexDirection: {
            xs: 'column',
            md: 'row',
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
            Lisans Yönetimi
          </Box>

          <Box
            sx={{
              mt: 0.7,
              color: '#667085',
            }}
          >
            {gym.name} salonunun paket ve lisans süresini yönetin.
          </Box>
        </Box>

        <Chip
          label={licenseStatus.label}
          color={licenseStatus.color}
          sx={{
            minHeight: 36,
            fontWeight: 800,
          }}
        />
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
        >
          {error}
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
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)',
          },
          gap: 2.5,
        }}
      >
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
              component="h2"
              sx={{
                m: 0,
                fontSize: 20,
                fontWeight: 800,
                color: '#101828',
              }}
            >
              Paket ve Lisans Bilgileri
            </Box>

            <Box
              sx={{
                mt: 2.5,
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              <TextField
                select
                label="Abonelik Paketi"
                value={selectedPlan}
                onChange={(event) =>
                  setSelectedPlan(
                    event.target
                      .value as SubscriptionPlan,
                  )
                }
                disabled={
                  saving || extending
                }
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

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.2,
                  px: 2,
                  minHeight: 56,
                  border:
                    '1px solid #e8edf3',
                  borderRadius: 1.5,
                  backgroundColor:
                    '#f8fafc',
                }}
              >
                <CreditCardRounded
                  sx={{ color: '#1468f3' }}
                />

                <Box>
                  <Box
                    sx={{
                      fontSize: 12,
                      color: '#667085',
                    }}
                  >
                    Mevcut paket
                  </Box>

                  <Box
                    sx={{
                      fontWeight: 800,
                      color: '#101828',
                    }}
                  >
                    {gym.subscriptionPlan}
                  </Box>
                </Box>
              </Box>

              <TextField
                label="Lisans Başlangıç"
                type="date"
                value={licenseStartDate}
                onChange={(event) =>
                  setLicenseStartDate(
                    event.target.value,
                  )
                }
                disabled={
                  saving || extending
                }
                fullWidth
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
              />

              <TextField
                label="Lisans Bitiş"
                type="date"
                value={licenseEndDate}
                onChange={(event) =>
                  setLicenseEndDate(
                    event.target.value,
                  )
                }
                disabled={
                  saving || extending
                }
                fullWidth
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
              />
            </Box>

            <Button
              variant="contained"
              startIcon={
                saving ? undefined : (
                  <SaveRounded />
                )
              }
              onClick={() => {
                void saveLicenseSettings();
              }}
              disabled={
                saving || extending
              }
              sx={{
                mt: 2.5,
                minWidth: 210,
                minHeight: 44,
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
              ) : (
                'Değişiklikleri Kaydet'
              )}
            </Button>
          </CardContent>
        </Card>

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
                gap: 1.5,
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  width: 58,
                  height: 58,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    'center',
                  borderRadius: 2.5,
                  color:
                    licenseStatus.color ===
                    'error'
                      ? '#d92d20'
                      : licenseStatus.color ===
                          'warning'
                        ? '#dc6803'
                        : '#039855',
                  backgroundColor:
                    licenseStatus.color ===
                    'error'
                      ? '#fef3f2'
                      : licenseStatus.color ===
                          'warning'
                        ? '#fffaeb'
                        : '#ecfdf3',
                }}
              >
                {renderStatusIcon()}
              </Box>

              <Box>
                <Box
                  sx={{
                    fontSize: 13,
                    color: '#667085',
                  }}
                >
                  Lisans durumu
                </Box>

                <Box
                  sx={{
                    mt: 0.25,
                    fontSize: 19,
                    fontWeight: 800,
                    color: '#101828',
                  }}
                >
                  {licenseStatus.label}
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                mt: 2,
                color: '#667085',
                lineHeight: 1.6,
              }}
            >
              {licenseStatus.description}
            </Box>

            <Box
              sx={{
                mt: 2.5,
                display: 'grid',
                gridTemplateColumns:
                  'repeat(2, minmax(0, 1fr))',
                gap: 1.5,
              }}
            >
              <InfoBox
                title="Başlangıç"
                value={formatDate(
                  licenseStartDate || null,
                )}
              />

              <InfoBox
                title="Bitiş"
                value={formatDate(
                  licenseEndDate || null,
                )}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Card
        elevation={0}
        sx={{
          mt: 2.5,
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
              gap: 1,
            }}
          >
            <UpdateRounded
              sx={{ color: '#1468f3' }}
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
              Lisansı Uzat
            </Box>
          </Box>

          <Box
            sx={{
              mt: 2,
              color: '#667085',
            }}
          >
            Lisans aktifse mevcut bitiş tarihine; süresi dolmuşsa bugünün tarihine seçilen süre eklenir.
          </Box>

          <Box
            sx={{
              mt: 2.5,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <TextField
              select
              label="Uzatma Süresi"
              value={extensionMonths}
              onChange={(event) =>
                setExtensionMonths(
                  event.target.value,
                )
              }
              disabled={
                saving || extending
              }
              sx={{
                minWidth: 220,
              }}
            >
              <MenuItem value="1">
                1 Ay
              </MenuItem>

              <MenuItem value="3">
                3 Ay
              </MenuItem>

              <MenuItem value="6">
                6 Ay
              </MenuItem>

              <MenuItem value="12">
                12 Ay
              </MenuItem>
            </TextField>

            <Button
              variant="contained"
              color="success"
              startIcon={
                extending
                  ? undefined
                  : (
                    <CalendarMonthRounded />
                  )
              }
              onClick={() => {
                void extendLicense();
              }}
              disabled={
                saving || extending
              }
              sx={{
                minWidth: 190,
                minHeight: 56,
                textTransform: 'none',
                fontWeight: 800,
              }}
            >
              {extending ? (
                <CircularProgress
                  size={21}
                  sx={{
                    color: '#ffffff',
                  }}
                />
              ) : (
                'Lisansı Uzat'
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

interface InfoBoxProps {
  title: string;
  value: string;
}

function InfoBox({
  title,
  value,
}: InfoBoxProps) {
  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: 2,
        backgroundColor: '#f8fafc',
      }}
    >
      <Box
        sx={{
          fontSize: 12,
          color: '#667085',
        }}
      >
        {title}
      </Box>

      <Box
        sx={{
          mt: 0.4,
          fontWeight: 800,
          color: '#101828',
        }}
      >
        {value}
      </Box>
    </Box>
  );
}
