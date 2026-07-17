import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AddBusinessRounded,
  ApartmentRounded,
  BusinessRounded,
  LinkRounded,
  LinkOffRounded,
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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

type Gym = {
  id: string;
  name: string;
  city: string | null;
  organizationId?: string | null;
};

type Organization = {
  id: string;
  name: string;
  companyName: string | null;
  ownerName: string | null;
  city: string | null;
  maxGyms: number;
  isActive: boolean;
  gymCount: number;
  gyms: Array<{
    id: string;
    name: string;
    city: string | null;
    isActive: boolean;
  }>;
};

export function Organizations() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] =
    useState<Organization[]>([]);

  const [gyms, setGyms] =
    useState<Gym[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [name, setName] =
    useState('');

  const [companyName, setCompanyName] =
    useState('');

  const [ownerName, setOwnerName] =
    useState('');

  const [city, setCity] =
    useState('');

  const [maxGyms, setMaxGyms] =
    useState('3');

  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState('');

  const [selectedGymId, setSelectedGymId] =
    useState('');

  const [
    removingGym,
    setRemovingGym,
  ] = useState<{
    organizationId: string;
    organizationName: string;
    gymId: string;
    gymName: string;
  } | null>(null);

  const [removing, setRemoving] =
    useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        organizationResponse,
        gymResponse,
      ] = await Promise.all([
        api.get<Organization[]>(
          '/super-admin/organizations',
        ),
        api.get<Gym[]>(
          '/super-admin/gyms',
        ),
      ]);

      setOrganizations(
        organizationResponse.data,
      );

      setGyms(
        gymResponse.data,
      );
    } catch {
      setError(
        'İşletme bilgileri alınamadı.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const unassignedGyms =
    useMemo(
      () =>
        gyms.filter(
          (gym) =>
            !gym.organizationId,
        ),
      [gyms],
    );

  const createOrganization =
    async () => {
      try {
        await api.post(
          '/super-admin/organizations',
          {
            name,
            companyName:
              companyName || null,
            ownerName:
              ownerName || null,
            city:
              city || null,
            maxGyms:
              Number(maxGyms),
          },
        );

        setDialogOpen(false);
        setName('');
        setCompanyName('');
        setOwnerName('');
        setCity('');
        setMaxGyms('3');

        await load();
      } catch {
        setError(
          'İşletme oluşturulamadı.',
        );
      }
    };

  const assignGym =
    async () => {
      if (
        !selectedOrganizationId ||
        !selectedGymId
      ) {
        setError(
          'İşletme ve şube seçmelisiniz.',
        );
        return;
      }

      try {
        await api.patch(
          `/super-admin/organizations/${selectedOrganizationId}/gyms/${selectedGymId}`,
        );

        setSelectedGymId('');

        await load();
      } catch {
        setError(
          'Şube işletmeye bağlanamadı.',
        );
      }
    };


  const removeGymFromOrganization =
    async () => {
      if (!removingGym) {
        return;
      }

      try {
        setRemoving(true);
        setError('');

        await api.patch(
          `/super-admin/organizations/${removingGym.organizationId}/gyms/${removingGym.gymId}/remove`,
        );

        setRemovingGym(null);

        await load();
      } catch {
        setError(
          'Şube işletmeden ayrılamadı.',
        );
      } finally {
        setRemoving(false);
      }
    };

  if (loading) {
    return (
      <Box
        sx={{
          py: 10,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={{
          xs: 'column',
          md: 'row',
        }}

        spacing={2}
        sx={{ justifyContent: 'space-between', mb: 3 }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: {
                xs: 28,
                md: 34,
              },
              fontWeight: 900,
            }}
          >
            İşletmeler
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              color: '#667085',
            }}
          >
            Zincir salonları ve bağlı şubeleri tek merkezden yönetin.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={
            <AddBusinessRounded />
          }
          onClick={() =>
            setDialogOpen(true)
          }
        >
          Yeni İşletme
        </Button>
      </Stack>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      <Card
        elevation={0}
        sx={{
          mb: 3,
          border:
            '1px solid #e8edf3',
          borderRadius: 2,
        }}
      >
        <CardContent>
          <Typography
            sx={{
              fontWeight: 900,
              mb: 1.5,
            }}
          >
            Mevcut Salonu İşletmeye Bağla
          </Typography>

          <Stack
            direction={{
              xs: 'column',
              md: 'row',
            }}
            spacing={1.5}
          >
            <TextField
              select
              fullWidth
              label="İşletme"
              value={selectedOrganizationId}
              onChange={(event) =>
                setSelectedOrganizationId(
                  event.target.value,
                )
              }
            >
              {organizations.map(
                (organization) => (
                  <MenuItem
                    key={organization.id}
                    value={organization.id}
                  >
                    {organization.name}
                  </MenuItem>
                ),
              )}
            </TextField>

            <TextField
              select
              fullWidth
              label="Bağlanacak Şube"
              value={selectedGymId}
              onChange={(event) =>
                setSelectedGymId(
                  event.target.value,
                )
              }
            >
              {unassignedGyms.map(
                (gym) => (
                  <MenuItem
                    key={gym.id}
                    value={gym.id}
                  >
                    {gym.name}
                  </MenuItem>
                ),
              )}
            </TextField>

            <Button
              variant="contained"
              startIcon={
                <LinkRounded />
              }
              onClick={() =>
                void assignGym()
              }
              sx={{
                minWidth: 180,
              }}
            >
              Şubeyi Bağla
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            xl:
              'repeat(2, minmax(0, 1fr))',
          },
          gap: 2,
        }}
      >
        {organizations.map(
          (organization) => (
            <Card
              key={organization.id}
              elevation={0}
              sx={{
                border:
                  '1px solid #e8edf3',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Stack
                  direction="row"

                  spacing={2}
                
                sx={{ justifyContent: 'space-between' }}>
                  <Stack
                    direction="row"
                    spacing={1.5}
                  >
                    <Box
                      sx={{
                        width: 46,
                        height: 46,
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: '#eaf1ff',
                        color: '#1468f3',
                      }}
                    >
                      <BusinessRounded />
                    </Box>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 18,
                          fontWeight: 900,
                        }}
                      >
                        {organization.name}
                      </Typography>

                      <Typography
                        sx={{
                          color: '#667085',
                          fontSize: 12,
                        }}
                      >
                        {organization.ownerName ||
                          organization.companyName ||
                          'Yetkili belirtilmedi'}
                      </Typography>
                    </Box>
                  </Stack>

                  <Chip
                    color={
                      organization.isActive
                        ? 'success'
                        : 'default'
                    }
                    label={
                      organization.isActive
                        ? 'Aktif'
                        : 'Pasif'
                    }
                    size="small"
                  />
                </Stack>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    mt: 2,
                    mb: 1.5,
                  }}
                >
                  <Chip
                    icon={
                      <ApartmentRounded />
                    }
                    label={`${organization.gymCount}/${organization.maxGyms} Şube`}
                  />

                  {organization.city && (
                    <Chip
                      label={organization.city}
                      variant="outlined"
                    />
                  )}
                </Stack>

                <Stack spacing={1}>
                  {organization.gyms.map(
                    (gym) => (
                      <Box
                        key={gym.id}
                        sx={{
                          p: 1.2,
                          borderRadius: 2,
                          bgcolor: '#f8fafc',
                          border:
                            '1px solid #eef2f7',
                        }}
                      >
                        <Stack
                          direction={{
                            xs: 'column',
                            sm: 'row',
                          }}


                          spacing={1}
                        
                        sx={{ justifyContent: 'space-between', alignItems: {
                            xs: 'stretch',
                            sm: 'center',
                          } }}>
                          <Box>
                            <Typography
                              sx={{
                                fontWeight: 800,
                              }}
                            >
                              {gym.name}
                            </Typography>

                            <Typography
                              sx={{
                                mt: 0.2,
                                color: '#98a2b3',
                                fontSize: 11,
                              }}
                            >
                              {gym.city ||
                                'Şehir belirtilmedi'}
                            </Typography>
                          </Box>

                          <Stack
                            direction="row"
                            spacing={1}

                          
                          sx={{ alignItems: 'center' }}>
                            <Chip
                              size="small"
                              label={
                                gym.isActive
                                  ? 'Aktif'
                                  : 'Pasif'
                              }
                            />

                            <Button
                              size="small"
                              color="warning"
                              variant="outlined"
                              startIcon={
                                <LinkOffRounded />
                              }
                              onClick={() =>
                                setRemovingGym({
                                  organizationId:
                                    organization.id,
                                  organizationName:
                                    organization.name,
                                  gymId:
                                    gym.id,
                                  gymName:
                                    gym.name,
                                })
                              }
                              sx={{
                                textTransform:
                                  'none',
                                fontWeight: 800,
                              }}
                            >
                              İşletmeden Ayır
                            </Button>
                          </Stack>
                        </Stack>
                      </Box>
                    ),
                  )}

                  {organization.gyms.length ===
                    0 && (
                    <Alert severity="info">
                      Bu işletmeye henüz şube bağlanmadı.
                    </Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ),
        )}
      </Box>

      <Dialog
        open={Boolean(removingGym)}
        onClose={() => {
          if (!removing) {
            setRemovingGym(null);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Şubeyi İşletmeden Ayır
        </DialogTitle>

        <DialogContent>
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
          >
            Bu işlem şubeyi silmez. Üyeler,
            finans, personel, kart/QR,
            turnike ve diğer veriler korunur.
          </Alert>

          <Typography>
            <strong>
              {removingGym?.gymName}
            </strong>{' '}
            şubesi{' '}
            <strong>
              {removingGym?.organizationName}
            </strong>{' '}
            işletmesinden ayrılacak.
          </Typography>

          <Typography
            sx={{
              mt: 1.5,
              color: '#667085',
              fontSize: 13,
            }}
          >
            Şube bağımsız bir spor salonuna
            dönüşecek ve daha sonra başka bir
            işletmeye bağlanabilecek.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{ p: 3 }}
        >
          <Button
            onClick={() =>
              setRemovingGym(null)
            }
            disabled={removing}
          >
            Vazgeç
          </Button>

          <Button
            color="warning"
            variant="contained"
            startIcon={
              <LinkOffRounded />
            }
            onClick={() =>
              void removeGymFromOrganization()
            }
            disabled={removing}
          >
            {removing
              ? 'Ayrılıyor...'
              : 'İşletmeden Ayır'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onClose={() =>
          setDialogOpen(false)
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Yeni İşletme
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label="İşletme Adı"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
            />

            <TextField
              label="Şirket Unvanı"
              value={companyName}
              onChange={(event) =>
                setCompanyName(
                  event.target.value,
                )
              }
            />

            <TextField
              label="İşletme Sahibi"
              value={ownerName}
              onChange={(event) =>
                setOwnerName(
                  event.target.value,
                )
              }
            />

            <TextField
              label="Merkez Şehir"
              value={city}
              onChange={(event) =>
                setCity(
                  event.target.value,
                )
              }
            />

            <TextField
              type="number"
              label="Şube Hakkı"
              value={maxGyms}
              onChange={(event) =>
                setMaxGyms(
                  event.target.value,
                )
              }
            />
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{ p: 3 }}
        >
          <Button
            onClick={() =>
              setDialogOpen(false)
            }
          >
            Vazgeç
          </Button>

          <Button
            variant="contained"
            onClick={() =>
              void createOrganization()
            }
          >
            Oluştur
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
