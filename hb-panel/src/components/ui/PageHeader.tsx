import type { ReactNode } from 'react';

import {
  Box,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  icon,
  actions,
}: PageHeaderProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: {
          xs: 2,
          md: 2.5,
        },
        mb: 3,
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        background: '#ffffff',
        boxShadow:
          '0 10px 28px rgba(15,23,42,0.04)',
      }}
    >
      <Stack
        direction={{
          xs: 'column',
          md: 'row',
        }}
        spacing={2}


      
      sx={{ justifyContent: 'space-between', alignItems: {
          xs: 'stretch',
          md: 'center',
        } }}>
        <Stack
          direction="row"
          spacing={1.5}

        
        sx={{ alignItems: 'center' }}>
          {icon && (
            <Box
              sx={{
                width: 44,
                height: 44,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 2,
                color: '#2563eb',
                background: '#eff6ff',
                border: '1px solid #dbeafe',
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}

          <Box>
            {eyebrow && (
              <Typography
                sx={{
                  color: '#2563eb',
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 1.2,
                }}
              >
                {eyebrow}
              </Typography>
            )}

            <Typography
              variant="h4"
              sx={{
                mt: eyebrow ? 0.2 : 0,
                color: '#0f172a',
                fontWeight: 900,
                letterSpacing: -0.6,
              }}
            >
              {title}
            </Typography>

            {subtitle && (
              <Typography
                sx={{
                  mt: 0.5,
                  color: '#64748b',
                  fontSize: 14,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>

        {actions && (
          <Box>
            {actions}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
