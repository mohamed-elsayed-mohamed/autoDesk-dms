import { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { TradeIn, TradeInCondition, UpsertTradeInRequest } from '../types/deal.types';

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface TradeInFormProps {
  tradeIn: TradeIn | null;
  dealId: string;
  onSave: (dto: UpsertTradeInRequest) => Promise<void>;
  onRemove: () => Promise<void>;
  readOnly?: boolean;
}

const CONDITION_OPTIONS: TradeInCondition[] = [
  TradeInCondition.Excellent,
  TradeInCondition.Good,
  TradeInCondition.Fair,
  TradeInCondition.Poor,
];

function emptyForm(): UpsertTradeInRequest {
  return {
    vin: '',
    year: new Date().getFullYear(),
    make: '',
    model: '',
    mileage: 0,
    condition: TradeInCondition.Good,
    acv: 0,
    allowance: 0,
    payoff: 0,
    lenderName: '',
  };
}

function tradeInToForm(t: TradeIn): UpsertTradeInRequest {
  return {
    vin: t.vin ?? '',
    year: t.year,
    make: t.make,
    model: t.model,
    mileage: t.mileage,
    condition: t.condition,
    acv: parseFloat(t.acv),
    allowance: parseFloat(t.allowance),
    payoff: parseFloat(t.payoff),
    lenderName: t.lenderName ?? '',
  };
}

export default function TradeInForm({
  tradeIn,
  onSave,
  onRemove,
  readOnly = false,
}: TradeInFormProps) {
  const [form, setForm] = useState<UpsertTradeInRequest>(
    tradeIn ? tradeInToForm(tradeIn) : emptyForm(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Sync form when tradeIn prop changes (e.g. after server round-trip)
  useEffect(() => {
    setForm(tradeIn ? tradeInToForm(tradeIn) : emptyForm());
  }, [tradeIn]);

  const netTrade = form.allowance - form.payoff;
  const netTradeColor = netTrade < 0 ? 'error.main' : 'text.primary';

  const handleTextChange =
    (field: keyof UpsertTradeInRequest) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleNumberChange =
    (field: keyof UpsertTradeInRequest) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      setForm((prev) => ({ ...prev, [field]: isNaN(value) ? 0 : value }));
    };

  const handleIntChange =
    (field: keyof UpsertTradeInRequest) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      setForm((prev) => ({ ...prev, [field]: isNaN(value) ? 0 : value }));
    };

  const handleConditionChange = (e: SelectChangeEvent<TradeInCondition>) => {
    setForm((prev) => ({ ...prev, condition: e.target.value as TradeInCondition }));
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const dto: UpsertTradeInRequest = {
        ...form,
        vin: form.vin?.trim() || undefined,
        lenderName: form.lenderName?.trim() || undefined,
      };
      await onSave(dto);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while saving the trade-in.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveConfirm = async () => {
    setConfirmOpen(false);
    setError(null);
    setRemoving(true);
    try {
      await onRemove();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while removing the trade-in.';
      setError(msg);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <Accordion defaultExpanded={!!tradeIn} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DirectionsCarIcon fontSize="small" color="action" />
            <Typography variant="subtitle1" fontWeight={600}>
              Trade-In
            </Typography>
            {tradeIn && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {tradeIn.year} {tradeIn.make} {tradeIn.model}
              </Typography>
            )}
          </Box>
        </AccordionSummary>

        <AccordionDetails>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Stack spacing={2}>
            {/* Row 1: VIN (optional) */}
            <TextField
              label="VIN (optional)"
              value={form.vin ?? ''}
              onChange={handleTextChange('vin')}
              inputProps={{ maxLength: 17 }}
              helperText="17 characters"
              disabled={readOnly}
              fullWidth
              size="small"
            />

            {/* Row 2: Year / Make / Model */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Year"
                type="number"
                value={form.year}
                onChange={handleIntChange('year')}
                inputProps={{ min: 1900, max: new Date().getFullYear() + 1 }}
                disabled={readOnly}
                size="small"
                sx={{ width: { sm: 120 } }}
              />
              <TextField
                label="Make"
                value={form.make}
                onChange={handleTextChange('make')}
                disabled={readOnly}
                size="small"
                fullWidth
              />
              <TextField
                label="Model"
                value={form.model}
                onChange={handleTextChange('model')}
                disabled={readOnly}
                size="small"
                fullWidth
              />
            </Stack>

            {/* Row 3: Mileage / Condition */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Mileage"
                type="number"
                value={form.mileage}
                onChange={handleIntChange('mileage')}
                inputProps={{ min: 0 }}
                disabled={readOnly}
                size="small"
                sx={{ width: { sm: 160 } }}
              />
              <FormControl size="small" sx={{ minWidth: 160 }} disabled={readOnly}>
                <InputLabel id="trade-in-condition-label">Condition</InputLabel>
                <Select
                  labelId="trade-in-condition-label"
                  label="Condition"
                  value={form.condition}
                  onChange={handleConditionChange}
                >
                  {CONDITION_OPTIONS.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Row 4: ACV / Allowance / Payoff */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="ACV ($)"
                type="number"
                value={form.acv}
                onChange={handleNumberChange('acv')}
                inputProps={{ min: 0, step: '0.01' }}
                disabled={readOnly}
                size="small"
                fullWidth
              />
              <TextField
                label="Allowance ($)"
                type="number"
                value={form.allowance}
                onChange={handleNumberChange('allowance')}
                inputProps={{ min: 0, step: '0.01' }}
                disabled={readOnly}
                size="small"
                fullWidth
              />
              <TextField
                label="Payoff ($)"
                type="number"
                value={form.payoff}
                onChange={handleNumberChange('payoff')}
                inputProps={{ min: 0, step: '0.01' }}
                disabled={readOnly}
                size="small"
                fullWidth
              />
            </Stack>

            {/* Net Trade computed display */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.5,
                bgcolor: 'action.hover',
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                Net Trade
              </Typography>
              <Typography variant="body1" fontWeight={600} color={netTradeColor}>
                {fmt.format(netTrade)}
              </Typography>
            </Box>

            {/* Row 5: Lender Name (optional) */}
            <TextField
              label="Lender Name (optional)"
              value={form.lenderName ?? ''}
              onChange={handleTextChange('lenderName')}
              disabled={readOnly}
              size="small"
              fullWidth
            />

            {/* Actions */}
            {!readOnly && (
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                {tradeIn && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setConfirmOpen(true)}
                    disabled={removing || saving}
                  >
                    {removing ? 'Removing…' : 'Remove Trade-In'}
                  </Button>
                )}
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving || removing}
                >
                  {saving ? 'Saving…' : tradeIn ? 'Update Trade-In' : 'Add Trade-In'}
                </Button>
              </Stack>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Remove confirmation dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Remove Trade-In?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will remove the trade-in from the deal and recalculate the deal totals.
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={removing}>
            Cancel
          </Button>
          <Button
            onClick={handleRemoveConfirm}
            color="error"
            variant="contained"
            disabled={removing}
          >
            {removing ? 'Removing…' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
