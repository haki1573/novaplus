import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AccountBalanceWalletRounded,
  AddRounded,
  BoltRounded,
  CoffeeRounded,
  LocalCafeRounded,
  PointOfSaleRounded,
  QrCodeScannerRounded,
  SearchRounded,
  ShoppingCartRounded,
  StarRounded,
  WaterDropRounded,
} from '@mui/icons-material';

import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

import { api } from '../services/api';
import { Sidebar } from '../components/Sidebar';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionCard } from '../components/ui/SectionCard';

type DrinkCategory =
  | 'WATER'
  | 'COFFEE'
  | 'PROTEIN'
  | 'ENERGY'
  | 'OTHER';

interface Member {
  id: number;
  fullName?: string;
  name?: string;
  phone?: string;
}

interface Product {
  id: string;
  name: string;
  category: DrinkCategory;
  salePrice: number;
  stockQuantity: number;
  lowStockLimit: number;
  isActive: boolean;
  barcode?: string | null;
}

interface WalletResponse {
  wallet: {
    id: string;
    balance: number;
  };
  member: {
    id: number;
    fullName: string;
    phone?: string;
  };
  transactions: Array<{
    id: string;
    type:
      | 'TOP_UP'
      | 'PURCHASE'
      | 'REFUND'
      | 'ADJUSTMENT';
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description?: string | null;
    createdAt: string;
  }>;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const categories: Array<{
  value: 'ALL' | DrinkCategory;
  label: string;
}> = [
  { value: 'ALL', label: 'Tümü' },
  { value: 'WATER', label: 'Su' },
  { value: 'COFFEE', label: 'Kahve' },
  { value: 'PROTEIN', label: 'Protein' },
  { value: 'ENERGY', label: 'Enerji' },
  { value: 'OTHER', label: 'Diğer' },
];

function memberName(
  member: Member,
) {
  return (
    member.fullName ||
    member.name ||
    `Üye #${member.id}`
  );
}

function formatMoney(
  value: number,
) {
  return new Intl.NumberFormat(
    'tr-TR',
    {
      style: 'currency',
      currency: 'TRY',
    },
  ).format(
    Number(value) || 0,
  );
}

function getErrorMessage(
  error: unknown,
) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const message =
      (
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
      Array.isArray(message)
    ) {
      return message.join(', ');
    }

    if (
      typeof message ===
      'string'
    ) {
      return message;
    }
  }

  return 'İşlem sırasında bir hata oluştu.';
}

function categoryIcon(
  category: DrinkCategory,
) {
  if (
    category === 'WATER'
  ) {
    return <WaterDropRounded />;
  }

  if (
    category === 'COFFEE'
  ) {
    return <CoffeeRounded />;
  }

  if (
    category === 'ENERGY'
  ) {
    return <BoltRounded />;
  }

  return <LocalCafeRounded />;
}

