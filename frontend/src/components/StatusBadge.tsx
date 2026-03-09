import { Chip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { LeadStatus, TaskStatus } from '../types';

type StatusValue = LeadStatus | TaskStatus | string;

const LEAD_STATUS_COLORS: Record<LeadStatus, { bg: string; color: string; label: string }> = {
  [LeadStatus.New]:            { bg: '#e3f2fd', color: '#1565c0', label: 'New' },
  [LeadStatus.Contacted]:      { bg: '#e8f5e9', color: '#2e7d32', label: 'Contacted' },
  [LeadStatus.AppointmentSet]: { bg: '#f3e5f5', color: '#6a1b9a', label: 'Appt Set' },
  [LeadStatus.Showed]:         { bg: '#fff8e1', color: '#f57f17', label: 'Showed' },
  [LeadStatus.Negotiating]:    { bg: '#fff3e0', color: '#e65100', label: 'Negotiating' },
  [LeadStatus.Sold]:           { bg: '#e8f5e9', color: '#1b5e20', label: 'Sold' },
  [LeadStatus.Lost]:           { bg: '#ffebee', color: '#b71c1c', label: 'Lost' },
};

const TASK_STATUS_COLORS: Record<TaskStatus, { bg: string; color: string; label: string }> = {
  [TaskStatus.Pending]:   { bg: '#fff8e1', color: '#f57f17', label: 'Pending' },
  [TaskStatus.Completed]: { bg: '#e8f5e9', color: '#2e7d32', label: 'Completed' },
  [TaskStatus.Cancelled]: { bg: '#f5f5f5', color: '#616161', label: 'Cancelled' },
};

interface StatusBadgeProps {
  status: StatusValue;
  overdue?: boolean;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

export default function StatusBadge({ status, overdue, size = 'small', sx }: StatusBadgeProps) {
  if (overdue && status === TaskStatus.Pending) {
    return (
      <Chip
        label="Overdue"
        size={size}
        sx={{ bgcolor: '#ffebee', color: '#b71c1c', fontWeight: 600, ...sx }}
      />
    );
  }

  const leadColors = LEAD_STATUS_COLORS[status as LeadStatus];
  if (leadColors) {
    return (
      <Chip
        label={leadColors.label}
        size={size}
        sx={{ bgcolor: leadColors.bg, color: leadColors.color, fontWeight: 600, ...sx }}
      />
    );
  }

  const taskColors = TASK_STATUS_COLORS[status as TaskStatus];
  if (taskColors) {
    return (
      <Chip
        label={taskColors.label}
        size={size}
        sx={{ bgcolor: taskColors.bg, color: taskColors.color, fontWeight: 600, ...sx }}
      />
    );
  }

  return <Chip label={status} size={size} sx={sx} />;
}
