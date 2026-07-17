import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  AutoAwesomeRounded,
  CreditCardRounded,
  InsightsRounded,
  Inventory2Rounded,
  PaymentsRounded,
  SendRounded,
  SmartToyRounded,
} from '@mui/icons-material';

import { Sidebar } from '../components/Sidebar';
import { PageHeader } from '../components/ui/PageHeader';
import { PageContainer } from '../components/ui/PageContainer';
import { SectionCard } from '../components/ui/SectionCard';
import { StatusChip } from '../components/ui/StatusChip';
import { api } from '../services/api';

type Message = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
};

type DashboardStats = {
  activeMembers?: number;
  todayCheckIns?: number;
  monthlyIncome?: number;
  totalIncome?: number;
  totalExpense?: number;
  expiringMemberships?: number;
  recentCheckIns?: Array<{
    member?: {
      fullName?: string;
    };
    checkInTime?: string;
  }>;
};

type AccessSummary = {
  cards?: {
    available?: number;
    assigned?: number;
  };
  qr?: {
    available?: number;
    assigned?: number;
  };
};

type FinanceSummary = {
  totalIncome?: number;
  totalExpense?: number;
  balance?: number;
};

type SmsBalance = {
  balance?: number;
  totalPurchased?: number;
  totalUsed?: number;
};

type LockerSummary = {
  total?: number;
  available?: number;
  occupied?: number;
  outOfService?: number;
};

type NotificationSummary = {
  total?: number;
  unread?: number;
  critical?: number;
  warning?: number;
};

type Member = {
  id: number;
  fullName?: string;
  name?: string;
  status?: string;
  membershipEnd?: string | null;
};

const quickQuestions = [
  {
    label: 'Bu ay ne kadar kazandım?',
    icon: <PaymentsRounded />,
  },
  {
    label: 'Kart stoğum ne durumda?',
    icon: <CreditCardRounded />,
  },
  {
    label: 'Bitecek üyelikleri göster',
    icon: <Inventory2Rounded />,
  },
  {
    label: 'Bugünkü girişleri özetle',
    icon: <InsightsRounded />,
  },
  {
    label: 'SMS bakiyem ne durumda?',
    icon: <PaymentsRounded />,
  },
  {
    label: 'Dolapların durumu nasıl?',
    icon: <Inventory2Rounded />,
  },
];

function formatMoney(value?: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(Number(value) || 0);
}

function readUserName() {
  try {
    const raw = localStorage.getItem('user');

    if (!raw) return 'Salon Yöneticisi';

    const user = JSON.parse(raw) as {
      firstName?: string;
      lastName?: string;
      fullName?: string;
    };

    return (
      user.fullName ||
      [user.firstName, user.lastName]
        .filter(Boolean)
        .join(' ') ||
      'Salon Yöneticisi'
    );
  } catch {
    return 'Salon Yöneticisi';
  }
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[?.!,]/g, '')
    .trim();
}

