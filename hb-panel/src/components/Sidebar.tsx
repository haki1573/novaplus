import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  AccountBalanceWalletRounded,
  AssessmentRounded,
  HistoryRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  CreditCardRounded,
  DashboardRounded,
  FitnessCenterRounded,
  GroupsRounded,
  Inventory2Rounded,
  LockRounded,
  LogoutRounded,
  DoorFrontRounded,
  DevicesRounded,
  MenuRounded,
  NotificationsRounded,
  PsychologyRounded,
  QrCode2Rounded,
  RestaurantRounded,
  BadgeRounded,
  SettingsRounded,
  SmsRounded,
} from "@mui/icons-material";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { api } from "../services/api";
import {
  connectRealtime,
  realtime,
} from "../services/realtime";

type PermissionKey =
  | "dashboard"
  | "members"
  | "packages"
  | "checkIn"
  | "finance"
  | "accessCards"
  | "cafe"
  | "staff"
  | "sms"
  | "devices"
  | "turnstiles"
  | "lockers"
  | "novaAi"
  | "notifications"
  | "reports"
  | "auditLogs"
  | "settings";

type MenuItem = {
  label: string;
  path: string;
  icon: ReactNode;
  badge?: string;
  permission:
    PermissionKey;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

type StoredUser = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  role?: string;
  gymId?: string | null;

  permissions?: Partial<
    Record<
      PermissionKey,
      boolean
    >
  >;

  gym?: {
    id?: string;
    name?: string;
    slug?: string;
    subscriptionPlan?: string;
    licenseStartDate?: string | null;
    licenseEndDate?: string | null;
    logoUrl?: string | null;
  } | null;
};

const menuGroups: MenuGroup[] = [
  {
    title: "GENEL",
    items: [
      {
        label: "Dashboard",
        path: "/dashboard",
        permission: "dashboard",
        icon: <DashboardRounded />,
      },
      {
        label: "Üyeler",
        path: "/members",
        permission: "members",
        icon: <GroupsRounded />,
      },
      {
        label: "Paketler",
        path: "/packages",
        permission: "packages",
        icon: <Inventory2Rounded />,
      },
      {
        label: "Check-in",
        path: "/checkin",
        permission: "checkIn",
        icon: <FitnessCenterRounded />,
        badge: "CANLI",
      },
    ],
  },
  {
    title: "SATIŞ & FİNANS",
    items: [
      {
        label: "Finans",
        path: "/finance",
        permission: "finance",
        icon: <AccountBalanceWalletRounded />,
      },
      {
        label: "Kart & QR",
        path: "/access-cards",
        permission: "accessCards",
        icon: <CreditCardRounded />,
      },
      {
        label: "Kafe & Bakiye",
        path: "/cafe",
        permission: "cafe",
        icon: <RestaurantRounded />,
      },
    ],
  },
  {
    title: "YÖNETİM",
    items: [
      {
        label: "Personel",
        path: "/staff",
        permission: "staff",
        icon: <BadgeRounded />,
      },
      {
        label: "SMS",
        path: "/sms",
        permission: "sms",
        icon: <SmsRounded />,
      },
      {
        label: "Device Center",
        path: "/device-center",
        permission: "devices",
        icon: <DevicesRounded />,
        badge: "YENİ",
      },
      {
        label: "Turnikeler",
        path: "/turnstiles",
        permission: "turnstiles",
        icon: <DoorFrontRounded />,
        badge: "CANLI",
      },
      {
        label: "Akıllı Dolaplar",
        path: "/lockers",
        permission: "lockers",
        icon: <LockRounded />,
      },
      {
        label: "Nova AI",
        path: "/nova-ai",
        permission: "novaAi",
        icon: <PsychologyRounded />,
        badge: "YENİ",
      },
      {
        label: "Bildirimler",
        path: "/notifications",
        permission: "notifications",
        icon: <NotificationsRounded />,
      },
      {
        label: "Raporlar",
        path: "/reports",
        permission: "reports",
        icon: <AssessmentRounded />,
      },
      {
        label: "İşlem Geçmişi",
        path: "/audit-logs",
        permission: "auditLogs",
        icon: <HistoryRounded />,
      },
      {
        label: "Ayarlar",
        path: "/settings",
        permission: "settings",
        icon: <SettingsRounded />,
      },
    ],
  },
];

