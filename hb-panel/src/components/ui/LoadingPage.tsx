import {
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';

type LoadingPageProps = {
  label?: string;
  minHeight?: number;
};

export function LoadingPage({
  label = 'Veriler yükleniyor...',
  minHeight = 300,
}: LoadingPageProps) {
  return (
    <Box
      sx={{
        minHeight,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress size={32} />
        <Typography
          sx={{
            mt: 1.5,
            color: '#64748b',
            fontSize: 13,
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  );
}
