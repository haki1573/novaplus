import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
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

import {
  AutorenewRounded,
  CreditCardRounded,
  DeleteRounded,
  EditRounded,
  PersonAddAlt1Rounded,
  QrCode2Rounded,
  SearchRounded,
  WarningAmberRounded,
} from "@mui/icons-material";

import { Sidebar } from "../components/Sidebar";
import { PageHeader } from "../components/ui/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { api } from "../services/api";

type PackageItem = {
  id: string;
  name: string;
  price: number;
  durationMonths: number;
};

type Member = {
  id: number;
  name?: string;
  fullName: string;
  phone: string;
  email: string;
  status: string;
  packageId?: string | null;
  membershipStart?: string | null;
  membershipEnd?: string | null;
  package?: PackageItem | null;
  walletBalance?: number | string | null;
  cardCode?: string | null;
  qrCode?: string | null;
  remainingDays?: number | null;
  lastCheckInAt?: string | null;
  daysSinceLastCheckIn?: number | null;
  expiresWithinSevenDays?: boolean;
  inactiveForThirtyDays?: boolean;
};

type MemberPage = {
  items: Member[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type MemberFilter =
  | "all"
  | "active"
  | "expired"
  | "expiring"
  | "inactive"
  | "no-card"
  | "no-qr"
  | "wallet";

const emptyForm = {
  fullName: "",
  phone: "",
  email: "",
  packageId: "",
};

function getInitials(
  name: string,
) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toLocaleUpperCase(
          "tr-TR",
        ),
    )
    .join("");
}

