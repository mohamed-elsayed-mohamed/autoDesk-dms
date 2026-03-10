import { FiProductStatus } from '../types/fi.types';

const STATUS_STYLES: Record<FiProductStatus, { background: string; color: string; label: string }> = {
  Active: { background: '#e8f5e9', color: '#1b5e20', label: 'Active' },
  Cancelled: { background: '#fafafa', color: '#616161', label: 'Cancelled' },
  ChargedBack: { background: '#fce4ec', color: '#880e4f', label: 'Charged Back' },
};

interface Props {
  status: FiProductStatus;
}

export function FiProductStatusBadge({ status }: Props) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.Active;
  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: 12,
      background: style.background,
      color: style.color,
      fontWeight: 600,
      fontSize: 12,
      whiteSpace: 'nowrap',
    }}>
      {style.label}
    </span>
  );
}
