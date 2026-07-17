import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircleRounded,
  ErrorRounded,
  GroupsRounded,
  HistoryRounded,
  HourglassTopRounded,
  ReplayRounded,
  SendRounded,
  SmsRounded,
} from '@mui/icons-material';
import { Sidebar } from '../components/Sidebar';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';
import { api } from '../services/api';

type Member = {
  id: number;
  fullName?: string;
  name?: string;
  phone?: string;
  status?: string;
  membershipEnd?: string | null;
};

type Balance = {
  balance: number;
  totalPurchased: number;
  totalUsed: number;
};

type SmsHistory = {
  id: string;
  memberId?: number | null;
  phone: string;
  message: string;
  recipientType:
    | 'MEMBER'
    | 'MANUAL'
    | 'BULK';
  status:
    | 'PENDING'
    | 'SENT'
    | 'DELIVERED'
    | 'FAILED';
  smsCost: number;
  provider?: string | null;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryCount?: number;
  queuedAt?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  failedAt?: string | null;
  createdAt: string;
};

type SmsSummary = {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  successful?: number;
  successRate: number;
  totalSmsCost: number;
};

type BulkTarget =
  | 'SELECTED'
  | 'ALL_ACTIVE'
  | 'EXPIRING';

function memberName(member: Member) {
  return (
    member.fullName ||
    member.name ||
    `Üye #${member.id}`
  );
}

function getError(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?:
              | string
              | string[];
          };
        };
      }
    ).response;

    const message =
      response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (
      typeof message === 'string'
    ) {
      return message;
    }
  }

  return 'SMS işlemi başarısız oldu.';
}

