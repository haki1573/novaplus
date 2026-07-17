import {
  ArrowBackRounded,
  ConstructionRounded,
} from '@mui/icons-material';

import {
  Box,
  Button,
  Card,
  CardContent,
} from '@mui/material';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

interface SuperAdminModulePlaceholderProps {
  title: string;
  description: string;
}

export function SuperAdminModulePlaceholder({
  title,
  description,
}: SuperAdminModulePlaceholderProps) {
  const navigate = useNavigate();

  const { gymId } =
    useParams<{
      gymId: string;
    }>();

  return (
    <Box>
      <Button
        startIcon={
          <ArrowBackRounded />
        }
        onClick={() =>
          navigate(
            `/super-admin/gyms/${gymId}`,
          )
        }
        sx={{
          mb: 2,
          textTransform: 'none',
          fontWeight: 700,
        }}
      >
        Salon Yönetimine Dön
      </Button>

      <Card
        elevation={0}
        sx={{
          border:
            '1px solid #e8edf3',
          borderRadius: 3,
        }}
      >
        <CardContent
          sx={{
            py: 8,
            textAlign: 'center',
          }}
        >
          <ConstructionRounded
            sx={{
              fontSize: 64,
              color: '#1468f3',
            }}
          />

          <Box
            component="h1"
            sx={{
              mt: 2,
              mb: 0,
              fontSize: 28,
              fontWeight: 800,
              color: '#101828',
            }}
          >
            {title}
          </Box>

          <Box
            sx={{
              mt: 1,
              color: '#667085',
            }}
          >
            {description}
          </Box>

          <Box
            sx={{
              mt: 2,
              fontWeight: 700,
              color: '#1468f3',
            }}
          >
            Bu modül sıradaki geliştirme adımında aktif olacak.
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
