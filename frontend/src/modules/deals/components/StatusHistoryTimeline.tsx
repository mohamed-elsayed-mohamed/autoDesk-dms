import { Box, Stack, Typography, Chip, Alert, Divider } from '@mui/material';
import { DealStatusHistoryEntry, DealStatus } from '../types/deal.types';
import StatusBadge from './StatusBadge';

interface StatusHistoryTimelineProps {
  history: DealStatusHistoryEntry[];
}

const ROLE_COLORS: Record<string, 'primary' | 'secondary' | 'default' | 'success' | 'warning' | 'info' | 'error'> = {
  SalesConsultant: 'primary',
  SalesManager: 'warning',
  FniManager: 'info',
  GeneralManager: 'success',
};

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function RoleChip({ role }: { role: string }) {
  const color = ROLE_COLORS[role] ?? 'default';
  // Make the role label more readable
  const label = role.replace(/([A-Z])/g, ' $1').trim();
  return (
    <Chip
      label={label}
      color={color}
      size="small"
      variant="outlined"
      sx={{ fontSize: '0.7rem', height: 20, fontWeight: 600 }}
    />
  );
}

export default function StatusHistoryTimeline({ history }: StatusHistoryTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        No status history available.
      </Typography>
    );
  }

  // Sort chronologically (oldest first)
  const sorted = [...history].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <Stack spacing={0}>
      {sorted.map((entry, index) => (
        <Box key={entry.id}>
          <Box sx={{ display: 'flex', gap: 1.5, py: 1.5 }}>
            {/* Timeline indicator */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
                width: 20,
              }}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  border: '2px solid',
                  borderColor: 'primary.light',
                  mt: 0.5,
                  flexShrink: 0,
                }}
              />
              {index < sorted.length - 1 && (
                <Box
                  sx={{
                    width: 2,
                    flexGrow: 1,
                    bgcolor: 'divider',
                    mt: 0.5,
                    minHeight: 24,
                  }}
                />
              )}
            </Box>

            {/* Content */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              {/* Status transition */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  flexWrap: 'wrap',
                  mb: 0.5,
                }}
              >
                {entry.previousStatus ? (
                  <>
                    <StatusBadge status={entry.previousStatus as DealStatus} size="small" />
                    <Typography variant="body2" color="text.secondary" sx={{ mx: 0.25 }}>
                      →
                    </Typography>
                    <StatusBadge status={entry.newStatus as DealStatus} size="small" />
                  </>
                ) : (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Created as
                    </Typography>
                    <StatusBadge status={entry.newStatus as DealStatus} size="small" />
                  </>
                )}
              </Box>

              {/* Actor row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={600}>
                  {entry.actorName}
                </Typography>
                <RoleChip role={entry.actorRole} />
              </Box>

              {/* Timestamp */}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: entry.note ? 0.75 : 0 }}>
                {formatDateTime(entry.createdAt)}
              </Typography>

              {/* Note */}
              {entry.note && (
                <Alert
                  severity="info"
                  sx={{
                    py: 0.25,
                    px: 1,
                    mt: 0.5,
                    '& .MuiAlert-message': { fontSize: '0.8rem', fontStyle: 'italic' },
                  }}
                >
                  {entry.note}
                </Alert>
              )}
            </Box>
          </Box>

          {index < sorted.length - 1 && <Divider sx={{ ml: 3.5 }} />}
        </Box>
      ))}
    </Stack>
  );
}
