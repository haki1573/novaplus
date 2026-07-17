import type { ReactNode } from 'react';

import {
  Box,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

type SectionCardProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  padding?: number;
  overflow?: 'hidden' | 'visible';
};

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  padding = 2.5,
  overflow = 'hidden',
}: SectionCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        background: '#ffffff',
        overflow,
        boxShadow:
          '0 8px 24px rgba(15,23,42,0.035)',
      }}
    >
      {(title || subtitle || actions) && (
        <Stack
          direction={{
            xs: 'column',
            md: 'row',
          }}
          spacing={1.5}


          sx={{ justifyContent: 'space-between', alignItems: {
            xs: 'stretch',
            md: 'center',
          }, p: padding,
            borderBottom:
              '1px solid #eef2f7', }}
        >
          <Box>
            {title && (
              <Typography
                variant="h6"
                sx={{
                  color: '#0f172a',
                  fontWeight: 900,
                }}
              >
                {title}
              </Typography>
            )}

            {subtitle && (
              <Typography
                sx={{
                  mt: 0.35,
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          {actions}
        </Stack>
      )}

      {children}
    </Paper>
  );
}
