import type { ReactNode } from 'react';

import {
  Box,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

type StatCardProps = {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  accent?: string;
  iconBackground?: string;
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = '#2563eb',
  iconBackground = '#eff6ff',
}: StatCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        background: '#ffffff',
        boxShadow:
          '0 8px 24px rgba(15,23,42,0.035)',
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}


      
      sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              color: '#64748b',
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            {title}
          </Typography>

          <Typography
            sx={{
              mt: 0.45,
              color: accent,
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            {value}
          </Typography>

          {subtitle && (
            <Typography
              sx={{
                mt: 0.35,
                color: '#94a3b8',
                fontSize: 11.5,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {icon && (
          <Box
            sx={{
              width: 42,
              height: 42,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              borderRadius: 2,
              color: accent,
              background: iconBackground,
            }}
          >
            {icon}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