const mobileItems: MenuItem[] = [
  {
    label: "Ana Sayfa",
    path: "/dashboard",
        permission: "dashboard",
    icon: <DashboardRounded />,
  },
  {
    label: "Üyeler",
    path: "/members",
        permission: "members",
    icon: <GroupsRounded />,
  },
  {
    label: "Check-in",
    path: "/checkin",
        permission: "checkIn",
    icon: <FitnessCenterRounded />,
  },
  {
    label: "Finans",
    path: "/finance",
        permission: "finance",
    icon: <AccountBalanceWalletRounded />,
  },
];

function readStoredUser(): StoredUser {
  try {
    const rawUser = localStorage.getItem("user");

    return rawUser
      ? (JSON.parse(rawUser) as StoredUser)
      : {};
  } catch {
    return {};
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part[0]?.toLocaleUpperCase("tr-TR"),
    )
    .join("");
}

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [
    notificationCount,
    setNotificationCount,
  ] = useState(0);

  const user = useMemo(
    readStoredUser,
    [],
  );

  const canAccess = (
    permission:
      PermissionKey,
  ) => {
    if (
      user.role ===
        "GYM_ADMIN" ||
      user.role ===
        "MANAGER"
    ) {
      return true;
    }

    return Boolean(
      user.permissions?.[
        permission
      ],
    );
  };

  const visibleMenuGroups =
    menuGroups
      .map((group) => ({
        ...group,
        items:
          group.items.filter(
            (item) =>
              canAccess(
                item.permission,
              ),
          ),
      }))
      .filter(
        (group) =>
          group.items.length >
          0,
      );

  const visibleMobileItems =
    mobileItems.filter(
      (item) =>
        canAccess(
          item.permission,
        ),
    );

  useEffect(() => {
    let active = true;

    const loadNotificationCount =
      async () => {
        try {
          const response =
            await api.get<{
              unread: number;
            }>("/notifications/summary");

          if (active) {
            setNotificationCount(
              response.data.unread || 0,
            );
          }
        } catch {
          if (active) {
            setNotificationCount(0);
          }
        }
      };

    const refreshCount = () => {
      void loadNotificationCount();
    };

    void loadNotificationCount();
    connectRealtime();

    realtime.on(
      "notification:new",
      refreshCount,
    );
    realtime.on(
      "notification:updated",
      refreshCount,
    );
    realtime.on(
      "dashboard:update",
      refreshCount,
    );

    return () => {
      active = false;
      realtime.off(
        "notification:new",
        refreshCount,
      );
      realtime.off(
        "notification:updated",
        refreshCount,
      );
      realtime.off(
        "dashboard:update",
        refreshCount,
      );
    };
  }, []);

  const displayName =
    user.fullName ||
    [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ") ||
    "Salon Yöneticisi";

  const gymName =
    user.gym?.name ||
    "Spor Salonu";

  const subscriptionPlan =
    user.gym?.subscriptionPlan ||
    "BASIC";

  const planLabel =
    subscriptionPlan === "PROFESSIONAL"
      ? "Professional"
      : subscriptionPlan === "ENTERPRISE"
        ? "Enterprise"
        : "Basic";

  useEffect(() => {
    document.title =
      `${gymName} | NovaPlus+`;
  }, [gymName]);

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== "/dashboard" &&
      location.pathname.startsWith(
        `${path}/`,
      ));

  const handleNavigate = (
    path: string,
  ) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <>
      <Box
        component="aside"
        sx={{
          display: {
            xs: "none",
            md: "block",
          },
          position: "sticky",
          top: 0,
          width: collapsed ? 92 : 282,
          minWidth: collapsed ? 92 : 282,
          height: "100vh",
          overflow: "hidden",
          color: "#0f172a",
          background: "#ffffff",
          borderRight: "1px solid #e5e7eb",
          boxShadow: "8px 0 28px rgba(15,23,42,0.035)",
          transition:
            "width 220ms ease, min-width 220ms ease",
          zIndex: 20,
        }}
      >
        <Box
          sx={{
            height: "100%",
            px: collapsed ? 1.5 : 2,
            py: 2,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              minHeight: 72,
              display: "flex",
              alignItems: "center",
              justifyContent:
                collapsed
                  ? "center"
                  : "space-between",
              gap: 1,
            }}
          >
            <Box
              onClick={() =>
                navigate("/dashboard")
              }
              sx={{
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              {!collapsed && (
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 22,
                      fontWeight: 950,
                      letterSpacing: "-0.7px",
                      lineHeight: 1.05,
                    }}
                  >
                    NovaPlus+
                  </Typography>

                  <Typography
                    noWrap
                    sx={{
                      mt: 0.55,
                      maxWidth: 190,
                      color: "#0f172a",
                      fontSize: 12.5,
                      fontWeight: 900,
                    }}
                  >
                    {gymName}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.2,
                      color: "#64748b",
                      fontSize: 10.5,
                      fontWeight: 800,
                    }}
                  >
                    {planLabel} Lisans
                  </Typography>
                </Box>
              )}
            </Box>

            {!collapsed && (
              <Tooltip title="Menüyü daralt">
                <IconButton
                  onClick={() =>
                    setCollapsed(true)
                  }
                  size="small"
                  sx={{
                    color: "#64748b",
                    background:
                      "#f8fafc",
                    "&:hover": {
                      background:
                        "#eff6ff",
                    },
                  }}
                >
                  <ChevronLeftRounded />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {collapsed && (
            <Tooltip
              title="Menüyü genişlet"
              placement="right"
            >
              <IconButton
                onClick={() =>
                  setCollapsed(false)
                }
                size="small"
                sx={{
                  alignSelf: "center",
                  mb: 1,
                  color: "#64748b",
                  background:
                    "#f8fafc",
                  "&:hover": {
                    background:
                      "#eff6ff",
                  },
                }}
              >
                <ChevronRightRounded />
              </IconButton>
            </Tooltip>
          )}

          <Divider
            sx={{
              borderColor: "#e5e7eb",
              mb: 1.5,
            }}
          />

          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              pr: collapsed ? 0 : 0.5,
              "&::-webkit-scrollbar": {
                width: 5,
              },
              "&::-webkit-scrollbar-thumb": {
                borderRadius: 8,
                background: "#cbd5e1",
              },
            }}
          >
            {visibleMenuGroups.map((group) => (
              <Box
                key={group.title}
                sx={{ mb: 1.5 }}
              >
                {!collapsed && (
                  <Typography
                    sx={{
                      px: 1.4,
                      py: 1,
                      color: "#64748b",
                      fontSize: 10.5,
                      fontWeight: 900,
                      letterSpacing: 1.25,
                    }}
                  >
                    {group.title}
                  </Typography>
                )}

                <List disablePadding>
                  {group.items.map((item) => {
                    const active =
                      isActive(item.path);

                    const button = (
                      <ListItemButton
                        key={item.path}
                        onClick={() =>
                          navigate(item.path)
                        }
                        sx={{
                          minHeight: 48,
                          px: collapsed
                            ? 1.4
                            : 1.35,
                          mb: 0.65,
                          borderRadius: 2,
                          justifyContent:
                            collapsed
                              ? "center"
                              : "flex-start",
                          color: active
                            ? "#2563eb"
                            : "#475569",
                          background: active
                            ? "#eff6ff"
                            : "transparent",
                          boxShadow: "none",
                          "&::before": active
                            ? {
                                content:
                                  '""',
                                position:
                                  "absolute",
                                left: 0,
                                width: 3,
                                height: 22,
                                borderRadius: 2,
                                background: "#2563eb",
                              }
                            : undefined,
                          "&:hover": {
                            color: "#2563eb",
                            background: active
                              ? "#eff6ff"
                              : "#f8fafc",
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth:
                              collapsed
                                ? 0
                                : 39,
                            color: "inherit",
                            justifyContent:
                              "center",
                            "& .MuiSvgIcon-root":
                              {
                                fontSize: 21,
                              },
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>

                        {!collapsed && (
                          <ListItemText
                            primary={
                              item.label
                            }
                            slotProps={{
                              primary: {
                                sx: {
                                  fontSize:
                                    13.5,
                                  fontWeight:
                                    active
                                      ? 850
                                      : 650,
                                },
                              },
                            }}
                          />
                        )}

                        {!collapsed &&
                          (item.badge ||
                            (item.path ===
                              "/notifications" &&
                              notificationCount >
                                0)) && (
                            <Chip
                              label={
                                item.path ===
                                "/notifications"
                                  ? String(
                                      notificationCount,
                                    )
                                  : item.badge
                              }
                              size="small"
                              sx={{
                                height: 21,
                                color: active
                                  ? "#2563eb"
                                  : "#15803d",
                                fontSize: 8.5,
                                fontWeight: 950,
                                background:
                                  active
                                    ? "#dbeafe"
                                    : "#dcfce7",
                              }}
                            />
                          )}
                      </ListItemButton>
                    );

                    return collapsed ? (
                      <Tooltip
                        key={item.path}
                        title={item.label}
                        placement="right"
                      >
                        {button}
                      </Tooltip>
                    ) : (
                      button
                    );
                  })}
                </List>
              </Box>
            ))}
          </Box>

          {!collapsed && (
            <Box
              sx={{
                p: 1.5,
                mb: 1.2,
                borderRadius: 3,
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <QrCode2Rounded
                  sx={{
                    color: "#2563eb",
                    fontSize: 20,
                  }}
                />

                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 850,
                      fontSize: 12.5,
                    }}
                  >
                    Sistem çevrimiçi
                  </Typography>

                  <Typography
                    sx={{
                      color: "#64748b",
                      fontSize: 10.5,
                    }}
                  >
                    Kart ve QR okuyucu hazır
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          <Divider
            sx={{
              borderColor: "#e5e7eb",
              mb: 1.4,
            }}
          />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                collapsed
                  ? "center"
                  : "space-between",
              gap: 1,
            }}
          >
            <Tooltip
              title={
                collapsed
                  ? displayName
                  : ""
              }
              placement="right"
            >
              <Box
                sx={{
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.15,
                }}
              >
                <Avatar
                  sx={{
                    width: 38,
                    height: 38,
                    fontSize: 13,
                    fontWeight: 900,
                    background: "#2563eb",
                  }}
                >
                  {initials(
                    displayName,
                  ) || "NP"}
                </Avatar>

                {!collapsed && (
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      noWrap
                      sx={{
                        maxWidth: 145,
                        fontSize: 12.5,
                        fontWeight: 850,
                      }}
                    >
                      {displayName}
                    </Typography>

                    <Typography
                      noWrap
                      sx={{
                        maxWidth: 145,
                        color: "#64748b",
                        fontSize: 10.5,
                      }}
                    >
                      {user.role ===
                      "STAFF"
                        ? "Personel"
                        : "Salon yöneticisi"}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Tooltip>

            {!collapsed && (
              <Tooltip title="Çıkış yap">
                <IconButton
                  onClick={handleLogout}
                  size="small"
                  sx={{
                    color: "#64748b",
                    "&:hover": {
                      color: "#fca5a5",
                      background:
                        "rgba(239,68,68,0.1)",
                    },
                  }}
                >
                  <LogoutRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

      <Box
        component="nav"
        sx={{
          display: {
            xs: "flex",
            md: "none",
          },
          position: "fixed",
          left: 12,
          right: 12,
          bottom: 12,
          height: 68,
          px: 1,
          alignItems: "center",
          justifyContent:
            "space-around",
          borderRadius: 4,
          color: "#0f172a",
          background: "rgba(255,255,255,0.96)",
          border: "1px solid #e5e7eb",
          boxShadow: "0 16px 38px rgba(15,23,42,0.12)",
          backdropFilter: "blur(18px)",
          zIndex: 1300,
        }}
      >
        {visibleMobileItems.map((item) => {
          const active =
            isActive(item.path);

          return (
            <Tooltip
              key={item.path}
              title={item.label}
              placement="top"
            >
              <IconButton
                onClick={() =>
                  handleNavigate(
                    item.path,
                  )
                }
                sx={{
                  width: 46,
                  height: 46,
                  color: active
                    ? "#2563eb"
                    : "#64748b",
                  background: active
                    ? "#eff6ff"
                    : "transparent",
                  boxShadow: active
                    ? "0 10px 22px rgba(37,99,235,0.32)"
                    : "none",
                  "&:hover": {
                    background: active
                      ? "#eff6ff"
                      : "#f8fafc",
                  },
                }}
              >
                {item.icon}
              </IconButton>
            </Tooltip>
          );
        })}

        <Tooltip
          title="Daha Fazla"
          placement="top"
        >
          <IconButton
            onClick={() =>
              setMobileOpen(true)
            }
            sx={{
              width: 46,
              height: 46,
              color: "#64748b",
              "&:hover": {
                color: "#2563eb",
                background: "#eff6ff",
              },
            }}
          >
            <MenuRounded />
          </IconButton>
        </Tooltip>
      </Box>

      <Drawer
        anchor="bottom"
        open={mobileOpen}
        onClose={() =>
          setMobileOpen(false)
        }
        slotProps={{
          paper: {
            sx: {
              borderRadius:
                "22px 22px 0 0",
              background: "#ffffff",
              pb: 2,
            },
          },
        }}
      >
        <Box sx={{ p: 2.5 }}>
          <Box
            sx={{
              width: 44,
              height: 4,
              mx: "auto",
              mb: 2.5,
              borderRadius: 4,
              background: "#cbd5e1",
            }}
          />

          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 900,
              mb: 1.5,
            }}
          >
            NovaPlus+ Menü
          </Typography>

          <List disablePadding>
            {visibleMenuGroups
              .flatMap(
                (group) =>
                  group.items,
              )
              .map((item) => (
                <ListItemButton
                  key={item.path}
                  onClick={() =>
                    handleNavigate(
                      item.path,
                    )
                  }
                  sx={{
                    mb: 0.75,
                    borderRadius: 3,
                    background:
                      isActive(
                        item.path,
                      )
                        ? "rgba(37,99,235,0.12)"
                        : "transparent",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 42,
                      color: isActive(
                        item.path,
                      )
                        ? "#2563eb"
                        : "inherit",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>

                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: {
                        sx: {
                          fontWeight:
                            isActive(
                              item.path,
                            )
                              ? 900
                              : 700,
                        },
                      },
                    }}
                  />

                  {(item.badge ||
                    (item.path ===
                      "/notifications" &&
                      notificationCount >
                        0)) && (
                    <Chip
                      label={
                        item.path ===
                        "/notifications"
                          ? String(
                              notificationCount,
                            )
                          : item.badge
                      }
                      size="small"
                    />
                  )}
                </ListItemButton>
              ))}
          </List>

          <Divider sx={{ my: 1.5 }} />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns:
                "1fr",
              gap: 1,
            }}
          >
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 3,
                justifyContent:
                  "center",
                color: "#dc2626",
                border:
                  "1px solid rgba(220,38,38,0.22)",
              }}
            >
              <LogoutRounded />

              <Typography
                sx={{
                  ml: 1,
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                Çıkış
              </Typography>
            </ListItemButton>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
