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
import { createTask } from '../../../api/tasks';
import { TaskType } from '../../../types';
import type { Task } from '../../../types';

interface TaskFormDialogProps {
  open: boolean;
  leadId: string;
  onClose: () => void;
  onCreated: (t: Task) => void;
}

export default function TaskFormDialog({ open, leadId, onClose, onCreated }: TaskFormDialogProps) {
  const [type, setType] = useState<string>(TaskType.Call);
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueAt) { setError('Please set a due date and time'); return; }
    setSaving(true);
    setError('');
    try {
      const task = await createTask({
        leadId,
        type: type || undefined,
        description: description || undefined,
        dueAt: new Date(dueAt).toISOString(),
      });
      onCreated(task);
      setType(TaskType.Call);
      setDescription('');
      setDueAt('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create task'));
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
        <DialogTitle>Add Task</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Type"
            select
            fullWidth
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {Object.values(TaskType).map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            label="Due Date & Time"
            type="datetime-local"
            fullWidth
            required
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
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
            {saving ? 'Saving...' : 'Add Task'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
