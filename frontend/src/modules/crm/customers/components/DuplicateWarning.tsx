import { Alert, Box, Button, Typography } from '@mui/material';
import type { DuplicateMatch } from '../../../../types';

interface DuplicateWarningProps {
  duplicates: DuplicateMatch[];
  onDismiss: () => void;
  onViewExisting: (id: string) => void;
}

export default function DuplicateWarning({ duplicates, onDismiss, onViewExisting }: DuplicateWarningProps) {
  if (duplicates.length === 0) return null;

  return (
    <Alert
      severity="warning"
      sx={{ mb: 2 }}
      action={
        <Button size="small" color="inherit" onClick={onDismiss}>
          Dismiss
        </Button>
      }
    >
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
        Possible duplicate customer{duplicates.length > 1 ? 's' : ''} found:
      </Typography>
      {duplicates.map((d) => (
        <Box key={d.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Typography variant="body2">
            {d.firstName} {d.lastName}
            {d.phone && ` — ${d.phone}`}
            {d.email && ` — ${d.email}`}
            {' '}(matched on {d.matchedOn})
          </Typography>
          <Button size="small" variant="outlined" color="warning" onClick={() => onViewExisting(d.id)}>
            View existing record
          </Button>
        </Box>
      ))}
    </Alert>
  );
}
