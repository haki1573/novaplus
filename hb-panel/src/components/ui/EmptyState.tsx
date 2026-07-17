import type { ReactNode } from 'react';

import {
  Box,
  Typography,
} from '@mui/material';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
};

export function EmptyState({
  icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        py: 7,
        px: 2,
        textAlign: 'center',
      }}
    >
      {icon && (
        <Box
          sx={{
            mb: 1.25,
            color: '#cbd5e1',
            '& .MuiSvgIcon-root': {
              fontSize: 48,
            },
          }}
        >
          {icon}
        </Box>
      )}

      <Typography
        sx={{
          color: '#334155',
          fontWeight: 900,
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          sx={{
            mt: 0.5,
            color: '#94a3b8',
            fontSize: 13,
          }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
}
