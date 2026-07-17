import type { ReactNode } from 'react';

import { Box } from '@mui/material';

type PageContainerProps = {
  children: ReactNode;
};

export function PageContainer({
  children,
}: PageContainerProps) {
  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: '100vh',
        p: {
          xs: 2,
          md: 3,
        },
        background: 'background.default',
      }}
    >
      {children}
    </Box>
  );
}
