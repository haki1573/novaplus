import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  BackupRounded,
  DeleteOutlineRounded,
  RestoreRounded,
  SaveRounded,
  StorageRounded,
  TimerRounded,
} from '@mui/icons-material';

import { api } from '../services/api';

type BackupHealth = 'VALID' | 'INVALID';

type BackupItem = {
  filename: string;
  trigger:
    | 'AUTO'
    | 'MANUAL';
  sizeBytes: number;
  createdAt: string;
  health: BackupHealth;
  databaseSizeBytes: number;
  includesUploads: boolean;
  version: string;
};

type BackupOverview = {
  automaticEnabled: boolean;
  intervalMinutes: number;
  retentionCount: number;
  backupCount: number;
  validBackupCount: number;
  invalidBackupCount: number;
  totalSizeBytes: number;
  latestBackup:
    | BackupItem
    | null;
  latestValidBackup: BackupItem | null;
  lastFailure: { at: string; message: string } | null;
  freeDiskBytes: number;
  health: 'HEALTHY' | 'WARNING';
  maintenanceTime: string;
  databasePath: string;
};

function bytes(
  value: number,
) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (
    value <
    1024 * 1024
  ) {
    return `${(
      value / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    value /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}

function getErrorMessage(
  error: unknown,
) {
  if (
    typeof error ===
      'object' &&
    error !== null &&
    'response' in error
  ) {
    const message = (
      error as {
        response?: {
          data?: {
            message?:
              | string
              | string[];
          };
        };
      }
    ).response?.data
      ?.message;

    if (
      Array.isArray(
        message,
      )
    ) {
      return message.join(
        ', ',
      );
    }

    if (
      typeof message ===
      'string'
    ) {
      return message;
    }
  }

  return 'Yedekleme işlemi başarısız.';
}

export function BackupManagement() {
  const [
    backups,
    setBackups,
  ] = useState<
    BackupItem[]
  >([]);

  const [
    overview,
    setOverview,
  ] = useState<
    BackupOverview | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    working,
    setWorking,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    success,
    setSuccess,
  ] = useState('');

  const load = useCallback(
    async () => {
      try {
        setLoading(true);

        const [
          backupsResponse,
          overviewResponse,
        ] = await Promise.all([
          api.get<
            BackupItem[]
          >(
            '/super-admin/backups',
          ),
          api.get<
            BackupOverview
          >(
            '/super-admin/backups/overview',
          ),
        ]);

        setBackups(
          backupsResponse.data,
        );

        setOverview(
          overviewResponse.data,
        );

        setError('');
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const createBackup =
    async () => {
      try {
        setWorking(true);
        setError('');

        const response =
          await api.post(
            '/super-admin/backups',
          );

        setSuccess(
          response.data
            .message,
        );

        await load();
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setWorking(false);
      }
    };

  const removeBackup =
    async (
      backup: BackupItem,
    ) => {
      if (
        !window.confirm(
          'Bu yedek silinsin mi?',
        )
      ) {
        return;
      }

      try {
        setWorking(true);

        await api.delete(
          `/super-admin/backups/${encodeURIComponent(
            backup.filename,
          )}`,
        );

        setSuccess(
          'Yedek silindi.',
        );

        await load();
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setWorking(false);
      }
    };

  const restoreBackup =
    async (
      backup: BackupItem,
    ) => {
      if (
        !window.confirm(
          'Bu yedek geri yüklenecek. Mevcut veritabanı değiştirilecek ve backend yeniden başlayacak. Devam edilsin mi?',
        )
      ) {
        return;
      }

      try {
        setWorking(true);

        const response =
          await api.post(
            `/super-admin/backups/${encodeURIComponent(
              backup.filename,
            )}/restore`,
          );

        setSuccess(
          response.data
            .message,
        );

        window.setTimeout(
          () => {
            window.location.reload();
          },
          4500,
        );
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
          ),
        );

        setWorking(false);
      }
    };

  const cards = [
    {
      label:
        'Otomatik Yedek',
      value:
        overview
          ?.automaticEnabled
          ? 'Aktif'
          : 'Kapalı',
      icon:
        <BackupRounded />,
    },
    {
      label:
        'Yedekleme Aralığı',
      value:
        `${overview?.intervalMinutes || 5} dk`,
      icon:
        <TimerRounded />,
    },
    {
      label:
        'Saklanan Yedek',
      value:
        overview
          ?.backupCount || 0,
      icon:
        <StorageRounded />,
    },
    {
      label:
        'Toplam Boyut',
      value:
        bytes(
          overview
            ?.totalSizeBytes ||
            0,
        ),
      icon:
        <SaveRounded />,
    },
  ];

  return (
    <Box>
      <Stack
        direction={{
          xs: 'column',
          sm: 'row',
        }}
        spacing={2}
        sx={{
          mb: 3,
          justifyContent: 'space-between',
          alignItems: {
            xs: 'flex-start',
            sm: 'center',
          },
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
            }}
          >
            Yedekleme Merkezi
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              color: '#667085',
            }}
          >
            Otomatik ve manuel yedekleri izleyin, doğrulayın ve gerektiğinde güvenle geri yükleyin.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={
            working ? (
              <CircularProgress
                size={18}
                color="inherit"
              />
            ) : (
              <BackupRounded />
            )
          }
          disabled={working}
          onClick={() =>
            void createBackup()
          }
        >
          Manuel Yedek Al
        </Button>
      </Stack>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() =>
            setError('')
          }
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() =>
            setSuccess('')
          }
        >
          {success}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs:
              'repeat(2, minmax(0, 1fr))',
            lg:
              'repeat(4, minmax(0, 1fr))',
          },
          gap: 1.4,
          mb: 3,
        }}
      >
        {cards.map(
          (card) => (
            <Paper
              key={card.label}
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border:
                  '1px solid #e8edf3',
              }}
            >
              <Box
                sx={{
                  color:
                    '#1468f3',
                }}
              >
                {card.icon}
              </Box>

              <Typography
                sx={{
                  mt: 1,
                  color:
                    '#667085',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {card.label}
              </Typography>

              <Typography
                sx={{
                  mt: 0.3,
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {card.value}
              </Typography>
            </Paper>
          ),
        )}
      </Box>

      <Paper
        elevation={0}
        sx={{
          overflow: 'hidden',
          borderRadius: 2,
          border:
            '1px solid #e8edf3',
        }}
      >
        <Box
          sx={{
            p: 2.5,
            borderBottom:
              '1px solid #e8edf3',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 900,
            }}
          >
            Yedek Geçmişi
          </Typography>

          <Typography
            sx={{
              mt: 0.35,
              color:
                '#667085',
              fontSize: 13,
            }}
          >
            Sistem son {overview?.retentionCount || 30} yedeği otomatik olarak saklar.
          </Typography>
        </Box>

        {loading ? (
          <Box
            sx={{
              py: 8,
              textAlign:
                'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : backups.length ===
          0 ? (
          <Box
            sx={{
              py: 8,
              textAlign:
                'center',
            }}
          >
            <BackupRounded
              sx={{
                fontSize: 52,
                color:
                  '#cbd5e1',
              }}
            />

            <Typography
              sx={{
                mt: 1,
                fontWeight: 800,
              }}
            >
              Henüz yedek yok
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              overflowX:
                'auto',
            }}
          >
            <Table
              sx={{
                minWidth: 800,
              }}
            >
              <TableHead>
                <TableRow
                  sx={{
                    background:
                      '#f8fafc',
                  }}
                >
                  <TableCell>
                    Tarih
                  </TableCell>
                  <TableCell>
                    Tür
                  </TableCell>
                  <TableCell>
                    Sağlık
                  </TableCell>
                  <TableCell>
                    Boyut
                  </TableCell>
                  <TableCell>
                    Dosya
                  </TableCell>
                  <TableCell align="center">
                    İşlemler
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {backups.map(
                  (backup) => (
                    <TableRow
                      key={
                        backup.filename
                      }
                      hover
                    >
                      <TableCell>
                        {new Date(
                          backup.createdAt,
                        ).toLocaleString(
                          'tr-TR',
                        )}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            backup.trigger ===
                            'MANUAL'
                              ? 'Manuel'
                              : 'Otomatik'
                          }
                          color={
                            backup.trigger ===
                            'MANUAL'
                              ? 'primary'
                              : 'success'
                          }
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell>
                        <Chip size="small" label={backup.health === 'VALID' ? 'Doğrulandı' : 'Geçersiz'} color={backup.health === 'VALID' ? 'success' : 'error'} />
                      </TableCell>

                      <TableCell>
                        {bytes(backup.sizeBytes)}
                      </TableCell>

                      <TableCell>
                        <Typography
                          component="code"
                          sx={{
                            fontSize: 11,
                          }}
                        >
                          {backup.filename}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Tooltip title="Geri yükle">
                          <span>
                            <IconButton
                              color="warning"
                              disabled={
                                working || backup.health !== 'VALID'
                              }
                              onClick={() =>
                                void restoreBackup(
                                  backup,
                                )
                              }
                            >
                              <RestoreRounded />
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title="Sil">
                          <span>
                            <IconButton
                              color="error"
                              disabled={
                                working
                              }
                              onClick={() =>
                                void removeBackup(
                                  backup,
                                )
                              }
                            >
                              <DeleteOutlineRounded />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
