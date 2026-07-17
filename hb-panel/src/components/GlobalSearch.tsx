import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  ClickAwayListener,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

import {
  AccountBalanceWalletRounded,
  CreditCardRounded,
  GroupsRounded,
  Inventory2Rounded,
  QrCode2Rounded,
  RestaurantRounded,
  SearchRounded,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

type SearchCategory =
  | 'MEMBER'
  | 'CARD'
  | 'QR'
  | 'PACKAGE'
  | 'FINANCE'
  | 'PRODUCT';

type SearchResult = {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle: string;
  detail?: string;
  path: string;
};

type Member = {
  id: number;
  fullName?: string;
  name?: string;
  phone?: string;
  email?: string;
  cardNumber?: string | null;
  qrCode?: string | null;
  package?: {
    name?: string;
  } | null;
};

type AccessItem = {
  id: string;
  type: 'CARD' | 'QR';
  code: string;
  status?: string;
  member?: {
    fullName?: string;
    name?: string;
    phone?: string;
  } | null;
};

type PackageItem = {
  id: string;
  name: string;
  price?: number;
  durationMonths?: number;
};

type FinanceItem = {
  id: number;
  title: string;
  description?: string;
  amount?: number;
  type?: 'income' | 'expense';
};

type ProductItem = {
  id: string | number;
  name?: string;
  title?: string;
  stock?: number;
  price?: number;
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .trim();
}

function memberName(
  member?: {
    fullName?: string;
    name?: string;
  } | null,
) {
  return (
    member?.fullName ||
    member?.name ||
    'Üye bilgisi yok'
  );
}

function initials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part[0]?.toLocaleUpperCase('tr-TR'),
    )
    .join('');
}

