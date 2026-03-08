import { Chip } from '@mui/material';

const statusConfig: Record<string, { color: 'info' | 'warning' | 'success' | 'default' | 'secondary'; label: string }> = {
  InTransit: { color: 'info', label: 'In Transit' },
  InRecon: { color: 'warning', label: 'In Recon' },
  FrontlineReady: { color: 'success', label: 'Frontline Ready' },
  Sold: { color: 'default', label: 'Sold' },
  Wholesaled: { color: 'secondary', label: 'Wholesaled' },
};

export default function VehicleStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { color: 'default' as const, label: status };
  return <Chip label={config.label} color={config.color} size="small" />;
}
