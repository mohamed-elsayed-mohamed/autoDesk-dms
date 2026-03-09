import { Chip } from '@mui/material';
import { DealStatus } from '../types/deal.types';

export const DEAL_STATUS_COLORS: Record<
  DealStatus,
  'warning' | 'info' | 'success' | 'error' | 'default'
> = {
  [DealStatus.Pending]: 'warning',
  [DealStatus.Desking]: 'info',
  [DealStatus.Fni]: 'info',
  [DealStatus.ContractsSigned]: 'default',
  [DealStatus.Delivered]: 'success',
  [DealStatus.Funded]: 'success',
  [DealStatus.Unwound]: 'error',
};

const STATUS_LABELS: Record<DealStatus, string> = {
  [DealStatus.Pending]: 'Pending',
  [DealStatus.Desking]: 'Desking',
  [DealStatus.Fni]: 'F&I',
  [DealStatus.ContractsSigned]: 'Contracts Signed',
  [DealStatus.Delivered]: 'Delivered',
  [DealStatus.Funded]: 'Funded',
  [DealStatus.Unwound]: 'Unwound',
};

interface StatusBadgeProps {
  status: DealStatus;
  size?: 'small' | 'medium';
}

export default function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const color = DEAL_STATUS_COLORS[status];
  const label = STATUS_LABELS[status] ?? status;

  if (status === DealStatus.ContractsSigned) {
    return (
      <Chip
        label={label}
        size={size}
        sx={{ bgcolor: '#e0f2f1', color: '#00897b', fontWeight: 600, border: '1px solid #00897b' }}
      />
    );
  }

  return <Chip label={label} color={color} size={size} sx={{ fontWeight: 600 }} />;
}