function categoryInfo(
  category: SearchCategory,
) {
  switch (category) {
    case 'MEMBER':
      return {
        label: 'Üye',
        icon: <GroupsRounded />,
        color: '#2563eb',
        background: '#eff6ff',
      };
    case 'CARD':
      return {
        label: 'Kart',
        icon: <CreditCardRounded />,
        color: '#0891b2',
        background: '#ecfeff',
      };
    case 'QR':
      return {
        label: 'QR',
        icon: <QrCode2Rounded />,
        color: '#7c3aed',
        background: '#f5f3ff',
      };
    case 'PACKAGE':
      return {
        label: 'Paket',
        icon: <Inventory2Rounded />,
        color: '#d97706',
        background: '#fffbeb',
      };
    case 'FINANCE':
      return {
        label: 'Finans',
        icon: (
          <AccountBalanceWalletRounded />
        ),
        color: '#16a34a',
        background: '#f0fdf4',
      };
    case 'PRODUCT':
      return {
        label: 'Ürün',
        icon: <RestaurantRounded />,
        color: '#ea580c',
        background: '#fff7ed',
      };
  }
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const inputRef =
    useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState('');
  const [focused, setFocused] =
    useState(false);
  const [loading, setLoading] =
    useState(true);

  const [members, setMembers] =
    useState<Member[]>([]);
  const [accessItems, setAccessItems] =
    useState<AccessItem[]>([]);
  const [packages, setPackages] =
    useState<PackageItem[]>([]);
  const [financeItems, setFinanceItems] =
    useState<FinanceItem[]>([]);
  const [products, setProducts] =
    useState<ProductItem[]>([]);

  useEffect(() => {
    async function loadSearchData() {
      setLoading(true);

      const responses =
        await Promise.allSettled([
          api.get<Member[]>('/members'),
          api.get<AccessItem[]>(
            '/access-cards',
          ),
          api.get<PackageItem[]>(
            '/packages',
          ),
          api.get<FinanceItem[]>(
            '/finance',
          ),
          api.get<ProductItem[]>(
            '/cafe/products',
          ),
        ]);

      if (
        responses[0].status ===
        'fulfilled'
      ) {
        setMembers(
          responses[0].value.data || [],
        );
      }

      if (
        responses[1].status ===
        'fulfilled'
      ) {
        setAccessItems(
          responses[1].value.data || [],
        );
      }

      if (
        responses[2].status ===
        'fulfilled'
      ) {
        setPackages(
          responses[2].value.data || [],
        );
      }

      if (
        responses[3].status ===
        'fulfilled'
      ) {
        setFinanceItems(
          responses[3].value.data || [],
        );
      }

      if (
        responses[4].status ===
        'fulfilled'
      ) {
        setProducts(
          responses[4].value.data || [],
        );
      }

      setLoading(false);
    }

    void loadSearchData();
  }, []);

  const results = useMemo(() => {
    const search = normalize(query);

    if (search.length < 2) {
      return [];
    }

    const found: SearchResult[] = [];

    members.forEach((member) => {
      const name =
        member.fullName ||
        member.name ||
        `Üye #${member.id}`;

      const searchable = normalize(
        [
          name,
          member.phone,
          member.email,
          member.cardNumber,
          member.qrCode,
          member.package?.name,
        ]
          .filter(Boolean)
          .join(' '),
      );

      if (searchable.includes(search)) {
        found.push({
          id: `member-${member.id}`,
          category: 'MEMBER',
          title: name,
          subtitle:
            member.phone ||
            member.email ||
            'Üye',
          detail:
            member.package?.name ||
            undefined,
          path: '/members',
        });
      }
    });

    accessItems.forEach((item) => {
      const owner = memberName(
        item.member,
      );

      const searchable = normalize(
        [
          item.code,
          owner,
          item.member?.phone,
          item.status,
        ]
          .filter(Boolean)
          .join(' '),
      );

      if (searchable.includes(search)) {
        found.push({
          id: `access-${item.id}`,
          category:
            item.type === 'CARD'
              ? 'CARD'
              : 'QR',
          title: item.code,
          subtitle:
            item.member
              ? `${owner} adlı üyeye tanımlı`
              : 'Stokta',
          detail:
            item.status === 'AVAILABLE'
              ? 'Kullanılabilir'
              : 'Satıldı',
          path: '/access-cards',
        });
      }
    });

    packages.forEach((item) => {
      const searchable = normalize(
        [
          item.name,
          item.durationMonths
            ? `${item.durationMonths} ay`
            : '',
          item.price,
        ]
          .filter(Boolean)
          .join(' '),
      );

      if (searchable.includes(search)) {
        found.push({
          id: `package-${item.id}`,
          category: 'PACKAGE',
          title: item.name,
          subtitle: item.durationMonths
            ? `${item.durationMonths} ay`
            : 'Üyelik paketi',
          detail:
            typeof item.price === 'number'
              ? new Intl.NumberFormat(
                  'tr-TR',
                  {
                    style: 'currency',
                    currency: 'TRY',
                  },
                ).format(item.price)
              : undefined,
          path: '/packages',
        });
      }
    });

    financeItems.forEach((item) => {
      const searchable = normalize(
        [
          item.title,
          item.description,
          item.type,
          item.amount,
        ]
          .filter(Boolean)
          .join(' '),
      );

      if (searchable.includes(search)) {
        found.push({
          id: `finance-${item.id}`,
          category: 'FINANCE',
          title: item.title,
          subtitle:
            item.description ||
            (item.type === 'income'
              ? 'Gelir kaydı'
              : 'Gider kaydı'),
          detail:
            typeof item.amount === 'number'
              ? new Intl.NumberFormat(
                  'tr-TR',
                  {
                    style: 'currency',
                    currency: 'TRY',
                  },
                ).format(item.amount)
              : undefined,
          path: '/finance',
        });
      }
    });

    products.forEach((item) => {
      const name =
        item.name ||
        item.title ||
        `Ürün #${item.id}`;

      const searchable = normalize(
        [name, item.stock, item.price]
          .filter(
            (value) =>
              value !== undefined &&
              value !== null,
          )
          .join(' '),
      );

      if (searchable.includes(search)) {
        found.push({
          id: `product-${item.id}`,
          category: 'PRODUCT',
          title: name,
          subtitle:
            typeof item.stock === 'number'
              ? `${item.stock} adet stok`
              : 'Kafe ürünü',
          detail:
            typeof item.price === 'number'
              ? new Intl.NumberFormat(
                  'tr-TR',
                  {
                    style: 'currency',
                    currency: 'TRY',
                  },
                ).format(item.price)
              : undefined,
          path: '/cafe',
        });
      }
    });

    return found.slice(0, 10);
  }, [
    accessItems,
    financeItems,
    members,
    packages,
    products,
    query,
  ]);

  const open =
    focused && query.trim().length >= 2;

  const handleResultClick = (
    result: SearchResult,
  ) => {
    setQuery('');
    setFocused(false);
    navigate(result.path);
  };

  return (
    <ClickAwayListener
      onClickAway={() => setFocused(false)}
    >
      <Box
        sx={{
          position: 'relative',
          width: {
            xs: '100%',
            sm: 330,
          },
          zIndex: 50,
        }}
      >
        <TextField
          inputRef={inputRef}
          fullWidth
          size="small"
          value={query}
          onFocus={() => setFocused(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setFocused(true);
          }}
          placeholder="Üye, kart, QR, ürün ara..."
          sx={{
            '& .MuiOutlinedInput-root': {
              minHeight: 42,
              bgcolor:
                'rgba(255,255,255,0.12)',
              color: 'white',
              borderRadius: 3,
            },
            '& fieldset': {
              borderColor:
                'rgba(255,255,255,0.18)',
            },
            '& .MuiOutlinedInput-root:hover fieldset':
              {
                borderColor:
                  'rgba(255,255,255,0.35)',
              },
            '& .Mui-focused fieldset': {
              borderColor:
                'rgba(255,255,255,0.7) !important',
            },
            '& input::placeholder': {
              color:
                'rgba(255,255,255,0.72)',
              opacity: 1,
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded
                    sx={{ color: 'white' }}
                  />
                </InputAdornment>
              ),
              endAdornment: loading ? (
                <InputAdornment position="end">
                  <CircularProgress
                    size={17}
                    sx={{ color: 'white' }}
                  />
                </InputAdornment>
              ) : undefined,
            },
          }}
        />

        {open && (
          <Paper
            elevation={14}
            sx={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              left: 0,
              right: 0,
              maxHeight: 460,
              overflowY: 'auto',
              borderRadius: 3,
              border:
                '1px solid #e2e8f0',
              background: 'white',
              boxShadow:
                '0 24px 70px rgba(15,23,42,0.26)',
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: '#64748b',
                }}
              >
                ARAMA SONUÇLARI
              </Typography>
            </Box>

            <Divider />

            {results.length === 0 ? (
              <Box
                sx={{
                  px: 3,
                  py: 5,
                  textAlign: 'center',
                }}
              >
                <SearchRounded
                  sx={{
                    fontSize: 38,
                    color: '#cbd5e1',
                  }}
                />

                <Typography
                  sx={{
                    mt: 1,
                    fontWeight: 800,
                    color: '#334155',
                  }}
                >
                  Sonuç bulunamadı
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,
                    color: '#94a3b8',
                    fontSize: 13,
                  }}
                >
                  En az iki karakter kullanarak
                  başka bir arama deneyin.
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {results.map(
                  (result, index) => {
                    const category =
                      categoryInfo(
                        result.category,
                      );

                    return (
                      <Box key={result.id}>
                        <ListItemButton
                          onClick={() =>
                            handleResultClick(
                              result,
                            )
                          }
                          sx={{
                            px: 2,
                            py: 1.4,
                            alignItems:
                              'center',
                            '&:hover': {
                              background:
                                '#f8fafc',
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{ minWidth: 48 }}
                          >
                            {result.category ===
                            'MEMBER' ? (
                              <Avatar
                                sx={{
                                  width: 38,
                                  height: 38,
                                  fontSize: 13,
                                  fontWeight: 900,
                                  color:
                                    category.color,
                                  background:
                                    category.background,
                                }}
                              >
                                {initials(
                                  result.title,
                                )}
                              </Avatar>
                            ) : (
                              <Box
                                sx={{
                                  width: 38,
                                  height: 38,
                                  display: 'grid',
                                  placeItems:
                                    'center',
                                  borderRadius: 2.5,
                                  color:
                                    category.color,
                                  background:
                                    category.background,
                                }}
                              >
                                {category.icon}
                              </Box>
                            )}
                          </ListItemIcon>

                          <ListItemText
                            primary={
                              result.title
                            }
                            secondary={
                              result.subtitle
                            }
                            slotProps={{
                              primary: {
                                sx: {
                                  fontWeight: 850,
                                  color:
                                    '#0f172a',
                                },
                              },
                              secondary: {
                                sx: {
                                  mt: 0.2,
                                  fontSize: 12,
                                },
                              },
                            }}
                          />

                          <Box
                            sx={{
                              ml: 1,
                              textAlign:
                                'right',
                            }}
                          >
                            <Chip
                              size="small"
                              label={
                                category.label
                              }
                              sx={{
                                height: 22,
                                fontSize: 9,
                                fontWeight: 900,
                                color:
                                  category.color,
                                background:
                                  category.background,
                              }}
                            />

                            {result.detail && (
                              <Typography
                                sx={{
                                  mt: 0.5,
                                  color:
                                    '#64748b',
                                  fontSize: 11,
                                  whiteSpace:
                                    'nowrap',
                                }}
                              >
                                {
                                  result.detail
                                }
                              </Typography>
                            )}
                          </Box>
                        </ListItemButton>

                        {index <
                          results.length -
                            1 && (
                          <Divider
                            sx={{ ml: 8 }}
                          />
                        )}
                      </Box>
                    );
                  },
                )}
              </List>
            )}

            <Divider />

            <Box
              sx={{
                px: 2,
                py: 1.25,
                background: '#f8fafc',
              }}
            >
              <Typography
                sx={{
                  color: '#94a3b8',
                  fontSize: 11,
                }}
              >
                Üye, telefon, kart, QR, paket,
                finans kaydı ve kafe ürünü
                aranabilir.
              </Typography>
            </Box>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
}