export function SmsPanel() {
  const [tab, setTab] =
    useState(0);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [history, setHistory] =
    useState<SmsHistory[]>([]);

  const [balance, setBalance] =
    useState<Balance>({
      balance: 0,
      totalPurchased: 0,
      totalUsed: 0,
    });

  const [summary, setSummary] =
    useState<SmsSummary>({
      total: 0,
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      successRate: 0,
      totalSmsCost: 0,
    });

  const [retryingId, setRetryingId] =
    useState<string | null>(null);

  const [memberId, setMemberId] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [bulkMessage, setBulkMessage] =
    useState('');

  const [bulkTarget, setBulkTarget] =
    useState<BulkTarget>(
      'SELECTED',
    );

  const [selectedMemberIds, setSelectedMemberIds] =
    useState<number[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [feedback, setFeedback] =
    useState<{
      type: 'success' | 'error';
      text: string;
    } | null>(null);

  async function load() {
    try {
      setLoading(true);

      const [
        balanceResponse,
        historyResponse,
        membersResponse,
        summaryResponse,
      ] = await Promise.all([
        api.get<Balance>(
          '/sms/balance',
        ),
        api.get<SmsHistory[]>(
          '/sms/history',
        ),
        api.get<Member[]>(
          '/members',
        ),
        api.get<SmsSummary>(
          '/sms/summary',
        ),
      ]);

      const normalizeArray = <T,>(payload: any): T[] => {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.items)) return payload.items;
        if (Array.isArray(payload?.members)) return payload.members;
        if (Array.isArray(payload?.history)) return payload.history;
        return [];
      };

      setBalance(balanceResponse.data);

      setHistory(
        normalizeArray<SmsHistory>(historyResponse.data),
      );

      setMembers(
        normalizeArray<Member>(membersResponse.data),
      );

      setSummary(summaryResponse.data);
    } catch {
      setFeedback({
        type: 'error',
        text: 'SMS verileri alınamadı.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const smsCost = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil(
          message.length / 153,
        ),
      ),
    [message],
  );

  const bulkCostPerRecipient =
    useMemo(
      () =>
        Math.max(
          1,
          Math.ceil(
            bulkMessage.length / 153,
          ),
        ),
      [bulkMessage],
    );

  const expiringMembers =
    useMemo(() => {
      const now = new Date();
      const sevenDaysLater =
        new Date();
      sevenDaysLater.setDate(
        sevenDaysLater.getDate() + 7,
      );

      return members.filter(
        (member) => {
          if (
            !member.membershipEnd
          ) {
            return false;
          }

          const end = new Date(
            member.membershipEnd,
          );

          return (
            end >= now &&
            end <= sevenDaysLater
          );
        },
      );
    }, [members]);

  const validActiveMembers =
    useMemo(
      () =>
        members.filter(
          (member) =>
            member.status ===
              'Aktif' &&
            Boolean(
              member.phone?.trim(),
            ),
        ),
      [members],
    );

  const validSelectedMembers =
    useMemo(
      () =>
        members.filter(
          (member) =>
            selectedMemberIds.includes(
              member.id,
            ) &&
            Boolean(
              member.phone?.trim(),
            ),
        ),
      [members, selectedMemberIds],
    );

  const validExpiringMembers =
    useMemo(
      () =>
        expiringMembers.filter(
          (member) =>
            Boolean(
              member.phone?.trim(),
            ),
        ),
      [expiringMembers],
    );

  const bulkRecipientCount =
    bulkTarget ===
    'ALL_ACTIVE'
      ? validActiveMembers.length
      : bulkTarget ===
          'EXPIRING'
        ? validExpiringMembers.length
        : validSelectedMembers.length;

  const bulkTotalCost =
    bulkRecipientCount *
    bulkCostPerRecipient;

  async function sendSingleSms() {
    if (
      !memberId &&
      !phone.trim()
    ) {
      setFeedback({
        type: 'error',
        text: 'Üye veya telefon numarası seçmelisin.',
      });
      return;
    }

    if (!message.trim()) {
      setFeedback({
        type: 'error',
        text: 'Mesaj boş bırakılamaz.',
      });
      return;
    }

    try {
      setSending(true);

      await api.post(
        '/sms/send',
        {
          memberId: memberId
            ? Number(memberId)
            : undefined,
          phone: memberId
            ? undefined
            : phone.trim(),
          message:
            message.trim(),
        },
      );

      setFeedback({
        type: 'success',
        text: 'SMS test modunda gönderildi.',
      });

      setMemberId('');
      setPhone('');
      setMessage('');

      await load();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getError(error),
      });
    } finally {
      setSending(false);
    }
  }

  async function sendBulkSms() {
    if (
      bulkTarget ===
        'SELECTED' &&
      selectedMemberIds.length ===
        0
    ) {
      setFeedback({
        type: 'error',
        text: 'En az bir üye seçmelisin.',
      });
      return;
    }

    if (
      !bulkMessage.trim()
    ) {
      setFeedback({
        type: 'error',
        text: 'Mesaj boş bırakılamaz.',
      });
      return;
    }

    if (
      bulkTotalCost >
      balance.balance
    ) {
      setFeedback({
        type: 'error',
        text: `Yetersiz SMS bakiyesi. ${bulkTotalCost} SMS gerekiyor.`,
      });
      return;
    }

    const confirmed =
      window.confirm(
        `${bulkRecipientCount} üyeye toplam ${bulkTotalCost} SMS maliyetiyle gönderim yapılsın mı?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setSending(true);

      const response =
        await api.post(
          '/sms/send-bulk',
          {
            target: bulkTarget,
            memberIds:
              bulkTarget ===
              'SELECTED'
                ? selectedMemberIds
                : undefined,
            message:
              bulkMessage.trim(),
          },
        );

      setFeedback({
        type: 'success',
        text:
          response.data.message ||
          'Toplu SMS gönderildi.',
      });

      setBulkMessage('');
      setSelectedMemberIds([]);

      await load();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getError(error),
      });
    } finally {
      setSending(false);
    }
  }

  async function retrySms(
    historyId: string,
  ) {
    const confirmed =
      window.confirm(
        'Bu SMS yeniden gönderilsin mi?',
      );

    if (!confirmed) {
      return;
    }

    try {
      setRetryingId(historyId);

      const response =
        await api.post(
          `/sms/history/${historyId}/retry`,
        );

      setFeedback({
        type: 'success',
        text:
          response.data.message ||
          'SMS yeniden gönderildi.',
      });

      await load();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getError(error),
      });
    } finally {
      setRetryingId(null);
    }
  }

  function toggleMember(
    memberIdValue: number,
  ) {
    setSelectedMemberIds(
      (current) =>
        current.includes(
          memberIdValue,
        )
          ? current.filter(
              (id) =>
                id !==
                memberIdValue,
            )
          : [
              ...current,
              memberIdValue,
            ],
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background:
          'background.default',
      }}
    >
      <Sidebar />

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: {
            xs: 2,
            md: 3,
          },
        }}
      >
        <PageHeader
          eyebrow="NOVAPLUS+"
          title="SMS Paneli"
          subtitle="Tekil veya toplu SMS gönderin ve geçmişi takip edin."
          icon={<SmsRounded />}
        />

        {feedback && (
          <Alert
            severity={feedback.type}
            sx={{ mb: 3 }}
            onClose={() =>
              setFeedback(null)
            }
          >
            {feedback.text}
          </Alert>
        )}

        {loading ? (
          <Box
            sx={{
              py: 8,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
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
                  label: 'Kalan SMS',
                  value: balance.balance,
                  icon: <SmsRounded />,
                },
                {
                  label: 'Toplam Gönderim',
                  value: summary.total,
                  icon: <SendRounded />,
                },
                {
                  label: 'Teslim Edilen',
                  value: summary.delivered,
                  icon: <CheckCircleRounded />,
                },
                {
                  label: 'Başarısız',
                  value: summary.failed,
                  icon: <ErrorRounded />,
                },
                {
                  label: 'Gönderildi',
                  value: summary.sent,
                  icon: <SendRounded />,
                },
                {
                  label: 'Bekliyor',
                  value: summary.pending,
                  icon: <HourglassTopRounded />,
                },
                {
                  label: 'Başarı Oranı',
                  value: `%${Number(
                    summary.successRate || 0,
                  ).toFixed(1)}`,
                  icon: <CheckCircleRounded />,
                },
                {
                  label: 'Toplam Kullanılan',
                  value:
                    summary.totalSmsCost ??
                    balance.totalUsed,
                  icon: <SmsRounded />,
                },
              ].map((item) => (
                <StatCard
                  key={item.label}
                  title={item.label}
                  value={item.value}
                  icon={item.icon}
                  accent="#2563eb"
                  iconBackground="#eff6ff"
                />
              ))}
            </Box>

            <Paper
              elevation={0}
              sx={{
                mb: 3,
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid',
                borderColor:
                  'divider',
              }}
            >
              <Tabs
                value={tab}
                onChange={(
                  _event,
                  value: number,
                ) => setTab(value)}
                variant="scrollable"
              >
                <Tab
                  icon={<SendRounded />}
                  iconPosition="start"
                  label="Tekil SMS"
                />

                <Tab
                  icon={
                    <GroupsRounded />
                  }
                  iconPosition="start"
                  label="Toplu SMS"
                />

                <Tab
                  icon={
                    <HistoryRounded />
                  }
                  iconPosition="start"
                  label="Geçmiş"
                />
              </Tabs>
            </Paper>

            {tab === 0 && (
              <Box sx={{ maxWidth: 720 }}>
                <SectionCard
                  title="Yeni SMS"
                  subtitle="Üyeye veya manuel numaraya tekil SMS gönderin."
                  overflow="visible"
                >
                  <Stack spacing={2} sx={{ p: 3 }}>
                  <TextField
                    select
                    label="Üye seç"
                    value={memberId}
                    onChange={(
                      event,
                    ) => {
                      setMemberId(
                        event.target
                          .value,
                      );
                      setPhone('');
                    }}
                    fullWidth
                  >
                    <MenuItem value="">
                      Manuel numara kullan
                    </MenuItem>

                    {members.map(
                      (member) => (
                        <MenuItem
                          key={
                            member.id
                          }
                          value={String(
                            member.id,
                          )}
                        >
                          {memberName(
                            member,
                          )}
                          {member.phone
                            ? ` · ${member.phone}`
                            : ''}
                        </MenuItem>
                      ),
                    )}
                  </TextField>

                  {!memberId && (
                    <TextField
                      label="Telefon"
                      value={phone}
                      onChange={(
                        event,
                      ) =>
                        setPhone(
                          event.target
                            .value,
                        )
                      }
                      placeholder="05551234567"
                      fullWidth
                    />
                  )}

                  <TextField
                    label="Mesaj"
                    value={message}
                    onChange={(
                      event,
                    ) =>
                      setMessage(
                        event.target
                          .value,
                      )
                    }
                    multiline
                    minRows={5}
                    slotProps={{
                      htmlInput: {
                        maxLength: 612,
                      },
                    }}
                    fullWidth
                  />

                  <Stack
                    direction="row"
                    sx={{
                      justifyContent:
                        'space-between',
                    }}
                  >
                    <Typography
                      color="text.secondary"
                      fontSize={12}
                    >
                      {message.length}/612
                      karakter
                    </Typography>

                    <Chip
                      size="small"
                      label={`${smsCost} SMS`}
                      color={
                        balance.balance >=
                        smsCost
                          ? 'primary'
                          : 'error'
                      }
                    />
                  </Stack>

                  <Button
                    variant="contained"
                    startIcon={
                      sending ? (
                        <CircularProgress
                          size={18}
                          color="inherit"
                        />
                      ) : (
                        <SendRounded />
                      )
                    }
                    onClick={() =>
                      void sendSingleSms()
                    }
                    disabled={
                      sending ||
                      balance.balance <
                        smsCost
                    }
                    sx={{
                      py: 1.2,
                      borderRadius: 3,
                    }}
                  >
                    {sending
                      ? 'Gönderiliyor'
                      : 'SMS Gönder'}
                  </Button>
                  </Stack>
                </SectionCard>
              </Box>
            )}

            {tab === 1 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    xl: '0.8fr 1.2fr',
                  },
                  gap: 3,
                }}
              >
                <SectionCard
                  title="Toplu Gönderim"
                  subtitle="Seçili veya filtrelenmiş üyelere SMS gönderin."
                  overflow="visible"
                >
                  <Stack spacing={2} sx={{ p: 3 }}>
                    <TextField
                      select
                      label="Hedef Grup"
                      value={bulkTarget}
                      onChange={(
                        event,
                      ) =>
                        setBulkTarget(
                          event.target
                            .value as BulkTarget,
                        )
                      }
                      fullWidth
                    >
                      <MenuItem value="SELECTED">
                        Seçili üyeler
                      </MenuItem>

                      <MenuItem value="ALL_ACTIVE">
                        Tüm aktif üyeler
                      </MenuItem>

                      <MenuItem value="EXPIRING">
                        7 gün içinde üyeliği
                        bitecekler
                      </MenuItem>
                    </TextField>

                    <TextField
                      label="Toplu SMS Mesajı"
                      value={bulkMessage}
                      onChange={(
                        event,
                      ) =>
                        setBulkMessage(
                          event.target
                            .value,
                        )
                      }
                      multiline
                      minRows={6}
                      slotProps={{
                        htmlInput: {
                          maxLength: 612,
                        },
                      }}
                      fullWidth
                    />

                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 3,
                      }}
                    >
                      <Stack spacing={1}>
                        <Typography
                          sx={{
                            fontWeight: 800,
                          }}
                        >
                          Gönderim Özeti
                        </Typography>

                        <Stack
                          direction="row"
                          sx={{
                            justifyContent:
                              'space-between',
                          }}
                        >
                          <Typography color="text.secondary">
                            Alıcı
                          </Typography>

                          <Typography
                            sx={{
                              fontWeight: 900,
                            }}
                          >
                            {
                              bulkRecipientCount
                            }
                          </Typography>
                        </Stack>

                        <Stack
                          direction="row"
                          sx={{
                            justifyContent:
                              'space-between',
                          }}
                        >
                          <Typography color="text.secondary">
                            Kişi başı
                          </Typography>

                          <Typography
                            sx={{
                              fontWeight: 900,
                            }}
                          >
                            {
                              bulkCostPerRecipient
                            }{' '}
                            SMS
                          </Typography>
                        </Stack>

                        <Stack
                          direction="row"
                          sx={{
                            justifyContent:
                              'space-between',
                          }}
                        >
                          <Typography color="text.secondary">
                            Toplam maliyet
                          </Typography>

                          <Typography
                            sx={{
                              fontWeight: 900,
                              color:
                                bulkTotalCost >
                                balance.balance
                                  ? 'error.main'
                                  : 'success.main',
                            }}
                          >
                            {
                              bulkTotalCost
                            }{' '}
                            SMS
                          </Typography>
                        </Stack>
                      </Stack>
                    </Paper>

                    <Button
                      variant="contained"
                      startIcon={
                        sending ? (
                          <CircularProgress
                            size={18}
                            color="inherit"
                          />
                        ) : (
                          <GroupsRounded />
                        )
                      }
                      onClick={() =>
                        void sendBulkSms()
                      }
                      disabled={
                        sending ||
                        bulkRecipientCount ===
                          0 ||
                        !bulkMessage.trim() ||
                        bulkTotalCost >
                          balance.balance
                      }
                      sx={{
                        py: 1.2,
                        borderRadius: 3,
                      }}
                    >
                      Toplu SMS Gönder
                    </Button>

                    <Alert severity="info">
                      Gönderimler şu an test
                      modundadır. Her alıcı için
                      geçmiş kaydı oluşur ve SMS
                      bakiyesinden düşer.
                    </Alert>
                  </Stack>
                </SectionCard>

                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    border:
                      '1px solid',
                    borderColor:
                      'divider',
                  }}
                >
                  <Box sx={{ p: 3 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 900,
                      }}
                    >
                      Üye Seçimi
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.5,
                        color:
                          'text.secondary',
                        fontSize: 13,
                      }}
                    >
                      Bu liste yalnızca
                      “Seçili üyeler” hedefinde
                      kullanılır.
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      maxHeight: 620,
                      overflowY: 'auto',
                    }}
                  >
                    {members.map(
                      (member) => (
                        <Box
                          key={
                            member.id
                          }
                          sx={{
                            px: 2,
                            borderTop:
                              '1px solid',
                            borderColor:
                              'divider',
                          }}
                        >
                          <FormControlLabel
                            disabled={
                              bulkTarget !==
                                'SELECTED' ||
                              !member.phone?.trim()
                            }
                            control={
                              <Checkbox
                                checked={selectedMemberIds.includes(
                                  member.id,
                                )}
                                onChange={() =>
                                  toggleMember(
                                    member.id,
                                  )
                                }
                              />
                            }
                            label={
                              <Box
                                sx={{
                                  py: 1.2,
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontWeight:
                                      800,
                                  }}
                                >
                                  {memberName(
                                    member,
                                  )}
                                </Typography>

                                <Typography
                                  sx={{
                                    color:
                                      'text.secondary',
                                    fontSize:
                                      12,
                                  }}
                                >
                                  {member.phone ||
                                    'Telefon yok'}
                                </Typography>
                              </Box>
                            }
                          />
                        </Box>
                      ),
                    )}
                  </Box>
                </Paper>
              </Box>
            )}

            {tab === 2 && (
              <SectionCard
                title="SMS Geçmişi"
                subtitle={`${history.length} kayıt görüntüleniyor`}
              >

                <Box
                  sx={{
                    overflowX: 'auto',
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          Telefon
                        </TableCell>
                        <TableCell>
                          Tür
                        </TableCell>
                        <TableCell>
                          Mesaj
                        </TableCell>
                        <TableCell>
                          Durum
                        </TableCell>
                        <TableCell>
                          Maliyet
                        </TableCell>
                        <TableCell>
                          Detay
                        </TableCell>
                        <TableCell>
                          Tarih
                        </TableCell>
                        <TableCell align="right">
                          İşlem
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {history.map(
                        (item) => (
                          <TableRow
                            key={item.id}
                            hover
                          >
                            <TableCell>
                              {item.phone}
                            </TableCell>

                            <TableCell>
                              <Chip
                                size="small"
                                label={
                                  item.recipientType ===
                                  'BULK'
                                    ? 'Toplu'
                                    : item.recipientType ===
                                        'MEMBER'
                                      ? 'Üye'
                                      : 'Manuel'
                                }
                              />
                            </TableCell>

                            <TableCell
                              sx={{
                                minWidth:
                                  260,
                              }}
                            >
                              {
                                item.message
                              }
                            </TableCell>

                            <TableCell>
                              <Chip
                                size="small"
                                color={
                                  item.status ===
                                  'DELIVERED'
                                    ? 'success'
                                    : item.status ===
                                        'SENT'
                                      ? 'info'
                                      : item.status ===
                                          'FAILED'
                                        ? 'error'
                                        : 'warning'
                                }
                                label={
                                  item.status ===
                                  'DELIVERED'
                                    ? 'Teslim Edildi'
                                    : item.status ===
                                        'SENT'
                                      ? 'Gönderildi'
                                      : item.status ===
                                          'FAILED'
                                        ? 'Başarısız'
                                        : 'Bekliyor'
                                }
                              />
                            </TableCell>

                            <TableCell>
                              {
                                item.smsCost
                              }{' '}
                              SMS
                            </TableCell>

                            <TableCell
                              sx={{
                                minWidth: 190,
                              }}
                            >
                              <Stack spacing={0.4}>
                                <Typography
                                  fontSize={12}
                                  color="text.secondary"
                                >
                                  Sağlayıcı:{' '}
                                  {item.provider ||
                                    'MOCK'}
                                </Typography>

                                <Typography
                                  fontSize={12}
                                  color="text.secondary"
                                >
                                  Deneme:{' '}
                                  {item.retryCount || 0}/3
                                </Typography>

                                {item.errorMessage && (
                                  <Typography
                                    fontSize={12}
                                    color="error.main"
                                  >
                                    {item.errorMessage}
                                  </Typography>
                                )}
                              </Stack>
                            </TableCell>

                            <TableCell
                              sx={{
                                minWidth: 170,
                              }}
                            >
                              {new Date(
                                item.createdAt,
                              ).toLocaleString(
                                'tr-TR',
                              )}
                            </TableCell>

                            <TableCell align="right">
                              {item.status ===
                                'FAILED' && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={
                                    retryingId ===
                                    item.id ? (
                                      <CircularProgress
                                        size={15}
                                      />
                                    ) : (
                                      <ReplayRounded />
                                    )
                                  }
                                  disabled={
                                    retryingId !==
                                      null ||
                                    (item.retryCount ||
                                      0) >= 3
                                  }
                                  onClick={() =>
                                    void retrySms(
                                      item.id,
                                    )
                                  }
                                >
                                  {(item.retryCount ||
                                    0) >= 3
                                    ? 'Limit Doldu'
                                    : 'Yeniden Gönder'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ),
                      )}

                      {history.length ===
                        0 && (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                          >
                            <Typography
                              sx={{
                                py: 4,
                                textAlign:
                                  'center',
                                color:
                                  'text.secondary',
                              }}
                            >
                              Henüz SMS
                              gönderilmedi.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </SectionCard>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
