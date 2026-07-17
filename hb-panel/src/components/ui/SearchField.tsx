import {
  InputAdornment,
  TextField,
} from '@mui/material';
import { SearchRounded } from '@mui/icons-material';

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: number | string;
};

export function SearchField({
  value,
  onChange,
  placeholder = 'Ara...',
  width = 320,
}: SearchFieldProps) {
  return (
    <TextField
      size="small"
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      placeholder={placeholder}
      sx={{
        width: {
          xs: '100%',
          sm: width,
        },
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchRounded
                sx={{ color: '#94a3b8' }}
              />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
