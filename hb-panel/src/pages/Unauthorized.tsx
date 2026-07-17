import {
  Box,
  Button,
  Paper,
  Typography,
} from '@mui/material';

import {
  BlockRounded,
} from '@mui/icons-material';

import {
  useNavigate,
} from 'react-router-dom';

export function Unauthorized() {
  const navigate =
    useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        background:
          'background.default',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 520,
          p: 4,
          textAlign: 'center',
          borderRadius: 2,
          border:
            '1px solid #e5e7eb',
        }}
      >
        <BlockRounded
          sx={{
            fontSize: 64,
            color: '#dc2626',
          }}
        />

        <Typography
          variant="h4"
          sx={{
            mt: 2,
            fontWeight: 900,
          }}
        >
          Yetkisiz Erişim
        </Typography>

        <Typography
          sx={{
            mt: 1,
            color: '#64748b',
          }}
        >
          Bu sayfayı görüntüleme
          yetkiniz bulunmuyor.
        </Typography>

        <Button
          variant="contained"
          sx={{ mt: 3 }}
          onClick={() =>
            navigate(
              '/dashboard',
            )
          }
        >
          Dashboard'a Dön
        </Button>
      </Paper>
    </Box>
  );
}
