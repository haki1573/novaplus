import { Chip } from '@mui/material';

type StatusTone =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';

type StatusChipProps = {
  label: string;
  tone?: StatusTone;
  size?: 'small' | 'medium';
};

const toneMap = {
  success: {
    color: '#15803d',
    background: '#dcfce7',
  },
  warning: {
    color: '#b45309',
    background: '#fef3c7',
  },
  error: {
    color: '#b91c1c',
    background: '#fee2e2',
  },
  info: {
    color: '#1d4ed8',
    background: '#dbeafe',
  },
  neutral: {
    color: '#475569',
    background: '#f1f5f9',
  },
};

export function StatusChip({
  label,
  tone = 'neutral',
  size = 'small',
}: StatusChipProps) {
  const style = toneMap[tone];

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        color: style.color,
        background: style.background,
        fontWeight: 800,
      }}
    />
  );
}
