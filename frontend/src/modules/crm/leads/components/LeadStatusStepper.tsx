import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Step,
  StepButton,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { LeadStatus } from '../../../../types';

const PIPELINE_STEPS: LeadStatus[] = [
  LeadStatus.New,
  LeadStatus.Contacted,
  LeadStatus.AppointmentSet,
  LeadStatus.Showed,
  LeadStatus.Negotiating,
];

const STEP_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.New]: 'New',
  [LeadStatus.Contacted]: 'Contacted',
  [LeadStatus.AppointmentSet]: 'Appt Set',
  [LeadStatus.Showed]: 'Showed',
  [LeadStatus.Negotiating]: 'Negotiating',
  [LeadStatus.Sold]: 'Sold',
  [LeadStatus.Lost]: 'Lost',
};

interface LeadStatusStepperProps {
  status: LeadStatus;
  onStatusChange?: (status: LeadStatus, lostReason?: string) => void;
  disabled?: boolean;
}

export default function LeadStatusStepper({ status, onStatusChange, disabled }: LeadStatusStepperProps) {
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');

  const activeStep = PIPELINE_STEPS.indexOf(status);
  const isSold = status === LeadStatus.Sold;
  const isLost = status === LeadStatus.Lost;
  const isTerminal = isSold || isLost;

  const handleStepClick = (step: LeadStatus) => {
    if (disabled || !onStatusChange) return;
    onStatusChange(step);
  };

  const handleLostClick = () => {
    if (disabled || !onStatusChange) return;
    setLostReason('');
    setLostDialogOpen(true);
  };

  const handleSoldClick = () => {
    if (disabled || !onStatusChange || isLost) return;
    onStatusChange(LeadStatus.Sold);
  };

  const confirmLost = () => {
    if (onStatusChange) {
      onStatusChange(LeadStatus.Lost, lostReason || undefined);
    }
    setLostDialogOpen(false);
    setLostReason('');
  };

  return (
    <Box>
      <Stepper nonLinear activeStep={activeStep} sx={{ mb: 2 }}>
        {PIPELINE_STEPS.map((step) => {
          const stepIdx = PIPELINE_STEPS.indexOf(step);
          const completed = activeStep > stepIdx && !isTerminal;
          return (
            <Step key={step} completed={completed}>
              <StepButton
                onClick={() => handleStepClick(step)}
                disabled={disabled || isTerminal}
              >
                {STEP_LABELS[step]}
              </StepButton>
            </Step>
          );
        })}
      </Stepper>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">Outcome:</Typography>
        <Chip
          label="Sold"
          size="small"
          onClick={handleSoldClick}
          disabled={disabled || isLost}
          sx={{
            fontWeight: 600,
            cursor: disabled || isLost ? 'default' : 'pointer',
            bgcolor: isSold ? '#e8f5e9' : undefined,
            color: isSold ? '#1b5e20' : undefined,
            border: isSold ? '2px solid #1b5e20' : undefined,
            opacity: isLost ? 0.4 : 1,
          }}
        />
        <Chip
          label="Lost"
          size="small"
          onClick={handleLostClick}
          disabled={disabled || isSold}
          sx={{
            fontWeight: 600,
            cursor: disabled || isSold ? 'default' : 'pointer',
            bgcolor: isLost ? '#ffebee' : undefined,
            color: isLost ? '#b71c1c' : undefined,
            border: isLost ? '2px solid #b71c1c' : undefined,
            opacity: isSold ? 0.4 : 1,
          }}
        />
      </Box>

      <Dialog open={lostDialogOpen} onClose={() => setLostDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Mark as Lost</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason (optional)"
            fullWidth
            multiline
            rows={3}
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            placeholder="Why was this lead lost?"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLostDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmLost}>
            Mark as Lost
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
