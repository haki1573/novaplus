import type { ReactNode } from 'react';

import {
  Box,
  Paper,
  Stack,
} from '@mui/material';

type ActionBarProps = {
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
};

export function ActionBar({
  left,
  right,
  children,
}: ActionBarProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        mb: 3,
        borderRadius: 2,
        border: '1px solid #e5e7eb',
        background: '#ffffff',
      }}
    >
      {children || (
        <Stack
          direction={{
            xs: 'column',
            md: 'row',
          }}
          spacing={1.5}


        
        sx={{ justifyContent: 'space-between', alignItems: {
            xs: 'stretch',
            md: 'center',
          } }}>
          <Box>{left}</Box>
          <Box>{right}</Box>
        </Stack>
      )}
    </Paper>
  );
}
