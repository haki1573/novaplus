import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import TodayRoundedIcon from "@mui/icons-material/TodayRounded";
import DateRangeRoundedIcon from "@mui/icons-material/DateRangeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";

import { Sidebar } from "../components/Sidebar";
import { PageHeader } from "../components/ui/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { api } from "../services/api";

type FinanceType = "income" | "expense";

type FinanceCategory =
  | "MEMBERSHIP"
  | "CAFE"
  | "CARD"
  | "QR"
  | "WALLET"
  | "SMS"
  | "RENT"
  | "SALARY"
  | "ELECTRICITY"
  | "WATER"
  | "TAX"
  | "SUPPLIES"
  | "OTHER";

type PeriodKey =
  | "today"
  | "week"
  | "month";

type FinanceItem = {
  id: number;
  title: string;
  amount: number;
  type: FinanceType;
  category: FinanceCategory;
  description?: string | null;
  createdAt: string;
};

type FinancePage = {
  items: FinanceItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type PeriodSummary = {
  period: PeriodKey;
  start: string;
  end: string;
  recordCount: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
};

type FinanceOverview = {
  today: PeriodSummary;
  week: PeriodSummary;
  month: PeriodSummary;
  allTime: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
};

type CategoryDistributionItem = {
  category: FinanceCategory;
  amount: number;
};

type CategoryDistribution = {
  period: PeriodKey;
  start: string;
  end: string;
  income: CategoryDistributionItem[];
  expense: CategoryDistributionItem[];
};

const categoryLabels: Record<
  FinanceCategory,
  string
> = {
  MEMBERSHIP: "Üyelik",
  CAFE: "Kafe",
  CARD: "Kart",
  QR: "QR",
  WALLET: "Cüzdan",
  SMS: "SMS",
  RENT: "Kira",
  SALARY: "Personel",
  ELECTRICITY: "Elektrik",
  WATER: "Su",
  TAX: "Vergi",
  SUPPLIES: "Sarf Malzeme",
  OTHER: "Diğer",
};

const incomeCategories:
  FinanceCategory[] = [
    "MEMBERSHIP",
    "CAFE",
    "CARD",
    "QR",
    "WALLET",
    "SMS",
    "OTHER",
  ];

const expenseCategories:
  FinanceCategory[] = [
    "RENT",
    "SALARY",
    "ELECTRICITY",
    "WATER",
    "TAX",
    "SUPPLIES",
    "OTHER",
  ];

const emptyForm = {
  title: "",
  amount: "",
  type: "income" as FinanceType,
  category: "OTHER" as FinanceCategory,
  description: "",
};

const emptyPeriodSummary = (
  period: PeriodKey,
): PeriodSummary => ({
  period,
  start: "",
  end: "",
  recordCount: 0,
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
});

const emptyOverview: FinanceOverview = {
  today: emptyPeriodSummary("today"),
  week: emptyPeriodSummary("week"),
  month: emptyPeriodSummary("month"),
  allTime: {
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  },
};

export function Finance() {
  const [records, setRecords] =
    useState<FinanceItem[]>([]);

  const [overview, setOverview] =
    useState<FinanceOverview>(
      emptyOverview,
    );

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [totalRecords, setTotalRecords] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [
    distribution,
    setDistribution,
  ] = useState<CategoryDistribution>({
    period: "month",
    start: "",
    end: "",
    income: [],
    expense: [],
  });

  const [period, setPeriod] =
    useState<PeriodKey>("month");

  const [search, setSearch] =
    useState("");

  const [filterType, setFilterType] =
    useState<
      "all" | FinanceType
    >("all");

  const [
    filterCategory,
    setFilterCategory,
  ] = useState<
    "all" | FinanceCategory
  >("all");

  const [open, setOpen] =
    useState(false);

  const [
    editingRecord,
    setEditingRecord,
  ] = useState<
    FinanceItem | null
  >(null);

  const [form, setForm] =
    useState(emptyForm);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  async function loadFinance(
    selectedPeriod: PeriodKey =
      period,
  ) {
    try {
      setLoading(true);

      const [
        recordsResponse,
        overviewResponse,
        distributionResponse,
      ] = await Promise.all([
        api.get<FinancePage>(
          "/finance",
          {
            params: {
              page: page + 1,
              pageSize,
              search: debouncedSearch,
              type: filterType,
              category: filterCategory,
            },
          },
        ),
        api.get<FinanceOverview>(
          "/finance/overview",
        ),
        api.get<CategoryDistribution>(
          `/finance/category-distribution?period=${selectedPeriod}`,
        ),
      ]);

      setRecords(recordsResponse.data.items);
      setTotalRecords(recordsResponse.data.total);

      setOverview(
        overviewResponse.data,
      );

      setDistribution(
        distributionResponse.data,
      );

      setError("");
    } catch (requestError) {
      console.error(
        "Finans verileri alınamadı:",
        requestError,
      );

      setError(
        "Finans verileri alınamadı.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void loadFinance(period);
  }, [
    page,
    pageSize,
    debouncedSearch,
    filterType,
    filterCategory,
  ]);

  const filteredRecords = records;

  const formatMoney = (
    value: number,
  ) =>
    new Intl.NumberFormat(
      "tr-TR",
      {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 2,
      },
    ).format(
      Number(value) || 0,
    );

  const closeDialog = () => {
    setOpen(false);
    setEditingRecord(null);
    setForm(emptyForm);
    setError("");
  };

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  };

  const handleOpenEdit = (
    record: FinanceItem,
  ) => {
    setEditingRecord(record);

    setForm({
      title: record.title,
      amount: String(
        record.amount,
      ),
      type: record.type,
      category:
        record.category ||
        "OTHER",
      description:
        record.description ||
        "",
    });

    setError("");
    setOpen(true);
  };

  const handleTypeChange = (
    type: FinanceType,
  ) => {
    const allowed =
      type === "income"
        ? incomeCategories
        : expenseCategories;

    setForm((current) => ({
      ...current,
      type,
      category:
        allowed.includes(
          current.category,
        )
          ? current.category
          : "OTHER",
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError(
        "Başlık alanı zorunludur.",
      );
      return;
    }

    const amount =
      Number(form.amount);

    if (
      !Number.isFinite(
        amount,
      ) ||
      amount <= 0
    ) {
      setError(
        "Tutar sıfırdan büyük olmalıdır.",
      );
      return;
    }

    const payload = {
      title:
        form.title.trim(),
      amount,
      type: form.type,
      category:
        form.category,
      description:
        form.description.trim(),
    };

    try {
      if (editingRecord) {
        await api.put(
          `/finance/${editingRecord.id}`,
          payload,
        );
      } else {
        await api.post(
          "/finance",
          payload,
        );
      }

      closeDialog();
      await loadFinance(period);
    } catch (requestError) {
      console.error(
        "Finans kaydı kaydedilemedi:",
        requestError,
      );

      setError(
        "Finans kaydı kaydedilemedi.",
      );
    }
  };

  const handleDelete = async (
    id: number,
  ) => {
    const confirmed =
      window.confirm(
        "Bu finans kaydını silmek istediğine emin misin?",
      );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/finance/${id}`,
      );

      await loadFinance(period);
    } catch (requestError) {
      console.error(
        "Finans kaydı silinemedi:",
        requestError,
      );

      window.alert(
        "Finans kaydı silinemedi.",
      );
    }
  };

  const handlePeriodChange =
    async (
      selectedPeriod: PeriodKey,
    ) => {
      setPeriod(selectedPeriod);

      try {
        const response =
          await api.get<CategoryDistribution>(
            `/finance/category-distribution?period=${selectedPeriod}`,
          );

        setDistribution(
          response.data,
        );
      } catch {
        setError(
          "Kategori dağılımı alınamadı.",
        );
      }
    };

  const periodCards = [
    {
      title: "Bugün",
      icon:
        <TodayRoundedIcon />,
      data: overview.today,
    },
    {
      title: "Bu Hafta",
      icon:
        <DateRangeRoundedIcon />,
      data: overview.week,
    },
    {
      title: "Bu Ay",
      icon:
        <CalendarMonthRoundedIcon />,
      data: overview.month,
    },
  ];

  const availableFormCategories =
    form.type === "income"
      ? incomeCategories
      : expenseCategories;

  const maxIncome =
    Math.max(
      1,
      ...distribution.income.map(
        (item) => item.amount,
      ),
    );

  const maxExpense =
    Math.max(
      1,
      ...distribution.expense.map(
        (item) => item.amount,
      ),
    );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        background: "#f6f8fc",
      }}
    >
      <Sidebar />

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          px: {
            xs: 2,
            md: 3.5,
          },
          py: {
            xs: 2,
            md: 3,
          },
          overflow: "hidden",
        }}
      >
        <PageHeader
          eyebrow="NOVAPLUS+"
          title="Finans Merkezi"
          subtitle="Gelir, gider ve işletmenizin net durumunu tek ekrandan takip edin."
          icon={
            <AccountBalanceWalletRoundedIcon />
          }
          actions={
            <Button
              variant="contained"
              startIcon={
                <AddRoundedIcon />
              }
              onClick={
                handleOpenAdd
              }
              sx={{
                px: 2.5,
                py: 1.1,
                fontWeight: 800,
              }}
            >
              Yeni Finans Kaydı
            </Button>
          }
        />

        {error && !open && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: 2,
            }}
          >
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(3, minmax(0, 1fr))",
            },
            gap: 1.4,
            mb: 2,
          }}
        >
          {periodCards.map(
            (item) => (
              <Paper
                key={item.title}
                elevation={0}
                sx={{
                  p: 1.5,
                  minHeight: 150,
                  borderRadius: 2,
                  border:
                    "1px solid #e8edf5",
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 1.1 }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 2,
                      display: "grid",
                      placeItems:
                        "center",
                      bgcolor:
                        "#eff6ff",
                      color:
                        "#2563eb",
                    }}
                  >
                    {item.icon}
                  </Box>

                  <Typography
                    sx={{
                      fontSize: 15,
                      fontWeight: 900,
                    }}
                  >
                    {item.title}
                  </Typography>
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, minmax(0, 1fr))",
                    gap: 0.8,
                  }}
                >
                  <SummaryValue
                    label="Gelir"
                    value={formatMoney(
                      item.data
                        .totalIncome,
                    )}
                    tone="success"
                  />

                  <SummaryValue
                    label="Gider"
                    value={formatMoney(
                      item.data
                        .totalExpense,
                    )}
                    tone="error"
                  />

                  <SummaryValue
                    label="Net"
                    value={formatMoney(
                      item.data.balance,
                    )}
                    tone={
                      item.data
                        .balance >= 0
                        ? "primary"
                        : "error"
                    }
                  />
                </Box>
              </Paper>
            ),
          )}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
            },
            gap: 1.4,
            mb: 2,
          }}
        >
          <DistributionCard
            title="Gelir Dağılımı"
            items={
              distribution.income
            }
            maxValue={maxIncome}
            formatMoney={
              formatMoney
            }
          />

          <DistributionCard
            title="Gider Dağılımı"
            items={
              distribution.expense
            }
            maxValue={maxExpense}
            formatMoney={
              formatMoney
            }
          />
        </Box>

        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={1}
          sx={{ mb: 2 }}
        >
          {[
            {
              value:
                "today" as PeriodKey,
              label: "Bugün",
            },
            {
              value:
                "week" as PeriodKey,
              label: "Bu Hafta",
            },
            {
              value:
                "month" as PeriodKey,
              label: "Bu Ay",
            },
          ].map((item) => (
            <Button
              key={item.value}
              variant={
                period ===
                item.value
                  ? "contained"
                  : "outlined"
              }
              onClick={() =>
                void handlePeriodChange(
                  item.value,
                )
              }
            >
              {item.label}
            </Button>
          ))}
        </Stack>

        <SectionCard
          title="Finans Hareketleri"
          subtitle={`${filteredRecords.length} kayıt görüntüleniyor`}
          actions={
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
              }}
            >
              <TextField
                placeholder="Başlık veya açıklama ara..."
                size="small"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                sx={{
                  width: {
                    xs: "100%",
                    sm: 290,
                  },
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon
                          sx={{
                            color:
                              "#94a3b8",
                          }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                select
                label="Kayıt Türü"
                size="small"
                value={filterType}
                onChange={(event) =>
                  setFilterType(
                    event.target
                      .value as
                      | "all"
                      | FinanceType,
                  )
                }
                sx={{
                  width: 160,
                }}
              >
                <MenuItem value="all">
                  Tümü
                </MenuItem>
                <MenuItem value="income">
                  Gelir
                </MenuItem>
                <MenuItem value="expense">
                  Gider
                </MenuItem>
              </TextField>

              <TextField
                select
                label="Kategori"
                size="small"
                value={
                  filterCategory
                }
                onChange={(event) =>
                  setFilterCategory(
                    event.target
                      .value as
                      | "all"
                      | FinanceCategory,
                  )
                }
                sx={{
                  width: 180,
                }}
              >
                <MenuItem value="all">
                  Tüm Kategoriler
                </MenuItem>

                {Object.entries(
                  categoryLabels,
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <MenuItem
                      key={value}
                      value={value}
                    >
                      {label}
                    </MenuItem>
                  ),
                )}
              </TextField>
            </Box>
          }
        >
          <Box
            sx={{
              width: "100%",
              overflowX: "auto",
            }}
          >
            <Table
              sx={{
                minWidth: 1080,
              }}
            >
              <TableHead>
                <TableRow
                  sx={{
                    background:
                      "#f8fafc",
                  }}
                >
                  {[
                    "İşlem",
                    "Kategori",
                    "Tür",
                    "Tutar",
                    "Açıklama",
                    "Tarih",
                    "İşlemler",
                  ].map(
                    (
                      title,
                      index,
                    ) => (
                      <TableCell
                        key={title}
                        align={
                          index === 6
                            ? "center"
                            : "left"
                        }
                        sx={{
                          py: 1.7,
                          color:
                            "#64748b",
                          fontSize: 12,
                          fontWeight: 900,
                          letterSpacing:
                            0.5,
                          textTransform:
                            "uppercase",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {title}
                      </TableCell>
                    ),
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredRecords.map(
                  (record) => (
                    <TableRow
                      key={record.id}
                      hover
                      sx={{
                        "&:last-child td":
                          {
                            borderBottom: 0,
                          },
                        "&:hover": {
                          backgroundColor:
                            "#f8fbff !important",
                        },
                      }}
                    >
                      <TableCell
                        sx={{ py: 2 }}
                      >
                        <Box
                          sx={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 1.4,
                          }}
                        >
                          <Box
                            sx={{
                              width: 38,
                              height: 38,
                              borderRadius:
                                2.5,
                              display:
                                "grid",
                              placeItems:
                                "center",
                              color:
                                record.type ===
                                "income"
                                  ? "#16a34a"
                                  : "#dc2626",
                              background:
                                record.type ===
                                "income"
                                  ? "#ecfdf3"
                                  : "#fff1f2",
                            }}
                          >
                            <ReceiptLongRoundedIcon fontSize="small" />
                          </Box>

                          <Typography
                            sx={{
                              fontWeight: 800,
                              color:
                                "#172033",
                            }}
                          >
                            {record.title}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            categoryLabels[
                              record
                                .category ||
                                "OTHER"
                            ]
                          }
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={
                            record.type ===
                            "income"
                              ? "Gelir"
                              : "Gider"
                          }
                          size="small"
                          sx={{
                            fontWeight: 800,
                            color:
                              record.type ===
                              "income"
                                ? "#15803d"
                                : "#b91c1c",
                            background:
                              record.type ===
                              "income"
                                ? "#dcfce7"
                                : "#fee2e2",
                          }}
                        />
                      </TableCell>

                      <TableCell
                        sx={{
                          fontWeight: 900,
                          whiteSpace:
                            "nowrap",
                          color:
                            record.type ===
                            "income"
                              ? "#16a34a"
                              : "#dc2626",
                        }}
                      >
                        {record.type ===
                        "income"
                          ? "+"
                          : "-"}
                        {formatMoney(
                          record.amount,
                        )}
                      </TableCell>

                      <TableCell
                        sx={{
                          color:
                            "#64748b",
                          maxWidth: 360,
                        }}
                      >
                        <Typography
                          noWrap
                          title={
                            record.description ||
                            "-"
                          }
                        >
                          {record.description ||
                            "-"}
                        </Typography>
                      </TableCell>

                      <TableCell
                        sx={{
                          color:
                            "#475569",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {new Date(
                          record.createdAt,
                        ).toLocaleString(
                          "tr-TR",
                        )}
                      </TableCell>

                      <TableCell
                        align="center"
                        sx={{
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        <Tooltip title="Düzenle">
                          <IconButton
                            onClick={() =>
                              handleOpenEdit(
                                record,
                              )
                            }
                            sx={{
                              color:
                                "#2563eb",
                              background:
                                "#eff6ff",
                              mr: 0.8,
                            }}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Sil">
                          <IconButton
                            onClick={() =>
                              handleDelete(
                                record.id,
                              )
                            }
                            sx={{
                              color:
                                "#dc2626",
                              background:
                                "#fff1f2",
                            }}
                          >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ),
                )}

                {filteredRecords.length ===
                  0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                    >
                      <Box
                        sx={{
                          py: 8,
                          textAlign:
                            "center",
                        }}
                      >
                        <ReceiptLongRoundedIcon
                          sx={{
                            fontSize:
                              48,
                            color:
                              "#cbd5e1",
                          }}
                        />

                        <Typography
                          sx={{
                            mt: 1,
                            fontWeight:
                              800,
                            color:
                              "#475569",
                          }}
                        >
                          Finans kaydı bulunamadı
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </SectionCard>

        <Box
          sx={{
            mt: 3,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md:
                "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          <TotalCard
            title="Toplam Gelir"
            value={formatMoney(
              overview.allTime
                .totalIncome,
            )}
            icon={
              <TrendingUpRoundedIcon />
            }
            tone="success"
          />

          <TotalCard
            title="Toplam Gider"
            value={formatMoney(
              overview.allTime
                .totalExpense,
            )}
            icon={
              <TrendingDownRoundedIcon />
            }
            tone="error"
          />

          <TotalCard
            title="Kasa Durumu"
            value={formatMoney(
              overview.allTime
                .balance,
            )}
            icon={
              <AccountBalanceWalletRoundedIcon />
            }
            tone={
              overview.allTime
                .balance >= 0
                ? "primary"
                : "error"
            }
          />
        </Box>

        <Paper
          elevation={0}
          sx={{
            mt: 2,
            borderRadius: 2,
            border: "1px solid #e8edf5",
          }}
        >
          <TablePagination
            component="div"
            count={totalRecords}
            page={page}
            onPageChange={(_event, nextPage) => setPage(nextPage)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100, 200]}
            labelRowsPerPage="Sayfa başına"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} / ${count}`
            }
          />
        </Paper>
      </Box>

      <Dialog
        open={open}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
          }}
        >
          {editingRecord
            ? "Finans Kaydını Düzenle"
            : "Yeni Finans Kaydı"}
        </DialogTitle>

        <DialogContent
          sx={{
            display: "flex",
            flexDirection:
              "column",
            gap: 2,
            pt: "12px !important",
          }}
        >
          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          <TextField
            label="Başlık"
            value={form.title}
            onChange={(event) =>
              setForm({
                ...form,
                title:
                  event.target
                    .value,
              })
            }
            fullWidth
          />

          <TextField
            select
            label="Kayıt Türü"
            value={form.type}
            onChange={(event) =>
              handleTypeChange(
                event.target
                  .value as FinanceType,
              )
            }
            fullWidth
          >
            <MenuItem value="income">
              Gelir
            </MenuItem>
            <MenuItem value="expense">
              Gider
            </MenuItem>
          </TextField>

          <TextField
            select
            label="Kategori"
            value={form.category}
            onChange={(event) =>
              setForm({
                ...form,
                category:
                  event.target
                    .value as FinanceCategory,
              })
            }
            fullWidth
          >
            {availableFormCategories.map(
              (category) => (
                <MenuItem
                  key={category}
                  value={category}
                >
                  {
                    categoryLabels[
                      category
                    ]
                  }
                </MenuItem>
              ),
            )}
          </TextField>

          <TextField
            label="Tutar"
            type="number"
            value={form.amount}
            onChange={(event) =>
              setForm({
                ...form,
                amount:
                  event.target
                    .value,
              })
            }
            slotProps={{
              htmlInput: {
                min: 0,
                step: 0.01,
              },
            }}
            fullWidth
          />

          <TextField
            label="Açıklama"
            value={
              form.description
            }
            onChange={(event) =>
              setForm({
                ...form,
                description:
                  event.target
                    .value,
              })
            }
            multiline
            minRows={3}
            fullWidth
          />
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2.5,
          }}
        >
          <Button
            onClick={
              closeDialog
            }
          >
            İptal
          </Button>

          <Button
            variant="contained"
            onClick={
              handleSave
            }
            sx={{
              borderRadius: 2.5,
            }}
          >
            {editingRecord
              ? "Güncelle"
              : "Kaydet"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function SummaryValue({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone:
    | "success"
    | "error"
    | "primary";
}) {
  const color =
    tone === "success"
      ? "#16a34a"
      : tone === "error"
        ? "#dc2626"
        : "#2563eb";

  return (
    <Box>
      <Typography
        sx={{
          color: "#94a3b8",
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          mt: 0.35,
          color,
          fontSize: 14,
          fontWeight: 950,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function DistributionCard({
  title,
  items,
  maxValue,
  formatMoney,
}: {
  title: string;
  items:
    CategoryDistributionItem[];
  maxValue: number;
  formatMoney:
    (value: number) => string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.6,
        borderRadius: 2,
        border:
          "1px solid #e8edf5",
      }}
    >
      <Typography
        sx={{
          mb: 1.5,
          fontSize: 18,
          fontWeight: 900,
        }}
      >
        {title}
      </Typography>

      <Stack spacing={1.4}>
        {items.map((item) => (
          <Box
            key={item.category}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              sx={{ mb: 0.5 }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {
                  categoryLabels[
                    item.category
                  ]
                }
              </Typography>

              <Typography
                sx={{
                  color: "#64748b",
                  fontSize: 12,
                }}
              >
                {formatMoney(
                  item.amount,
                )}
              </Typography>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={
                (item.amount /
                  maxValue) *
                100
              }
              sx={{
                height: 7,
                borderRadius: 99,
              }}
            />
          </Box>
        ))}

        {items.length === 0 && (
          <Alert severity="info">
            Bu dönem için kayıt bulunmuyor.
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

function TotalCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone:
    | "success"
    | "error"
    | "primary";
}) {
  const color =
    tone === "success"
      ? "#16a34a"
      : tone === "error"
        ? "#dc2626"
        : "#2563eb";

  const background =
    tone === "success"
      ? "#ecfdf3"
      : tone === "error"
        ? "#fff1f2"
        : "#eff6ff";

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border:
          "1px solid #e8edf5",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Box>
          <Typography
            sx={{
              color: "#64748b",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {title}
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              color,
              fontSize: 22,
              fontWeight: 950,
            }}
          >
            {value}
          </Typography>
        </Box>

        <Box
          sx={{
            width: 44,
            height: 44,
            display: "grid",
            placeItems: "center",
            borderRadius: 2,
            color,
            bgcolor: background,
          }}
        >
          {icon}
        </Box>
      </Stack>
    </Paper>
  );
}
