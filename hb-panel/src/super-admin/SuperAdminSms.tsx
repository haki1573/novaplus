import { useEffect, useState } from 'react';
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
  TextField,
  Typography,
} from '@mui/material';
import {
  AddRounded,
  SmsRounded,
} from '@mui/icons-material';
import { api } from '../services/api';

type SmsPackage = {
  id: string;
  name: string;
  smsCount: number;
  price: number;
  description?: string | null;
};

type Gym = {
  id: string;
  name: string;
  city?: string | null;
};

type SmsPurchase = {
  id: string;
  gymId: string;
  packageName: string;
  smsCount: number;
  amount: number;
  description?: string | null;
  createdAt: string;
  gym?: {
    id: string;
    name: string;
  } | null;
};

type SmsSalesSummary = {
  totalRevenue: number;
  totalSmsSold: number;
  totalSales: number;
  todayRevenue: number;
  todaySmsSold: number;
};

type GymSmsBalance = {
  gym: {
    id: string;
    name: string;
    city?: string | null;
    isActive: boolean;
  };
  balance: number;
  totalPurchased: number;
  totalUsed: number;
  lowBalance: boolean;
  criticalBalance: boolean;
};

export function SuperAdminSms() {
  const [packages, setPackages] = useState<SmsPackage[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [purchases, setPurchases] = useState<SmsPurchase[]>([]);
  const [balances, setBalances] = useState<GymSmsBalance[]>([]);
  const [summary, setSummary] = useState<SmsSalesSummary>({
    totalRevenue: 0,
    totalSmsSold: 0,
    totalSales: 0,
    todayRevenue: 0,
    todaySmsSold: 0,
  });
  const [loading, setLoading] = useState(true);
  const [packageDialog, setPackageDialog] = useState(false);
  const [loadDialog, setLoadDialog] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [packageForm, setPackageForm] = useState({
    name: '',
    smsCount: '',
    price: '',
    description: '',
  });

  const [loadForm, setLoadForm] = useState({
    gymId: '',
    packageId: '',
    smsCount: '',
    amount: '',
    description: '',
  });

  async function load() {
    try {
      setLoading(true);

      const [
        packagesResponse,
        gymsResponse,
        purchasesResponse,
        summaryResponse,
        balancesResponse,
      ] = await Promise.all([
        api.get<SmsPackage[]>('/super-admin/sms/packages'),
        api.get<Gym[]>('/super-admin/gyms'),
        api.get<SmsPurchase[]>('/super-admin/sms/purchases'),
        api.get<SmsSalesSummary>('/super-admin/sms/summary'),
        api.get<GymSmsBalance[]>('/super-admin/sms/balances'),
      ]);

      const normalizeArray = <T,>(payload: any): T[] => {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.items)) return payload.items;
        if (Array.isArray(payload?.gyms)) return payload.gyms;
        if (Array.isArray(payload?.packages)) return payload.packages;
        if (Array.isArray(payload?.purchases)) return payload.purchases;
        if (Array.isArray(payload?.balances)) return payload.balances;
        return [];
      };

      setPackages(
        normalizeArray<SmsPackage>(
          packagesResponse.data,
        ),
      );

      setGyms(
        normalizeArray<Gym>(
          gymsResponse.data,
        ),
      );

      setPurchases(
        normalizeArray<SmsPurchase>(
          purchasesResponse.data,
        ),
      );

      setSummary(summaryResponse.data);

      setBalances(
        normalizeArray<GymSmsBalance>(
          balancesResponse.data,
        ),
      );
    } catch {
      setFeedback({
        type: 'error',
        text: 'SMS yönetim verileri alınamadı.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createPackage() {
    try {
      await api.post('/super-admin/sms/packages', {
        name: packageForm.name.trim(),
        smsCount: Number(packageForm.smsCount),
        price: Number(packageForm.price),
        description: packageForm.description.trim() || undefined,
      });

      setPackageDialog(false);
      setPackageForm({
        name: '',
        smsCount: '',
        price: '',
        description: '',
      });
      setFeedback({
        type: 'success',
        text: 'SMS paketi oluşturuldu.',
      });
      await load();
    } catch (error: any) {
      setFeedback({
        type: 'error',
        text:
          error?.response?.data?.message ||
          'SMS paketi oluşturulamadı.',
      });
    }
  }

  async function loadBalance() {
    if (!loadForm.gymId) {
      setFeedback({
        type: 'error',
        text: 'Salon seçmelisin.',
      });
      return;
    }

    try {
      await api.post(
        `/super-admin/sms/gyms/${loadForm.gymId}/load`,
        {
          packageId: loadForm.packageId || undefined,
          smsCount: loadForm.packageId
            ? undefined
            : Number(loadForm.smsCount),
          amount: loadForm.packageId
            ? undefined
            : Number(loadForm.amount),
          description:
            loadForm.description.trim() || undefined,
        },
      );

      setLoadDialog(false);
      setLoadForm({
        gymId: '',
        packageId: '',
        smsCount: '',
        amount: '',
        description: '',
      });
      setFeedback({
        type: 'success',
        text: 'SMS bakiyesi salona yüklendi.',
      });
      await load();
    } catch (error: any) {
      setFeedback({
        type: 'error',
        text:
          error?.response?.data?.message ||
          'SMS bakiyesi yüklenemedi.',
      });
    }
  }

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          color: '#101828',
          background: '#ffffff',
          border: '1px solid #e8edf3',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              gap: 2,
              alignItems: 'center',
            }}
          >
            <SmsRounded sx={{ fontSize: 42 }} />

            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                SMS Satış Merkezi
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  color: '#667085',
                }}
              >
                Paket oluşturun ve salonlara SMS bakiyesi yükleyin.
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
            }}
          >
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={() => setPackageDialog(true)}
              sx={{
                color: '#ffffff',
                background: '#2563eb',
                '&:hover': { background: '#1d4ed8' },
              }}
            >
              Paket Oluştur
            </Button>

            <Button
              variant="outlined"
              onClick={() => setLoadDialog(true)}
              sx={{
                color: '#2563eb',
                borderColor: '#bfdbfe',
              }}
            >
              Salona SMS Yükle
            </Button>
          </Box>
        </Box>
      </Paper>

      {feedback && (
        <Alert
          severity={feedback.type}
          sx={{ mb: 3 }}
          onClose={() => setFeedback(null)}
        >
          {feedback.text}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(5, minmax(0, 1fr))',
              },
              gap: 2,
              mb: 3,
            }}
          >
            {[
              ['Toplam Gelir', new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: 'TRY',
              }).format(summary.totalRevenue)],
              ['Toplam SMS', summary.totalSmsSold.toLocaleString('tr-TR')],
              ['Toplam Satış', summary.totalSales],
              ['Bugünkü Gelir', new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: 'TRY',
              }).format(summary.todayRevenue)],
              ['Bugünkü SMS', summary.todaySmsSold.toLocaleString('tr-TR')],
            ].map(([label, value]) => (
              <Card
                key={String(label)}
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <CardContent>
                  <Typography
                    color="text.secondary"
                    sx={{ fontSize: 13 }}
                  >
                    {label}
                  </Typography>

                  <Typography
                    variant="h5"
                    sx={{ mt: 1, fontWeight: 900 }}
                  >
                    {value}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
              xl: 'repeat(3, 1fr)',
            },
            gap: 2,
          }}
        >
          {packages.map((item) => (
            <Card
              key={item.id}
              elevation={0}
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      {item.name}
                    </Typography>

                    <Typography
                      variant="h4"
                      sx={{ mt: 1, fontWeight: 900 }}
                    >
                      {item.smsCount.toLocaleString('tr-TR')}
                    </Typography>

                    <Typography color="text.secondary">
                      SMS
                    </Typography>
                  </Box>

                  <Chip
                    color="primary"
                    label={new Intl.NumberFormat('tr-TR', {
                      style: 'currency',
                      currency: 'TRY',
                    }).format(item.price)}
                  />
                </Box>

                {item.description && (
                  <Typography
                    sx={{
                      mt: 2,
                      color: 'text.secondary',
                    }}
                  >
                    {item.description}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}

          {packages.length === 0 && (
            <Paper
              elevation={0}
              sx={{
                gridColumn: '1 / -1',
                p: 5,
                textAlign: 'center',
                borderRadius: 2,
              }}
            >
              <Typography color="text.secondary">
                Henüz SMS paketi oluşturulmadı.
              </Typography>
            </Paper>
          )}
        </Box>

          <Paper
            elevation={0}
            sx={{
              mt: 3,
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Salon SMS Bakiyeleri
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  color: 'text.secondary',
                  fontSize: 13,
                }}
              >
                Düşük bakiyeli salonları takip edin ve hızlıca SMS yükleyin.
              </Typography>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}
              >
                <thead>
                  <tr>
                    {[
                      'Salon',
                      'Durum',
                      'Kalan',
                      'Toplam Alınan',
                      'Toplam Kullanılan',
                      'İşlem',
                    ].map((title) => (
                      <th
                        key={title}
                        style={{
                          textAlign: 'left',
                          padding: '14px 18px',
                          borderTop: '1px solid rgba(148,163,184,0.18)',
                          borderBottom: '1px solid rgba(148,163,184,0.18)',
                          fontSize: 12,
                        }}
                      >
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {balances.map((item) => (
                    <tr key={item.gym.id}>
                      <td style={{ padding: '14px 18px' }}>
                        <strong>{item.gym.name}</strong>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {item.gym.city || 'Şehir bilgisi yok'}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <Chip
                          size="small"
                          color={
                            item.criticalBalance
                              ? 'error'
                              : item.lowBalance
                                ? 'warning'
                                : 'success'
                          }
                          label={
                            item.criticalBalance
                              ? 'Kritik'
                              : item.lowBalance
                                ? 'Düşük'
                                : 'Yeterli'
                          }
                        />
                      </td>

                      <td
                        style={{
                          padding: '14px 18px',
                          fontWeight: 900,
                        }}
                      >
                        {item.balance.toLocaleString('tr-TR')}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {item.totalPurchased.toLocaleString('tr-TR')}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {item.totalUsed.toLocaleString('tr-TR')}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setLoadForm({
                              gymId: item.gym.id,
                              packageId: '',
                              smsCount: '',
                              amount: '',
                              description: '',
                            });
                            setLoadDialog(true);
                          }}
                        >
                          SMS Yükle
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {balances.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: 40,
                          textAlign: 'center',
                        }}
                      >
                        Salon SMS bakiyesi bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              mt: 3,
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                SMS Satış Geçmişi
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  color: 'text.secondary',
                  fontSize: 13,
                }}
              >
                Salonlara yapılan tüm SMS satışları
              </Typography>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}
              >
                <thead>
                  <tr>
                    {[
                      'Salon',
                      'Paket',
                      'SMS',
                      'Tutar',
                      'Açıklama',
                      'Tarih',
                    ].map((title) => (
                      <th
                        key={title}
                        style={{
                          textAlign: 'left',
                          padding: '14px 18px',
                          borderTop: '1px solid rgba(148,163,184,0.18)',
                          borderBottom: '1px solid rgba(148,163,184,0.18)',
                          fontSize: 12,
                        }}
                      >
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {purchases.map((item) => (
                    <tr key={item.id}>
                      <td style={{ padding: '14px 18px' }}>
                        <strong>
                          {item.gym?.name || 'Salon bulunamadı'}
                        </strong>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {item.packageName}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {item.smsCount.toLocaleString('tr-TR')}
                      </td>

                      <td style={{ padding: '14px 18px', fontWeight: 800 }}>
                        {new Intl.NumberFormat('tr-TR', {
                          style: 'currency',
                          currency: 'TRY',
                        }).format(item.amount)}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {item.description || '—'}
                      </td>

                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        {new Date(item.createdAt).toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  ))}

                  {purchases.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: 40,
                          textAlign: 'center',
                        }}
                      >
                        Henüz SMS satışı yapılmadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
          </Paper>
        </>
      )}

      <Dialog
        open={packageDialog}
        onClose={() => setPackageDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Yeni SMS Paketi</DialogTitle>

        <DialogContent>
          <Box
            sx={{
              mt: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <TextField
              label="Paket Adı"
              value={packageForm.name}
              onChange={(event) =>
                setPackageForm({
                  ...packageForm,
                  name: event.target.value,
                })
              }
              fullWidth
            />

            <TextField
              label="SMS Adedi"
              type="number"
              value={packageForm.smsCount}
              onChange={(event) =>
                setPackageForm({
                  ...packageForm,
                  smsCount: event.target.value,
                })
              }
              fullWidth
            />

            <TextField
              label="Fiyat"
              type="number"
              value={packageForm.price}
              onChange={(event) =>
                setPackageForm({
                  ...packageForm,
                  price: event.target.value,
                })
              }
              fullWidth
            />

            <TextField
              label="Açıklama"
              value={packageForm.description}
              onChange={(event) =>
                setPackageForm({
                  ...packageForm,
                  description: event.target.value,
                })
              }
              multiline
              minRows={2}
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setPackageDialog(false)}>
            İptal
          </Button>
          <Button variant="contained" onClick={() => void createPackage()}>
            Oluştur
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={loadDialog}
        onClose={() => setLoadDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Salona SMS Yükle</DialogTitle>

        <DialogContent>
          <Box
            sx={{
              mt: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <TextField
              select
              label="Salon"
              value={loadForm.gymId}
              onChange={(event) =>
                setLoadForm({
                  ...loadForm,
                  gymId: event.target.value,
                })
              }
              fullWidth
            >
              {gyms.map((gym) => (
                <MenuItem key={gym.id} value={gym.id}>
                  {gym.name}
                  {gym.city ? ` · ${gym.city}` : ''}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="SMS Paketi"
              value={loadForm.packageId}
              onChange={(event) =>
                setLoadForm({
                  ...loadForm,
                  packageId: event.target.value,
                  smsCount: '',
                })
              }
              fullWidth
            >
              <MenuItem value="">
                Paket seçmeden özel adet yükle
              </MenuItem>

              {packages.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name} · {item.smsCount} SMS
                </MenuItem>
              ))}
            </TextField>

            {!loadForm.packageId && (
              <>
                <TextField
                  label="Özel SMS Adedi"
                  type="number"
                  value={loadForm.smsCount}
                  onChange={(event) =>
                    setLoadForm({
                      ...loadForm,
                      smsCount: event.target.value,
                    })
                  }
                  fullWidth
                />

                <TextField
                  label="Satış Tutarı"
                  type="number"
                  value={loadForm.amount}
                  onChange={(event) =>
                    setLoadForm({
                      ...loadForm,
                      amount: event.target.value,
                    })
                  }
                  fullWidth
                />
              </>
            )}

            <TextField
              label="Satış Açıklaması"
              value={loadForm.description}
              onChange={(event) =>
                setLoadForm({
                  ...loadForm,
                  description: event.target.value,
                })
              }
              multiline
              minRows={2}
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setLoadDialog(false)}>
            İptal
          </Button>
          <Button variant="contained" onClick={() => void loadBalance()}>
            Yükle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