export function NovaAI() {
  const userName = useMemo(readUserName, []);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([
      {
        id: 1,
        role: 'assistant',
        text: `Merhaba ${userName}. Ben Nova AI. Salonunuzun üyelik, finans, giriş ve stok verilerini yorumlamanıza yardımcı olabilirim.`,
      },
    ]);

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const [dashboard, setDashboard] =
    useState<DashboardStats>({});
  const [accessSummary, setAccessSummary] =
    useState<AccessSummary>({});
  const [finance, setFinance] =
    useState<FinanceSummary>({});
  const [members, setMembers] =
    useState<Member[]>([]);

  const [smsBalance, setSmsBalance] =
    useState<SmsBalance>({});

  const [lockerSummary, setLockerSummary] =
    useState<LockerSummary>({});

  const [
    notificationSummary,
    setNotificationSummary,
  ] = useState<NotificationSummary>({});

  useEffect(() => {
    async function loadContext() {
      const results = await Promise.allSettled([
        api.get<DashboardStats>(
          '/analytics/dashboard',
        ),
        api.get<AccessSummary>(
          '/access-cards/summary',
        ),
        api.get<FinanceSummary>(
          '/finance/summary',
        ),
        api.get<Member[]>('/members'),
        api.get<SmsBalance>('/sms/balance'),
        api.get<LockerSummary>('/lockers/summary'),
        api.get<NotificationSummary>(
          '/notifications/summary',
        ),
      ]);

      if (
        results[0].status === 'fulfilled'
      ) {
        const dashboardData =
          results[0].value.data;

        setDashboard({
          ...dashboardData,
          recentCheckIns: Array.isArray(
            dashboardData?.recentCheckIns,
          )
            ? dashboardData.recentCheckIns
            : [],
        });
      }

      if (
        results[1].status === 'fulfilled'
      ) {
        setAccessSummary(
          results[1].value.data,
        );
      }

      if (
        results[2].status === 'fulfilled'
      ) {
        setFinance(results[2].value.data);
      }

      if (
        results[3].status === 'fulfilled'
      ) {
        const payload =
          results[3].value.data as
            | Member[]
            | {
                data?: Member[];
                items?: Member[];
                members?: Member[];
              };

        const memberList = Array.isArray(
          payload,
        )
          ? payload
          : Array.isArray(payload?.members)
            ? payload.members
            : Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload?.items)
                ? payload.items
                : [];

        setMembers(memberList);
      }

      if (
        results[4].status === 'fulfilled'
      ) {
        setSmsBalance(
          results[4].value.data,
        );
      }

      if (
        results[5].status === 'fulfilled'
      ) {
        setLockerSummary(
          results[5].value.data,
        );
      }

      if (
        results[6].status === 'fulfilled'
      ) {
        setNotificationSummary(
          results[6].value.data,
        );
      }
    }

    void loadContext();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, loading]);

  const expiringMembers = useMemo(() => {
    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(
      sevenDaysLater.getDate() + 7,
    );

    return members.filter((member) => {
      if (!member.membershipEnd) {
        return false;
      }

      const end = new Date(
        member.membershipEnd,
      );

      return (
        end >= now &&
        end <= sevenDaysLater
      );
    });
  }, [members]);

  function createAnswer(input: string) {
    const query = normalize(input);

    if (
      query.includes('bu ay') &&
      (query.includes('kazand') ||
        query.includes('gelir'))
    ) {
      return `Bu ayki toplam geliriniz ${formatMoney(
        dashboard.monthlyIncome,
      )}. Genel kasa bakiyeniz ${formatMoney(
        finance.balance,
      )}. Toplam gelir ${formatMoney(
        finance.totalIncome,
      )}, toplam gider ise ${formatMoney(
        finance.totalExpense,
      )}.`;
    }

    if (
      query.includes('kart') &&
      (query.includes('stok') ||
        query.includes('durum'))
    ) {
      const available =
        accessSummary.cards?.available || 0;
      const assigned =
        accessSummary.cards?.assigned || 0;

      const warning =
        available <= 10
          ? ' Stok kritik seviyede; yeni kart siparişi vermeniz iyi olur.'
          : ' Stok seviyesi şu an güvenli görünüyor.';

      return `Kullanılabilir fiziksel kart sayısı ${available}. Üyelere atanmış kart sayısı ${assigned}.${warning}`;
    }

    if (
      query.includes('qr') &&
      (query.includes('stok') ||
        query.includes('durum'))
    ) {
      return `Kullanılabilir QR sayısı ${
        accessSummary.qr?.available || 0
      }. Üyelere atanmış QR sayısı ${
        accessSummary.qr?.assigned || 0
      }.`;
    }

    if (
      query.includes('bitecek') ||
      query.includes('üyelik')
    ) {
      if (expiringMembers.length === 0) {
        return 'Önümüzdeki 7 gün içinde bitecek üyelik görünmüyor.';
      }

      const names = expiringMembers
        .slice(0, 8)
        .map(
          (member) =>
            member.fullName ||
            member.name ||
            `Üye #${member.id}`,
        )
        .join(', ');

      return `Önümüzdeki 7 gün içinde ${expiringMembers.length} üyelik bitecek. İlk üyeler: ${names}.`;
    }

    if (
      query.includes('giriş') ||
      query.includes('check')
    ) {
      const recentNames =
        dashboard.recentCheckIns
          ?.slice(0, 3)
          .map(
            (item) =>
              item.member?.fullName,
          )
          .filter(Boolean)
          .join(', ') || 'Kayıt yok';

      return `Bugün ${
        dashboard.todayCheckIns || 0
      } giriş yapıldı. Aktif üye sayınız ${
        dashboard.activeMembers || 0
      }. Son giriş yapan üyeler: ${recentNames}.`;
    }

    if (
      query.includes('gider') ||
      query.includes('kasa')
    ) {
      return `Toplam gelir ${formatMoney(
        finance.totalIncome,
      )}, toplam gider ${formatMoney(
        finance.totalExpense,
      )}. Güncel kasa bakiyesi ${formatMoney(
        finance.balance,
      )}.`;
    }

    if (
      query.includes('sms')
    ) {
      const remaining =
        smsBalance.balance || 0;

      const warning =
        remaining <= 50
          ? ' SMS bakiyesi kritik seviyede.'
          : remaining <= 150
            ? ' SMS bakiyesi azalmış durumda.'
            : ' SMS bakiyesi yeterli görünüyor.';

      return `Kalan SMS bakiyesi ${remaining}. Toplam alınan ${
        smsBalance.totalPurchased || 0
      }, toplam kullanılan ${
        smsBalance.totalUsed || 0
      }.${warning}`;
    }

    if (
      query.includes('dolap')
    ) {
      return `Toplam ${
        lockerSummary.total || 0
      } dolap var. ${
        lockerSummary.available || 0
      } boş, ${
        lockerSummary.occupied || 0
      } dolu ve ${
        lockerSummary.outOfService || 0
      } arızalı dolap bulunuyor.`;
    }

    if (
      query.includes('bildirim') ||
      query.includes('uyarı')
    ) {
      return `Toplam ${
        notificationSummary.total || 0
      } aktif bildirim var. ${
        notificationSummary.unread || 0
      } okunmamış, ${
        notificationSummary.critical || 0
      } kritik ve ${
        notificationSummary.warning || 0
      } uyarı seviyesinde bildirim bulunuyor.`;
    }

    return 'Bu soruyu şu an doğrudan yorumlayamıyorum. Finans, kart veya QR stoğu, SMS, dolaplar, bildirimler, bitecek üyelikler ve bugünkü girişler hakkında soru sorabilirsiniz.';
  }

  async function sendQuestion(value?: string) {
    const text = (value ?? question).trim();

    if (!text || loading) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        role: 'user',
        text,
      },
    ]);

    setQuestion('');
    setLoading(true);

    await new Promise((resolve) =>
      window.setTimeout(resolve, 650),
    );

    setMessages((current) => [
      ...current,
      {
        id: Date.now() + 1,
        role: 'assistant',
        text: createAnswer(text),
      },
    ]);

    setLoading(false);
  }

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background: '#f4f7fb',
      }}
    >
      <Sidebar />

      <PageContainer>
        <PageHeader
          eyebrow="NOVAPLUS+"
          title="Nova AI"
          subtitle="Salon verilerinizi sorularla analiz edin."
          icon={<SmartToyRounded />}
          actions={
            <StatusChip
              label="Canlı salon verileri"
              tone="info"
              size="medium"
            />
          }
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              xl: 'minmax(0, 1fr) 320px',
            },
            gap: 3,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              minHeight: 660,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
              overflow: 'hidden',
              border:
                '1px solid #e2e8f0',
              boxShadow:
                '0 12px 34px rgba(15, 23, 42, 0.06)',
            }}
          >
            <Box
              sx={{
                px: 3,
                py: 2,
                borderBottom:
                  '1px solid #e2e8f0',
              }}
            >
              <Typography
                sx={{ fontWeight: 900 }}
              >
                Nova AI ile Sohbet
              </Typography>

              <Typography
                sx={{
                  mt: 0.25,
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                Cevaplar mevcut NovaPlus+
                verilerinden hazırlanır.
              </Typography>
            </Box>

            <Box
              sx={{
                flex: 1,
                p: {
                  xs: 2,
                  md: 3,
                },
                overflowY: 'auto',
                background:
                  'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
              }}
            >
              <Stack spacing={2}>
                {messages.map((message) => (
                  <Stack
                    key={message.id}
                    direction={
                      message.role === 'user'
                        ? 'row-reverse'
                        : 'row'
                    }
                    spacing={1.25}
                    alignItems="flex-start"
                  >
                    <Avatar
                      sx={{
                        width: 38,
                        height: 38,
                        background:
                          message.role === 'user'
                            ? '#dbeafe'
                            : 'linear-gradient(135deg, #4f46e5, #2563eb)',
                        color:
                          message.role === 'user'
                            ? '#1d4ed8'
                            : 'white',
                      }}
                    >
                      {message.role ===
                      'user' ? (
                        userName
                          .charAt(0)
                          .toLocaleUpperCase(
                            'tr-TR',
                          )
                      ) : (
                        <SmartToyRounded
                          fontSize="small"
                        />
                      )}
                    </Avatar>

                    <Box
                      sx={{
                        maxWidth: {
                          xs: '82%',
                          md: '72%',
                        },
                        px: 2,
                        py: 1.5,
                        borderRadius:
                          message.role ===
                          'user'
                            ? '18px 5px 18px 18px'
                            : '5px 18px 18px 18px',
                        color:
                          message.role ===
                          'user'
                            ? 'white'
                            : '#0f172a',
                        background:
                          message.role ===
                          'user'
                            ? 'linear-gradient(135deg, #2563eb, #4f46e5)'
                            : 'white',
                        border:
                          message.role ===
                          'assistant'
                            ? '1px solid #e2e8f0'
                            : 'none',
                        boxShadow:
                          '0 8px 22px rgba(15,23,42,0.06)',
                      }}
                    >
                      <Typography
                        sx={{
                          lineHeight: 1.65,
                          whiteSpace:
                            'pre-line',
                        }}
                      >
                        {message.text}
                      </Typography>
                    </Box>
                  </Stack>
                ))}

                {loading && (
                  <Stack
                    direction="row"
                    spacing={1.25}
                    alignItems="center"
                  >
                    <Avatar
                      sx={{
                        width: 38,
                        height: 38,
                        background:
                          'linear-gradient(135deg, #4f46e5, #2563eb)',
                      }}
                    >
                      <SmartToyRounded fontSize="small" />
                    </Avatar>

                    <Paper
                      elevation={0}
                      sx={{
                        px: 2,
                        py: 1.5,
                        borderRadius:
                          '5px 18px 18px 18px',
                        border:
                          '1px solid #e2e8f0',
                      }}
                    >
                      <CircularProgress
                        size={19}
                      />
                    </Paper>
                  </Stack>
                )}

                <div ref={bottomRef} />
              </Stack>
            </Box>

            <Divider />

            <Box sx={{ p: 2 }}>
              <Stack
                direction="row"
                spacing={1.25}
              >
                <TextField
                  fullWidth
                  value={question}
                  onChange={(event) =>
                    setQuestion(
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                        'Enter' &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      void sendQuestion();
                    }
                  }}
                  placeholder="Nova AI'a bir soru sorun..."
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root':
                      {
                        borderRadius: 2,
                      },
                  }}
                />

                <Button
                  variant="contained"
                  onClick={() =>
                    void sendQuestion()
                  }
                  disabled={
                    loading ||
                    !question.trim()
                  }
                  sx={{
                    minWidth: 54,
                    borderRadius: 2,
                  }}
                >
                  <SendRounded />
                </Button>
              </Stack>
            </Box>
          </Paper>

          <Stack spacing={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 2,
                border:
                  '1px solid #e2e8f0',
              }}
            >
              <Typography
                sx={{
                  fontWeight: 900,
                  mb: 1.5,
                }}
              >
                Hızlı Sorular
              </Typography>

              <Stack spacing={1}>
                {quickQuestions.map(
                  (item) => (
                    <Button
                      key={item.label}
                      variant="outlined"
                      startIcon={item.icon}
                      onClick={() =>
                        void sendQuestion(
                          item.label,
                        )
                      }
                      disabled={loading}
                      sx={{
                        justifyContent:
                          'flex-start',
                        textAlign: 'left',
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontWeight: 700,
                      }}
                    >
                      {item.label}
                    </Button>
                  ),
                )}
              </Stack>
            </Paper>

            <SectionCard
              title="Canlı Özet"
              subtitle="Anlık salon verileri"
              overflow="visible"
            >
              <Box sx={{ p: 2.5 }}>

              <Stack spacing={1.5}>
                <Box>
                  <Typography
                    sx={{
                      color:
                        '#64748b',
                      fontSize: 12,
                    }}
                  >
                    Bugünkü giriş
                  </Typography>

                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 900 }}
                  >
                    {dashboard.todayCheckIns ||
                      0}
                  </Typography>
                </Box>

                <Divider
                  sx={{
                    borderColor:
                      '#e5e7eb',
                  }}
                />

                <Box>
                  <Typography
                    sx={{
                      color:
                        '#64748b',
                      fontSize: 12,
                    }}
                  >
                    Bu ay gelir
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 900,
                    }}
                  >
                    {formatMoney(
                      dashboard.monthlyIncome,
                    )}
                  </Typography>
                </Box>

                <Divider
                  sx={{
                    borderColor:
                      '#e5e7eb',
                  }}
                />

                <Box>
                  <Typography
                    sx={{
                      color:
                        '#64748b',
                      fontSize: 12,
                    }}
                  >
                    Boş kart
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 900,
                    }}
                  >
                    {accessSummary.cards
                      ?.available || 0}
                  </Typography>
                </Box>

                <Divider
                  sx={{
                    borderColor:
                      '#e5e7eb',
                  }}
                />

                <Box>
                  <Typography
                    sx={{
                      color:
                        '#64748b',
                      fontSize: 12,
                    }}
                  >
                    7 günde bitecek üyelik
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 900,
                    }}
                  >
                    {expiringMembers.length}
                  </Typography>
                </Box>

                <Divider
                  sx={{
                    borderColor:
                      '#e5e7eb',
                  }}
                />

                <Box>
                  <Typography
                    sx={{
                      color:
                        '#64748b',
                      fontSize: 12,
                    }}
                  >
                    Kalan SMS
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 900,
                    }}
                  >
                    {smsBalance.balance || 0}
                  </Typography>
                </Box>

                <Divider
                  sx={{
                    borderColor:
                      '#e5e7eb',
                  }}
                />

                <Box>
                  <Typography
                    sx={{
                      color:
                        '#64748b',
                      fontSize: 12,
                    }}
                  >
                    Arızalı dolap
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 900,
                    }}
                  >
                    {lockerSummary.outOfService || 0}
                  </Typography>
                </Box>
              </Stack>

              </Box>
            </SectionCard>
          </Stack>
        </Box>
      </PageContainer>
    </Box>
  );
}