export function Cafe() {
  const [tab, setTab] =
    useState<
      'sale' | 'drinks' | 'wallet'
    >('sale');

  const [members, setMembers] =
    useState<Member[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [favorites, setFavorites] =
    useState<Product[]>([]);

  const [lowStock, setLowStock] =
    useState<Product[]>([]);

  const [selectedMemberId, setSelectedMemberId] =
    useState('');

  const [memberSearch, setMemberSearch] =
    useState('');

  const [productSearch, setProductSearch] =
    useState('');

  const [barcode, setBarcode] =
    useState('');

  const [category, setCategory] =
    useState<
      'ALL' | DrinkCategory
    >('ALL');

  const [wallet, setWallet] =
    useState<WalletResponse | null>(
      null,
    );

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [severity, setSeverity] =
    useState<
      'success' | 'error'
    >('success');

  const [productDialogOpen, setProductDialogOpen] =
    useState(false);

  const [topUpDialogOpen, setTopUpDialogOpen] =
    useState(false);

  const [topUpAmount, setTopUpAmount] =
    useState('');

  const [productForm, setProductForm] =
    useState({
      name: '',
      category:
        'WATER' as DrinkCategory,
      salePrice: '',
      stockQuantity: '',
      lowStockLimit: '5',
      barcode: '',
    });

  const loadData =
    useCallback(async () => {
      try {
        setLoading(true);

        const [
          membersResponse,
          productsResponse,
          favoritesResponse,
          lowStockResponse,
        ] = await Promise.all([
          api.get<Member[]>(
            '/members',
          ),
          api.get<Product[]>(
            '/wallet-cafe/products',
          ),
          api.get<Product[]>(
            '/wallet-cafe/products/favorites',
          ),
          api.get<Product[]>(
            '/wallet-cafe/products/low-stock',
          ),
        ]);

        const normalizeArray = <T,>(
          payload:
            | T[]
            | {
                data?: T[];
                items?: T[];
                members?: T[];
                products?: T[];
              },
        ): T[] => {
          if (Array.isArray(payload)) {
            return payload;
          }

          if (Array.isArray(payload?.data)) {
            return payload.data;
          }

          if (Array.isArray(payload?.items)) {
            return payload.items;
          }

          if (Array.isArray(payload?.members)) {
            return payload.members;
          }

          if (Array.isArray(payload?.products)) {
            return payload.products;
          }

          return [];
        };

        setMembers(
          normalizeArray<Member>(
            membersResponse.data as
              | Member[]
              | {
                  data?: Member[];
                  items?: Member[];
                  members?: Member[];
                },
          ),
        );

        setProducts(
          normalizeArray<Product>(
            productsResponse.data as
              | Product[]
              | {
                  data?: Product[];
                  items?: Product[];
                  products?: Product[];
                },
          ),
        );

        setFavorites(
          normalizeArray<Product>(
            favoritesResponse.data as
              | Product[]
              | {
                  data?: Product[];
                  items?: Product[];
                  products?: Product[];
                },
          ),
        );

        setLowStock(
          normalizeArray<Product>(
            lowStockResponse.data as
              | Product[]
              | {
                  data?: Product[];
                  items?: Product[];
                  products?: Product[];
                },
          ),
        );
      } catch (error) {
        setSeverity('error');
        setMessage(
          getErrorMessage(error),
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredMembers =
    useMemo(() => {
      const query =
        memberSearch
          .trim()
          .toLocaleLowerCase(
            'tr-TR',
          );

      if (!query) {
        return members;
      }

      return members.filter(
        (member) =>
          [
            memberName(member),
            member.phone || '',
          ]
            .join(' ')
            .toLocaleLowerCase(
              'tr-TR',
            )
            .includes(query),
      );
    }, [
      members,
      memberSearch,
    ]);

  const filteredProducts =
    useMemo(() => {
      const query =
        productSearch
          .trim()
          .toLocaleLowerCase(
            'tr-TR',
          );

      return products.filter(
        (product) =>
          product.isActive &&
          product.stockQuantity > 0 &&
          (
            category === 'ALL' ||
            product.category ===
              category
          ) &&
          (
            !query ||
            product.name
              .toLocaleLowerCase(
                'tr-TR',
              )
              .includes(query) ||
            (
              product.barcode || ''
            ).includes(query)
          ),
      );
    }, [
      products,
      productSearch,
      category,
    ]);

  const selectedMember =
    members.find(
      (member) =>
        String(member.id) ===
        selectedMemberId,
    ) || null;

  const cartTotal =
    useMemo(
      () =>
        cart.reduce(
          (sum, item) =>
            sum +
            Number(
              item.product
                .salePrice,
            ) *
              item.quantity,
          0,
        ),
      [cart],
    );

  const loadWallet =
    async (
      memberId: string,
    ) => {
      if (!memberId) {
        setWallet(null);
        return;
      }

      try {
        const response =
          await api.get<WalletResponse>(
            `/wallet-cafe/members/${memberId}/wallet`,
          );

        setWallet(response.data);
      } catch (error) {
        setSeverity('error');
        setMessage(
          getErrorMessage(error),
        );
      }
    };

  const selectMember =
    (memberId: string) => {
      setSelectedMemberId(
        memberId,
      );

      void loadWallet(
        memberId,
      );
    };

  const addToCart =
    (product: Product) => {
      setCart((current) => {
        const existing =
          current.find(
            (item) =>
              item.product.id ===
              product.id,
          );

        if (existing) {
          if (
            existing.quantity >=
            product.stockQuantity
          ) {
            return current;
          }

          return current.map(
            (item) =>
              item.product.id ===
              product.id
                ? {
                    ...item,
                    quantity:
                      item.quantity +
                      1,
                  }
                : item,
          );
        }

        return [
          ...current,
          {
            product,
            quantity: 1,
          },
        ];
      });
    };

  const scanBarcode =
    () => {
      const value =
        barcode.trim();

      if (!value) {
        return;
      }

      const product =
        products.find(
          (item) =>
            item.isActive &&
            item.stockQuantity > 0 &&
            item.barcode === value,
        );

      if (!product) {
        setSeverity('error');
        setMessage(
          'Bu barkoda ait aktif içecek bulunamadı.',
        );
        return;
      }

      addToCart(product);
      setBarcode('');
      setSeverity('success');
      setMessage(
        `${product.name} sepete eklendi.`,
      );
    };

  const changeQuantity =
    (
      productId: string,
      quantity: number,
    ) => {
      setCart((current) =>
        current
          .map((item) => {
            if (
              item.product.id !==
              productId
            ) {
              return item;
            }

            return {
              ...item,
              quantity:
                Math.min(
                  Math.max(
                    quantity,
                    0,
                  ),
                  item.product
                    .stockQuantity,
                ),
            };
          })
          .filter(
            (item) =>
              item.quantity > 0,
          ),
      );
    };

  const completeSale =
    async () => {
      if (!selectedMemberId) {
        setSeverity('error');
        setMessage(
          'Satış için üye seçin.',
        );
        return;
      }

      if (
        cart.length === 0
      ) {
        setSeverity('error');
        setMessage(
          'Sepete en az bir içecek ekleyin.',
        );
        return;
      }

      const balance =
        Number(
          wallet?.wallet.balance ||
            0,
        );

      if (
        balance < cartTotal
      ) {
        setSeverity('error');
        setMessage(
          `Yetersiz bakiye. Eksik tutar: ${formatMoney(
            cartTotal -
              balance,
          )}`,
        );
        return;
      }

      try {
        setSaving(true);

        await api.post(
          '/wallet-cafe/sales',
          {
            memberId:
              Number(
                selectedMemberId,
              ),
            paymentMethod:
              'MEMBER_BALANCE',
            items:
              cart.map(
                (item) => ({
                  productId:
                    item.product.id,
                  quantity:
                    item.quantity,
                }),
              ),
            note:
              `${selectedMember ? memberName(selectedMember) : 'Üye'} için içecek satışı`,
          },
        );

        setCart([]);
        setSeverity('success');
        setMessage(
          'İçecek satışı tamamlandı.',
        );

        await loadData();
        await loadWallet(
          selectedMemberId,
        );
      } catch (error) {
        setSeverity('error');
        setMessage(
          getErrorMessage(error),
        );
      } finally {
        setSaving(false);
      }
    };

  const createProduct =
    async () => {
      try {
        setSaving(true);

        await api.post(
          '/wallet-cafe/products',
          {
            name:
              productForm.name.trim(),
            category:
              productForm.category,
            salePrice:
              Number(
                productForm.salePrice,
              ),
            stockQuantity:
              Number(
                productForm.stockQuantity,
              ),
            lowStockLimit:
              Number(
                productForm.lowStockLimit,
              ),
            barcode:
              productForm.barcode
                .trim() ||
              null,
          },
        );

        setProductDialogOpen(
          false,
        );

        setProductForm({
          name: '',
          category: 'WATER',
          salePrice: '',
          stockQuantity: '',
          lowStockLimit: '5',
          barcode: '',
        });

        setSeverity('success');
        setMessage(
          'İçecek eklendi.',
        );

        await loadData();
      } catch (error) {
        setSeverity('error');
        setMessage(
          getErrorMessage(error),
        );
      } finally {
        setSaving(false);
      }
    };

  const topUpWallet =
    async () => {
      if (!selectedMemberId) {
        setSeverity('error');
        setMessage(
          'Önce bir üye seçin.',
        );
        return;
      }

      try {
        setSaving(true);

        await api.post(
          `/wallet-cafe/members/${selectedMemberId}/top-up`,
          {
            amount:
              Number(
                topUpAmount,
              ),
            description:
              'Resepsiyon cüzdan yüklemesi',
          },
        );

        setTopUpDialogOpen(
          false,
        );

        setTopUpAmount('');

        setSeverity('success');
        setMessage(
          'Bakiye yüklendi.',
        );

        await loadWallet(
          selectedMemberId,
        );
      } catch (error) {
        setSeverity('error');
        setMessage(
          getErrorMessage(error),
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <Box sx={{ display: 'flex' }}>
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
          minHeight: '100vh',
          bgcolor: '#f4f7fb',
        }}
      >
        <PageHeader
          eyebrow="NOVAPLUS+"
          title="Nova Café"
          subtitle="Üye cüzdanı ile hızlı içecek satışı"
          icon={
            <LocalCafeRounded />
          }
          actions={
            <Stack
              direction="row"
              spacing={1}
            >
              <Button
                variant="outlined"
                startIcon={
                  <AccountBalanceWalletRounded />
                }
                onClick={() =>
                  setTopUpDialogOpen(
                    true,
                  )
                }
                disabled={
                  !selectedMemberId
                }
              >
                Bakiye Yükle
              </Button>

              <Button
                variant="contained"
                startIcon={
                  <AddRounded />
                }
                onClick={() =>
                  setProductDialogOpen(
                    true,
                  )
                }
              >
                İçecek Ekle
              </Button>
            </Stack>
          }
        />

        {lowStock.length > 0 && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
          >
            Kritik stok:{' '}
            {lowStock
              .slice(0, 5)
              .map(
                (product) =>
                  `${product.name} (${product.stockQuantity})`,
              )
              .join(', ')}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            mb: 3,
            border:
              '1px solid #e5e7eb',
            borderRadius: 2,
          }}
        >
          <Tabs
            value={tab}
            onChange={(
              _event,
              value:
                | 'sale'
                | 'drinks'
                | 'wallet',
            ) => setTab(value)}
            sx={{ px: 2 }}
          >
            <Tab
              value="sale"
              icon={
                <PointOfSaleRounded />
              }
              iconPosition="start"
              label="Hızlı Satış"
            />

            <Tab
              value="drinks"
              icon={
                <LocalCafeRounded />
              }
              iconPosition="start"
              label="İçecekler & Stok"
            />

            <Tab
              value="wallet"
              icon={
                <AccountBalanceWalletRounded />
              }
              iconPosition="start"
              label="Üye Cüzdanı"
            />
          </Tabs>
        </Paper>

        {loading ? (
          <Box
            sx={{
              py: 10,
              display: 'flex',
              justifyContent:
                'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            <SectionCard
              title="Üye ve Nova Wallet"
              subtitle="Satış ve bakiye işlemi için üyeyi seçin."
              overflow="visible"
            >
              <Box sx={{ p: 2.5 }}>
                <Stack
                  direction={{
                    xs: 'column',
                    md: 'row',
                  }}
                  spacing={2}
                >
                  <TextField
                    fullWidth
                    value={memberSearch}
                    onChange={(event) =>
                      setMemberSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Üye adı veya telefon ara..."
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchRounded />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <TextField
                    select
                    fullWidth
                    label="Üye"
                    value={
                      selectedMemberId
                    }
                    onChange={(event) =>
                      selectMember(
                        event.target.value,
                      )
                    }
                  >
                    <MenuItem value="">
                      Üye seçin
                    </MenuItem>

                    {filteredMembers.map(
                      (member) => (
                        <MenuItem
                          key={member.id}
                          value={String(
                            member.id,
                          )}
                        >
                          {memberName(
                            member,
                          )}
                          {member.phone
                            ? ` — ${member.phone}`
                            : ''}
                        </MenuItem>
                      ),
                    )}
                  </TextField>
                </Stack>

                {wallet && (
                  <Alert
                    severity="success"
                    sx={{ mt: 2 }}
                  >
                    {wallet.member.fullName}
                    {' — '}
                    Nova Wallet:{' '}
                    <strong>
                      {formatMoney(
                        wallet.wallet
                          .balance,
                      )}
                    </strong>
                  </Alert>
                )}
              </Box>
            </SectionCard>

            {tab === 'sale' && (
              <Box sx={{ mt: 3 }}>
                <SectionCard
                  title="Barkodla Hızlı Ekle"
                  subtitle="Barkodu okutun veya yazıp Enter'a basın."
                  overflow="visible"
                >
                  <Box sx={{ p: 2.5 }}>
                    <TextField
                      fullWidth
                      autoFocus
                      value={barcode}
                      onChange={(event) =>
                        setBarcode(
                          event.target.value,
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                          'Enter'
                        ) {
                          event.preventDefault();
                          scanBarcode();
                        }
                      }}
                      placeholder="Barkod okut..."
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <QrCodeScannerRounded />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  </Box>
                </SectionCard>

                {favorites.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography
                      sx={{
                        mb: 1.5,
                        fontSize: 18,
                        fontWeight: 900,
                      }}
                    >
                      <StarRounded
                        sx={{
                          mr: 0.7,
                          verticalAlign:
                            'middle',
                        }}
                      />
                      Favori İçecekler
                    </Typography>

                    <ProductGrid
                      products={
                        favorites
                      }
                      addToCart={
                        addToCart
                      }
                    />
                  </Box>
                )}

                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  flexWrap="wrap"
                  sx={{
                    mt: 3,
                    mb: 2,
                  }}
                >
                  {categories.map(
                    (item) => (
                      <Chip
                        key={item.value}
                        clickable
                        color={
                          category ===
                          item.value
                            ? 'primary'
                            : 'default'
                        }
                        label={item.label}
                        onClick={() =>
                          setCategory(
                            item.value,
                          )
                        }
                      />
                    ),
                  )}
                </Stack>

                <TextField
                  fullWidth
                  value={productSearch}
                  onChange={(event) =>
                    setProductSearch(
                      event.target.value,
                    )
                  }
                  placeholder="İçecek ara..."
                  sx={{ mb: 2 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRounded />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      xl:
                        'minmax(0, 1fr) 390px',
                    },
                    gap: 3,
                  }}
                >
                  <ProductGrid
                    products={
                      filteredProducts
                    }
                    addToCart={
                      addToCart
                    }
                  />

                  <SectionCard
                    title="Sepet"
                    subtitle="Ödeme yalnızca Nova Wallet ile yapılır."
                    overflow="visible"
                  >
                    <Box sx={{ p: 2.5 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ mb: 2 }}
                      >
                        <ShoppingCartRounded color="primary" />
                        <Typography
                          sx={{
                            fontWeight: 800,
                          }}
                        >
                          {cart.length} içecek satırı
                        </Typography>
                      </Stack>

                      <Divider sx={{ mb: 2 }} />

                      {cart.length === 0 ? (
                        <Typography color="text.secondary">
                          Sepet boş.
                        </Typography>
                      ) : (
                        <Stack spacing={2}>
                          {cart.map(
                            (item) => (
                              <Stack
                                key={
                                  item.product
                                    .id
                                }
                                direction="row"
                                justifyContent="space-between"
                                spacing={2}
                              >
                                <Box>
                                  <Typography
                                    sx={{
                                      fontWeight: 800,
                                    }}
                                  >
                                    {
                                      item.product
                                        .name
                                    }
                                  </Typography>

                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {formatMoney(
                                      item.product
                                        .salePrice,
                                    )}
                                  </Typography>
                                </Box>

                                <TextField
                                  size="small"
                                  type="number"
                                  value={
                                    item.quantity
                                  }
                                  onChange={(event) =>
                                    changeQuantity(
                                      item.product
                                        .id,
                                      Number(
                                        event
                                          .target
                                          .value,
                                      ),
                                    )
                                  }
                                  sx={{
                                    width: 78,
                                  }}
                                />
                              </Stack>
                            ),
                          )}
                        </Stack>
                      )}

                      <Divider sx={{ my: 2 }} />

                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        sx={{ mb: 1 }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 700,
                          }}
                        >
                          Nova Wallet
                        </Typography>

                        <Typography
                          sx={{
                            fontWeight: 900,
                          }}
                        >
                          {formatMoney(
                            wallet?.wallet
                              .balance ||
                              0,
                          )}
                        </Typography>
                      </Stack>

                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        sx={{ mb: 2 }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 800,
                          }}
                        >
                          Toplam
                        </Typography>

                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 900,
                          }}
                        >
                          {formatMoney(
                            cartTotal,
                          )}
                        </Typography>
                      </Stack>

                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={
                          <PointOfSaleRounded />
                        }
                        onClick={() =>
                          void completeSale()
                        }
                        disabled={
                          saving ||
                          cart.length ===
                            0 ||
                          !selectedMemberId
                        }
                        sx={{
                          py: 1.35,
                          textTransform:
                            'none',
                        }}
                      >
                        Satışı Tamamla
                      </Button>
                    </Box>
                  </SectionCard>
                </Box>
              </Box>
            )}

            {tab === 'drinks' && (
              <Box sx={{ mt: 3 }}>
                <ProductGrid
                  products={products}
                  addToCart={() => {}}
                  management
                />
              </Box>
            )}

            {tab === 'wallet' && (
              <Box sx={{ mt: 3 }}>
                <SectionCard
                  title="Cüzdan Hareketleri"
                  subtitle="Yükleme ve içecek alışverişleri değiştirilemez."
                  overflow="visible"
                >
                  <Box sx={{ p: 3 }}>
                    {!wallet ? (
                      <Alert severity="info">
                        Cüzdan bilgileri için üye seçin.
                      </Alert>
                    ) : (
                      <Stack spacing={1.5}>
                        {(Array.isArray(wallet.transactions)
                          ? wallet.transactions
                          : [])
                          .slice(0, 30)
                          .map(
                            (transaction) => (
                              <Stack
                                key={
                                  transaction.id
                                }
                                direction="row"
                                justifyContent="space-between"
                                spacing={2}
                              >
                                <Box>
                                  <Typography
                                    sx={{
                                      fontWeight: 800,
                                    }}
                                  >
                                    {transaction.description ||
                                      transaction.type}
                                  </Typography>

                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {new Date(
                                      transaction.createdAt,
                                    ).toLocaleString(
                                      'tr-TR',
                                    )}
                                  </Typography>
                                </Box>

                                <Typography
                                  sx={{
                                    fontWeight: 900,
                                  }}
                                >
                                  {transaction.type ===
                                  'PURCHASE'
                                    ? '-'
                                    : '+'}
                                  {formatMoney(
                                    transaction.amount,
                                  )}
                                </Typography>
                              </Stack>
                            ),
                          )}
                      </Stack>
                    )}
                  </Box>
                </SectionCard>
              </Box>
            )}
          </>
        )}

        <Dialog
          open={productDialogOpen}
          onClose={() =>
            setProductDialogOpen(
              false,
            )
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Yeni İçecek
          </DialogTitle>

          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <TextField
                label="İçecek Adı"
                value={
                  productForm.name
                }
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    name:
                      event.target
                        .value,
                  })
                }
              />

              <TextField
                select
                label="Kategori"
                value={
                  productForm.category
                }
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    category:
                      event.target
                        .value as DrinkCategory,
                  })
                }
              >
                {categories
                  .filter(
                    (item) =>
                      item.value !==
                      'ALL',
                  )
                  .map((item) => (
                    <MenuItem
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </MenuItem>
                  ))}
              </TextField>

              <TextField
                label="Satış Fiyatı"
                type="number"
                value={
                  productForm.salePrice
                }
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    salePrice:
                      event.target
                        .value,
                  })
                }
              />

              <TextField
                label="Başlangıç Stoğu"
                type="number"
                value={
                  productForm.stockQuantity
                }
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    stockQuantity:
                      event.target
                        .value,
                  })
                }
              />

              <TextField
                label="Kritik Stok Sınırı"
                type="number"
                value={
                  productForm.lowStockLimit
                }
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    lowStockLimit:
                      event.target
                        .value,
                  })
                }
              />

              <TextField
                label="Barkod"
                value={
                  productForm.barcode
                }
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    barcode:
                      event.target
                        .value,
                  })
                }
              />
            </Stack>
          </DialogContent>

          <DialogActions
            sx={{ p: 3 }}
          >
            <Button
              onClick={() =>
                setProductDialogOpen(
                  false,
                )
              }
            >
              Vazgeç
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void createProduct()
              }
              disabled={saving}
            >
              Kaydet
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={topUpDialogOpen}
          onClose={() =>
            setTopUpDialogOpen(
              false,
            )
          }
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>
            Nova Wallet Bakiye Yükle
          </DialogTitle>

          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <Alert severity="info">
                {selectedMember
                  ? memberName(
                      selectedMember,
                    )
                  : 'Üye seçilmedi'}
              </Alert>

              <TextField
                label="Yüklenecek Tutar"
                type="number"
                value={topUpAmount}
                onChange={(event) =>
                  setTopUpAmount(
                    event.target
                      .value,
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
                setTopUpDialogOpen(
                  false,
                )
              }
            >
              Vazgeç
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void topUpWallet()
              }
              disabled={saving}
            >
              Bakiye Yükle
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={Boolean(message)}
          autoHideDuration={4000}
          onClose={() =>
            setMessage('')
          }
        >
          <Alert
            variant="filled"
            severity={severity}
            onClose={() =>
              setMessage('')
            }
          >
            {message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}