export function Members() {
  const [
    members,
    setMembers,
  ] = useState<Member[]>([]);

  const [
    packages,
    setPackages,
  ] = useState<PackageItem[]>([]);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [totalMembers, setTotalMembers] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [search, setSearch] =
    useState("");

  const [
    memberFilter,
    setMemberFilter,
  ] = useState<MemberFilter>("all");

  const [open, setOpen] =
    useState(false);

  const [
    editingMember,
    setEditingMember,
  ] = useState<Member | null>(
    null,
  );

  const [form, setForm] =
    useState(emptyForm);

  const [error, setError] =
    useState("");

  async function loadMembers(
    selectedPage = page,
    selectedPageSize = pageSize,
    selectedSearch = debouncedSearch,
    selectedFilter = memberFilter,
  ) {
    try {
      const response = await api.get<MemberPage>(
        "/members",
        {
          params: {
            page: selectedPage + 1,
            pageSize: selectedPageSize,
            search: selectedSearch,
            status:
              selectedFilter,
          },
        },
      );

      setMembers(response.data.items);
      setTotalMembers(response.data.total);
      setError("");
    } catch (requestError) {
      console.error("Üyeler alınamadı:", requestError);
      setError("Üyeler alınamadı.");
    }
  }

  async function loadPackages() {
    try {
      const response =
        await api.get<
          PackageItem[]
        >("/packages");

      setPackages(
        response.data,
      );
    } catch (requestError) {
      console.error(
        "Paketler alınamadı:",
        requestError,
      );
    }
  }

  useEffect(() => {
    void loadPackages();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void loadMembers(
      page,
      pageSize,
      debouncedSearch,
      memberFilter,
    );
  }, [page, pageSize, debouncedSearch, memberFilter]);

  const getPackageName = (
    member: Member,
  ) =>
    member.package?.name ||
    packages.find(
      (item) =>
        item.id ===
        member.packageId,
    )?.name ||
    "Paketsiz";

  const getWalletBalance = (
    member: Member,
  ) =>
    Number(
      member.walletBalance || 0,
    ) || 0;

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
    ).format(value);

  const formatDate = (
    value?: string | null,
  ) =>
    value
      ? new Date(
          value,
        ).toLocaleDateString(
          "tr-TR",
        )
      : "-";

  const getRemainingDays = (
    member: Member,
  ) => {
    if (
      member.remainingDays !==
      undefined
    ) {
      return member.remainingDays;
    }

    if (!member.membershipEnd) {
      return null;
    }

    return Math.ceil(
      (
        new Date(
          member.membershipEnd,
        ).getTime() -
        Date.now()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        ),
    );
  };

  const getMembershipState = (
    member: Member,
  ) => {
    const remainingDays =
      getRemainingDays(member);

    if (
      member.status === "Pasif" ||
      (
        remainingDays !== null &&
        remainingDays < 0
      )
    ) {
      return {
        label: "Süresi Doldu",
        color:
          "error" as const,
        expired: true,
      };
    }

    if (remainingDays === 0) {
      return {
        label: "Bugün Bitiyor",
        color:
          "error" as const,
        expired: false,
      };
    }

    if (
      remainingDays !== null &&
      remainingDays <= 3
    ) {
      return {
        label:
          `${remainingDays} Gün Kaldı`,
        color:
          "error" as const,
        expired: false,
      };
    }

    if (
      remainingDays !== null &&
      remainingDays <= 7
    ) {
      return {
        label:
          `${remainingDays} Gün Kaldı`,
        color:
          "warning" as const,
        expired: false,
      };
    }

    return {
      label: "Aktif",
      color:
        "success" as const,
      expired: false,
    };
  };

  const getLastCheckInLabel = (
    member: Member,
  ) => {
    if (!member.lastCheckInAt) {
      return "Hiç giriş yapmadı";
    }

    const days =
      member.daysSinceLastCheckIn ??
      Math.max(
        0,
        Math.floor(
          (
            Date.now() -
            new Date(
              member.lastCheckInAt,
            ).getTime()
          ) /
            (
              1000 *
              60 *
              60 *
              24
            ),
        ),
      );

    if (days === 0) {
      return "Bugün";
    }

    if (days === 1) {
      return "Dün";
    }

    return `${days} gün önce`;
  };

  const filteredMembers = members;

  const summary =
    useMemo(() => {
      const active =
        members.filter(
          (member) =>
            !getMembershipState(
              member,
            ).expired,
        ).length;

      const expired =
        members.length -
        active;

      const withCard =
        members.filter(
          (member) =>
            Boolean(
              member.cardCode,
            ),
        ).length;

      const withQr =
        members.filter(
          (member) =>
            Boolean(
              member.qrCode,
            ),
        ).length;

      return {
        active,
        expired,
        withCard,
        withQr,
      };
    }, [members]);

  const summaryCards = [
    {
      label: "Toplam",
      value: totalMembers,
    },
    {
      label: "Aktif",
      value: summary.active,
    },
    {
      label: "Süresi Dolan",
      value: summary.expired,
    },
    {
      label: "Kartlı",
      value: summary.withCard,
    },
    {
      label: "QR'lı",
      value: summary.withQr,
    },
  ];

  const resetForm = () => {
    setForm(emptyForm);
    setEditingMember(null);
    setOpen(false);
    setError("");
  };

  const handleOpenAdd = () => {
    setForm(emptyForm);
    setEditingMember(null);
    setError("");
    setOpen(true);
  };

  const handleOpenEdit = (
    member: Member,
  ) => {
    setEditingMember(member);

    setForm({
      fullName:
        member.fullName || "",
      phone:
        member.phone || "",
      email:
        member.email || "",
      packageId:
        member.packageId || "",
    });

    setError("");
    setOpen(true);
  };

  const handleSaveMember =
    async () => {
      if (
        !form.fullName.trim()
      ) {
        setError(
          "Ad soyad alanı zorunludur.",
        );
        return;
      }

      const payload = {
        name:
          form.fullName.trim(),
        fullName:
          form.fullName.trim(),
        phone:
          form.phone.trim(),
        email:
          form.email.trim(),
        packageId:
          form.packageId ||
          null,
      };

      try {
        if (editingMember) {
          await api.put(
            `/members/${editingMember.id}`,
            payload,
          );
        } else {
          await api.post(
            "/members",
            payload,
          );
        }

        resetForm();
        await loadMembers(page, pageSize, debouncedSearch, memberFilter);
      } catch (requestError) {
        console.error(
          "Üye kaydedilemedi:",
          requestError,
        );

        setError(
          "Üye kaydedilemedi.",
        );
      }
    };

  const handleDeleteMember =
    async (id: number) => {
      if (
        !window.confirm(
          "Bu üyeyi silmek istediğine emin misin?",
        )
      ) {
        return;
      }

      try {
        await api.delete(
          `/members/${id}`,
        );

        await loadMembers(page, pageSize, debouncedSearch, memberFilter);
      } catch (requestError) {
        console.error(
          "Üye silinemedi:",
          requestError,
        );

        window.alert(
          "Üye silinemedi.",
        );
      }
    };

  const handleRenewMembership =
    async (
      member: Member,
    ) => {
      const packageName =
        member.package?.name ||
        "mevcut paket";

      if (
        !window.confirm(
          `${member.fullName} adlı üyenin ${packageName} üyeliği yenilensin mi?\n\nPaket ücreti Finans bölümüne gelir olarak eklenecek.`,
        )
      ) {
        return;
      }

      try {
        await api.post(
          `/members/${member.id}/renew`,
        );

        await loadMembers(page, pageSize, debouncedSearch, memberFilter);

        window.alert(
          "Üyelik başarıyla yenilendi.",
        );
      } catch (requestError) {
        console.error(
          "Üyelik yenilenemedi:",
          requestError,
        );

        window.alert(
          "Üyelik yenilenemedi. Üyenin paketini kontrol et.",
        );
      }
    };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        background: "#f4f7fb",
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
          title="Üyeler"
          subtitle="Üyelik durumunu, son girişleri ve erişim bilgilerini yönetin."
          icon={
            <PersonAddAlt1Rounded />
          }
          actions={
            <Button
              variant="contained"
              startIcon={
                <PersonAddAlt1Rounded />
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
              Yeni Üye
            </Button>
          }
        />

        {error && !open && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              md: "repeat(5, minmax(0, 1fr))",
            },
            gap: 1.2,
            mb: 2,
          }}
        >
          {summaryCards.map(
            (card) => (
              <Paper
                key={card.label}
                elevation={0}
                sx={{
                  p: 1.4,
                  borderRadius: 2,
                  border:
                    "1px solid #e8edf5",
                }}
              >
                <Typography
                  sx={{
                    color:
                      "#64748b",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {card.label}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.35,
                    color:
                      "#0f172a",
                    fontSize: 22,
                    fontWeight: 950,
                  }}
                >
                  {card.value}
                </Typography>
              </Paper>
            ),
          )}
        </Box>

        <SectionCard
          title="Üye Listesi"
          subtitle={`${totalMembers} kayıt içinde bu sayfa görüntüleniyor`}
          padding={0}
        >
          <Box
            sx={{
              p: 2,
              borderBottom:
                "1px solid #edf1f7",
            }}
          >
            <Stack
              direction={{
                xs: "column",
                lg: "row",
              }}
              spacing={1.5}

            
            sx={{ justifyContent: 'space-between' }}>
              <TextField
                placeholder="Ad, telefon, e-posta, kart veya QR ara..."
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
                    lg: 390,
                  },
                }}
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
                size="small"
                label="Filtre"
                value={
                  memberFilter
                }
                onChange={(event) => {
                  setMemberFilter(
                    event.target
                      .value as MemberFilter,
                  );
                  setPage(0);
                }}
                sx={{
                  width: {
                    xs: "100%",
                    lg: 230,
                  },
                }}
              >
                <MenuItem value="all">
                  Tüm Üyeler
                </MenuItem>
                <MenuItem value="active">
                  Aktif
                </MenuItem>
                <MenuItem value="expired">
                  Süresi Dolan
                </MenuItem>
                <MenuItem value="expiring">
                  7 Gün İçinde Bitecek
                </MenuItem>
                <MenuItem value="inactive">
                  30 Gündür Gelmeyen
                </MenuItem>
                <MenuItem value="no-card">
                  Kartı Olmayan
                </MenuItem>
                <MenuItem value="no-qr">
                  QR'ı Olmayan
                </MenuItem>
                <MenuItem value="wallet">
                  Cüzdan Bakiyesi Olan
                </MenuItem>
              </TextField>
            </Stack>
          </Box>

          <Box
            sx={{
              overflowX: "auto",
            }}
          >
            <Table
              sx={{
                minWidth: 1280,
              }}
            >
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor:
                      "#f8fafc",
                  }}
                >
                  <TableCell>
                    Üye
                  </TableCell>
                  <TableCell>
                    Paket
                  </TableCell>
                  <TableCell>
                    Bitiş
                  </TableCell>
                  <TableCell>
                    Durum
                  </TableCell>
                  <TableCell>
                    Son Giriş
                  </TableCell>
                  <TableCell>
                    Kart / QR
                  </TableCell>
                  <TableCell>
                    Cüzdan
                  </TableCell>
                  <TableCell>
                    İletişim
                  </TableCell>
                  <TableCell align="center">
                    İşlemler
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredMembers.map(
                  (member) => {
                    const membership =
                      getMembershipState(
                        member,
                      );

                    const remainingDays =
                      getRemainingDays(
                        member,
                      );

                    return (
                      <TableRow
                        key={member.id}
                        hover
                      >
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1.3}

                          
                          sx={{ alignItems: 'center' }}>
                            <Avatar
                              sx={{
                                width: 38,
                                height: 38,
                                bgcolor:
                                  "#dbeafe",
                                color:
                                  "#1d4ed8",
                                fontWeight:
                                  900,
                              }}
                            >
                              {getInitials(
                                member.fullName ||
                                  "Üye",
                              )}
                            </Avatar>

                            <Box>
                              <Typography
                                sx={{
                                  fontWeight:
                                    850,
                                  color:
                                    "#0f172a",
                                }}
                              >
                                {
                                  member.fullName
                                }
                              </Typography>

                              <Typography
                                sx={{
                                  color:
                                    "#94a3b8",
                                  fontSize:
                                    11,
                                }}
                              >
                                Üye #
                                {member.id}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={getPackageName(
                              member,
                            )}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>

                        <TableCell>
                          <Typography
                            sx={{
                              fontSize:
                                13,
                              fontWeight:
                                700,
                            }}
                          >
                            {formatDate(
                              member.membershipEnd,
                            )}
                          </Typography>

                          <Typography
                            sx={{
                              color:
                                "#64748b",
                              fontSize:
                                11,
                            }}
                          >
                            {remainingDays ===
                            null
                              ? "Bitiş yok"
                              : remainingDays <
                                  0
                                ? "Süresi doldu"
                                : remainingDays ===
                                    0
                                  ? "Bugün bitiyor"
                                  : `${remainingDays} gün kaldı`}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={
                              membership.label
                            }
                            color={
                              membership.color
                            }
                            size="small"
                          />
                        </TableCell>

                        <TableCell>
                          <Typography
                            sx={{
                              fontSize:
                                13,
                              fontWeight:
                                700,
                            }}
                          >
                            {getLastCheckInLabel(
                              member,
                            )}
                          </Typography>

                          {member.lastCheckInAt && (
                            <Typography
                              sx={{
                                color:
                                  "#94a3b8",
                                fontSize:
                                  11,
                              }}
                            >
                              {formatDate(
                                member.lastCheckInAt,
                              )}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          <Stack
                            spacing={0.7}

                          
                          sx={{ alignItems: 'flex-start' }}>
                            <Chip
                              icon={
                                <CreditCardRounded />
                              }
                              label={
                                member.cardCode ||
                                "Kart yok"
                              }
                              size="small"
                              variant="outlined"
                              color={
                                member.cardCode
                                  ? "primary"
                                  : "default"
                              }
                            />

                            <Chip
                              icon={
                                <QrCode2Rounded />
                              }
                              label={
                                member.qrCode ||
                                "QR yok"
                              }
                              size="small"
                              variant="outlined"
                              color={
                                member.qrCode
                                  ? "secondary"
                                  : "default"
                              }
                            />
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Typography
                            sx={{
                              color:
                                "#0f766e",
                              fontWeight:
                                900,
                            }}
                          >
                            {formatMoney(
                              getWalletBalance(
                                member,
                              ),
                            )}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography
                            sx={{
                              fontSize:
                                12,
                            }}
                          >
                            {member.phone ||
                              "-"}
                          </Typography>

                          <Typography
                            sx={{
                              color:
                                "#94a3b8",
                              fontSize:
                                11,
                            }}
                          >
                            {member.email ||
                              "-"}
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          <Tooltip title="Üyeliği yenile">
                            <span>
                              <IconButton
                                color="success"
                                onClick={() =>
                                  handleRenewMembership(
                                    member,
                                  )
                                }
                                disabled={
                                  !member.packageId &&
                                  !member.package
                                }
                              >
                                <AutorenewRounded />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Üyeyi düzenle">
                            <IconButton
                              color="primary"
                              onClick={() =>
                                handleOpenEdit(
                                  member,
                                )
                              }
                            >
                              <EditRounded />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Üyeyi sil">
                            <IconButton
                              color="error"
                              onClick={() =>
                                handleDeleteMember(
                                  member.id,
                                )
                              }
                            >
                              <DeleteRounded />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  },
                )}

                {filteredMembers.length ===
                  0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                    >
                      <Box
                        sx={{
                          textAlign:
                            "center",
                          py: 7,
                        }}
                      >
                        <WarningAmberRounded
                          sx={{
                            color:
                              "#cbd5e1",
                            fontSize:
                              44,
                          }}
                        />

                        <Typography
                          sx={{
                            mt: 1,
                            fontWeight:
                              800,
                            color:
                              "#334155",
                          }}
                        >
                          Üye bulunamadı
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          <TablePagination
            component="div"
            count={totalMembers}
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
        </SectionCard>
      </Box>

      <Dialog
        open={open}
        onClose={resetForm}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
          }}
        >
          {editingMember
            ? "Üye Düzenle"
            : "Yeni Üye Ekle"}
        </DialogTitle>

        <DialogContent
          sx={{
            display: "flex",
            flexDirection:
              "column",
            gap: 2,
            pt:
              "12px !important",
          }}
        >
          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          <TextField
            label="Ad Soyad"
            value={
              form.fullName
            }
            onChange={(event) =>
              setForm({
                ...form,
                fullName:
                  event.target
                    .value,
              })
            }
            fullWidth
          />

          <TextField
            label="Telefon"
            value={form.phone}
            onChange={(event) =>
              setForm({
                ...form,
                phone:
                  event.target
                    .value,
              })
            }
            fullWidth
          />

          <TextField
            label="E-posta"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({
                ...form,
                email:
                  event.target
                    .value,
              })
            }
            fullWidth
          />

          <TextField
            select
            label="Paket"
            value={
              form.packageId
            }
            onChange={(event) =>
              setForm({
                ...form,
                packageId:
                  event.target
                    .value,
              })
            }
            fullWidth
          >
            <MenuItem value="">
              Paket seçilmedi
            </MenuItem>

            {packages.map(
              (item) => (
                <MenuItem
                  key={item.id}
                  value={item.id}
                >
                  {item.name} -{" "}
                  {
                    item.durationMonths
                  }{" "}
                  Ay -{" "}
                  {formatMoney(
                    Number(
                      item.price,
                    ),
                  )}
                </MenuItem>
              ),
            )}
          </TextField>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2.5,
          }}
        >
          <Button
            onClick={
              resetForm
            }
          >
            İptal
          </Button>

          <Button
            variant="contained"
            onClick={
              handleSaveMember
            }
          >
            {editingMember
              ? "Güncelle"
              : "Kaydet"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
