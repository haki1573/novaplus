import {
  ApartmentRounded,
  BusinessRounded,
  DashboardRounded,
  LogoutRounded,
  MenuRounded,
  BackupRounded,
  SettingsRounded,
} from '@mui/icons-material';

import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from '@mui/material';

import { useState } from 'react';
import type { ReactNode } from 'react';

import {
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

const drawerWidth = 248;

interface MenuItem {
  title: string;
  path: string;
  icon: ReactNode;
  badge?: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export function SuperAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const menuGroups: MenuGroup[] = [
    {
      title: 'YÖNETİM',
      items: [
        {
          title: 'Dashboard',
          path: '/super-admin/dashboard',
          icon: <DashboardRounded />,
        },
        {
          title: 'İşletmeler',
          path: '/super-admin/organizations',
          icon: <BusinessRounded />,
        },
        {
          title: 'Spor Salonları',
          path: '/super-admin/gyms',
          icon: <ApartmentRounded />,
        },
        {
          title: 'Yedekleme',
          path: '/super-admin/backups',
          icon: <BackupRounded />,
        },
        {
          title: 'Ayarlar',
          path: '/super-admin/settings',
          icon: <SettingsRounded />,
        },
      ],
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        color: '#0f172a',
        background: '#ffffff',
        borderRight: '1px solid #e5e7eb',
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2.5,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Box
  sx={{
    px: 2,
    py: 3,
    textAlign: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  }}
>
  <Box
    sx={{
      fontSize: 28,
      fontWeight: 900,
      color: '#0f172a',
      letterSpacing: '0.5px',
      lineHeight: 1,
    }}
  >
    NovaPlus+
  </Box>

  <Box
    sx={{
      mt: 0.8,
      fontSize: 12,
      color: '#64748b',
      letterSpacing: '1px',
      textTransform: 'uppercase',
    }}
  >
    Cloud Management
  </Box>
</Box>
      </Box>

      <Divider
        sx={{
          borderColor: '#e5e7eb',
        }}
      />

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1.5,
          py: 2,
        }}
      >
        {menuGroups.map((group) => (
          <Box key={group.title} sx={{ mb: 2 }}>
            <Box
              sx={{
                px: 1.4,
                mb: 0.75,
                color:
                  '#94a3b8',
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 1.3,
              }}
            >
              {group.title}
            </Box>

            <List disablePadding>
              {group.items.map((item) => {
                const selected =
                  item.title ===
                  'Lisans Yönetimi'
                    ? location.pathname.includes(
                        '/license',
                      )
                    : location.pathname ===
                        item.path ||
                      (
                        item.path !==
                          '/super-admin/dashboard' &&
                        location.pathname.startsWith(
                          `${item.path}/`,
                        )
                      );

                return (
                  <ListItemButton
                    key={item.title}
                    selected={selected}
                    onClick={() => {
                      navigate(item.path);
                      setMobileOpen(false);
                    }}
                    sx={{
                      mb: 0.65,
                      minHeight: 48,
                      px: 1.3,
                      borderRadius: 2,
                      color: selected
                        ? '#2563eb'
                        : '#475569',
                      '&.Mui-selected': {
                        backgroundColor:
                          '#eff6ff',
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor:
                          '#dbeafe',
                      },
                      '&:hover': {
                        backgroundColor:
                          '#f8fafc',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40,
                        color: 'inherit',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>

                    <ListItemText
                      primary={item.title}
                      slotProps={{
                        primary: {
                          sx: {
                            fontSize: 13,
                            fontWeight:
                              selected
                                ? 800
                                : 600,
                          },
                        },
                      }}
                    />

                    {item.badge && (
                      <Chip
                        size="small"
                        label={item.badge}
                        sx={{
                          height: 20,
                          color: '#2563eb',
                          bgcolor:
                            '#dbeafe',
                          fontSize: 8,
                          fontWeight: 900,
                        }}
                      />
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          mt: 'auto',
          px: 2,
          py: 1.5,
          borderTop: '1px solid #e5e7eb',
          color: '#64748b',
          fontSize: 10.5,
          lineHeight: 1.6,
        }}
      >
        © 2026 NovaPlus+
        <br />
        Tüm hakları saklıdır.
      </Box>

      <Box sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          startIcon={<LogoutRounded />}
          onClick={handleLogout}
          sx={{
            py: 1.2,
            color: '#0f172a',
            borderRadius: 2,
            justifyContent: 'flex-start',
            textTransform: 'none',

            '&:hover': {
              backgroundColor: '#f8fafc',
            },
          }}
        >
          Çıkış Yap
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f4f7fb',
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: {
            md: `calc(100% - ${drawerWidth}px)`,
          },
          ml: {
            md: `${drawerWidth}px`,
          },
          color: '#101828',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e7ebf0',
        }}
      >
        <Toolbar>
          <IconButton
            onClick={() =>
              setMobileOpen((value) => !value)
            }
            sx={{
              mr: 2,
              display: {
                xs: 'inline-flex',
                md: 'none',
              },
            }}
          >
            <MenuRounded />
          </IconButton>

          <Box sx={{ flexGrow: 1 }}>
            <Box
              component="div"
              sx={{
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              NovaPlus+ Yönetim Merkezi
            </Box>

            <Box
              component="div"
              sx={{
                mt: 0.2,
                fontSize: 12,
                color: '#667085',
              }}
            >
              Çoklu spor salonu yönetimi
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                textAlign: 'right',
                display: {
                  xs: 'none',
                  sm: 'block',
                },
              }}
            >
              <Box
                component="div"
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Süper Admin
              </Box>

              <Box
                component="div"
                sx={{
                  mt: 0.2,
                  fontSize: 11,
                  color: '#667085',
                }}
              >
                Sistem Yöneticisi
              </Box>
            </Box>

            <Avatar
              sx={{
                width: 38,
                height: 38,
                fontSize: 14,
                backgroundColor: '#1468f3',
              }}
            >
              SA
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: {
            md: drawerWidth,
          },
          flexShrink: {
            md: 0,
          },
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() =>
            setMobileOpen(false)
          }
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: {
              xs: 'block',
              md: 'none',
            },

            '& .MuiDrawer-paper': {
              width: drawerWidth,
              border: 0,
            },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: {
              xs: 'none',
              md: 'block',
            },

            '& .MuiDrawer-paper': {
              width: drawerWidth,
              border: 0,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: {
            md: `calc(100% - ${drawerWidth}px)`,
          },
          mt: 8,
          p: {
            xs: 2,
            md: 3,
          },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}