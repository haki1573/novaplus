import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  CssBaseline,
  GlobalStyles,
  ThemeProvider,
  createTheme,
} from '@mui/material';

type ThemeMode = 'light' | 'dark';

type NovaThemeContextValue = {
  mode: ThemeMode;
  toggleMode: () => void;
};

const NovaThemeContext =
  createContext<NovaThemeContextValue | null>(
    null,
  );

function readStoredMode(): ThemeMode {
  const stored =
    localStorage.getItem('nova-theme');

  if (
    stored === 'light' ||
    stored === 'dark'
  ) {
    return stored;
  }

  return window.matchMedia(
    '(prefers-color-scheme: dark)',
  ).matches
    ? 'dark'
    : 'light';
}

export function NovaThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [mode, setMode] =
    useState<ThemeMode>(readStoredMode);

  const toggleMode = () => {
    setMode((current) => {
      const next =
        current === 'light'
          ? 'dark'
          : 'light';

      localStorage.setItem(
        'nova-theme',
        next,
      );

      return next;
    });
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#2563eb',
          },
          secondary: {
            main: '#7c3aed',
          },
          success: {
            main: '#16a34a',
          },
          warning: {
            main: '#d97706',
          },
          error: {
            main: '#dc2626',
          },
          background:
            mode === 'dark'
              ? {
                  default: '#07111f',
                  paper: '#0f1b2d',
                }
              : {
                  default: '#f6f8fb',
                  paper: '#ffffff',
                },
          text:
            mode === 'dark'
              ? {
                  primary: '#e5eefb',
                  secondary: '#94a3b8',
                }
              : {
                  primary: '#0f172a',
                  secondary: '#64748b',
                },
        },
        shape: {
          borderRadius: 10,
        },
        typography: {
          fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 10,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                textTransform: 'none',
                fontWeight: 750,
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              head: {
                fontWeight: 850,
              },
            },
          },
        },
      }),
    [mode],
  );

  return (
    <NovaThemeContext.Provider
      value={{ mode, toggleMode }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />

        <GlobalStyles
          styles={{
            body: {
              transition:
                'background-color 180ms ease, color 180ms ease',
            },

            '@media (max-width: 899px)': {
              body: {
                paddingBottom: '88px',
              },
            },

            ...(mode === 'dark'
              ? {
                  '.MuiPaper-root:not([data-nova-keep])':
                    {
                      backgroundColor:
                        '#0f1b2d !important',
                      color:
                        '#e5eefb !important',
                      borderColor:
                        '#22324a !important',
                    },

                  '.MuiCard-root': {
                    backgroundColor:
                      '#0f1b2d !important',
                    color:
                      '#e5eefb !important',
                    borderColor:
                      '#22324a !important',
                  },

                  '.MuiTableCell-root': {
                    color:
                      '#dbe7f7 !important',
                    borderColor:
                      '#22324a !important',
                  },

                  '.MuiTableHead-root .MuiTableRow-root':
                    {
                      backgroundColor:
                        '#111f33 !important',
                    },

                  '.MuiOutlinedInput-root':
                    {
                      color:
                        '#e5eefb !important',
                      backgroundColor:
                        '#111f33 !important',
                    },

                  '.MuiOutlinedInput-notchedOutline':
                    {
                      borderColor:
                        '#33445f !important',
                    },

                  '.MuiInputLabel-root': {
                    color:
                      '#94a3b8 !important',
                  },

                  '.MuiDialog-paper': {
                    backgroundColor:
                      '#0f1b2d !important',
                    color:
                      '#e5eefb !important',
                  },

                  '.MuiMenu-paper': {
                    backgroundColor:
                      '#0f1b2d !important',
                    color:
                      '#e5eefb !important',
                  },

                  '.MuiMenuItem-root': {
                    color:
                      '#e5eefb !important',
                  },

                  'main, main > .MuiBox-root':
                    {
                      color:
                        '#e5eefb',
                    },
                }
              : {}),
          }}
        />

        {children}
      </ThemeProvider>
    </NovaThemeContext.Provider>
  );
}

export function useNovaTheme() {
  const context =
    useContext(NovaThemeContext);

  if (!context) {
    throw new Error(
      'useNovaTheme, NovaThemeProvider içinde kullanılmalıdır.',
    );
  }

  return context;
}