function ProductGrid({
  products,
  addToCart,
  management = false,
}: {
  products: Product[];
  addToCart: (
    product: Product,
  ) => void;
  management?: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm:
            'repeat(2, minmax(0, 1fr))',
          lg:
            'repeat(3, minmax(0, 1fr))',
        },
        gap: 2,
      }}
    >
      {products.map(
        (product) => (
          <Card
            key={product.id}
            elevation={0}
            sx={{
              border:
                '1px solid #e4e7ec',
              borderRadius: 2.5,
            }}
          >
            <CardActionArea
              disabled={management}
              onClick={() =>
                addToCart(product)
              }
            >
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 900,
                      }}
                    >
                      {product.name}
                    </Typography>

                    <Typography
                      variant="h6"
                      sx={{
                        mt: 0.8,
                        fontWeight: 900,
                      }}
                    >
                      {formatMoney(
                        product.salePrice,
                      )}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      color: '#1468f3',
                    }}
                  >
                    {categoryIcon(
                      product.category,
                    )}
                  </Box>
                </Stack>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 2 }}
                >
                  <Chip
                    size="small"
                    color={
                      product.stockQuantity <=
                      product.lowStockLimit
                        ? 'warning'
                        : 'success'
                    }
                    label={`Stok: ${product.stockQuantity}`}
                  />

                  <Chip
                    size="small"
                    variant="outlined"
                    label={
                      categories.find(
                        (item) =>
                          item.value ===
                          product.category,
                      )?.label ||
                      'Diğer'
                    }
                  />
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ),
      )}
    </Box>
  );
}
