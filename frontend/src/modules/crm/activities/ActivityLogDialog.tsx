import React, { useState } from 'react';
import { getApiErrorMessage } from '../../../api/errorUtils';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import { createActivity } from '../../../api/activities';
import { ActivityType, ActivityDirection } from '../../../types';
import type { Activity } from '../../../types';

const DIRECTION_REQUIRED_TYPES: ActivityType[] = [
  ActivityType.Call,
  ActivityType.Email,
  ActivityType.Text,
  ActivityType.Visit,
];

interface ActivityLogDialogProps {
  open: boolean;
  customerId: string;
  leadId?: string;
  onClose: () => void;
  onCreated: (a: Activity) => void;
}

export default function ActivityLogDialog({
  open,
  customerId,
  leadId,
  onClose,
  onCreated,
}: ActivityLogDialogProps) {
  const [type, setType] = useState<ActivityType>(ActivityType.Call);
  const [direction, setDirection] = useState<ActivityDirection>(ActivityDirection.Outbound);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const showDirection = DIRECTION_REQUIRED_TYPES.includes(type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const activity = await createActivity({
        customerId,
        leadId,
        type,
        direction: showDirection ? direction : undefined,
        content: content || undefined,
      });
      onCreated(activity);
      setType(ActivityType.Call);
      setDirection(ActivityDirection.Outbound);
      setContent('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to log activity'));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Log Activity</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Type"
            select
            fullWidth
            value={type}
            onChange={(e) => setType(e.target.value as ActivityType)}
          >
            {Object.values(ActivityType).map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>
          {showDirection && (
            <TextField
              label="Direction"
              select
              fullWidth
              required
              value={direction}
              onChange={(e) => setDirection(e.target.value as ActivityDirection)}
            >
              {Object.values(ActivityDirection).map((d) => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            label="Notes (optional)"
            fullWidth
            multiline
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} /> : undefined}
          >
            {saving ? 'Saving...' : 'Log Activity'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
