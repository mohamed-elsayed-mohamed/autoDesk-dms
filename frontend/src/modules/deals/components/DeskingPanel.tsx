import {
  Box,
  Divider,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Deal, DealType } from '../types/deal.types';
import { DeskingInputs } from '../hooks/useDealCalculation';

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface DeskingPanelProps {
  deal: Deal;
  onUpdate: (inputs: DeskingInputs) => void;
  calculating?: boolean;
}

function OutputRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={bold ? 700 : 400}>{value}</Typography>
    </Box>
  );
}

export default function DeskingPanel({ deal, onUpdate, calculating = false }: DeskingPanelProps) {
  const isCash = deal.dealType === DealType.Cash;

  const handleChange =
    (field: keyof DeskingInputs) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const raw = e.target.value;
      const num = parseFloat(raw);
      onUpdate({ [field]: isNaN(num) ? undefined : num });
    };

  const handleDealTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ dealType: e.target.value as DealType });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Desking {calculating && <Typography component="span" variant="caption" color="text.secondary">(calculating…)</Typography>}
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            label="Deal Type"
            fullWidth
            size="small"
            value={deal.dealType}
            onChange={handleDealTypeChange}
          >
            {Object.values(DealType).map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Sale Price"
            fullWidth
            size="small"
            type="number"
            defaultValue={parseFloat(deal.salePrice)}
            onChange={handleChange('salePrice')}
            inputProps={{ min: 0, step: '100' }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Down Payment"
            fullWidth
            size="small"
            type="number"
            defaultValue={parseFloat(deal.downPayment)}
            onChange={handleChange('downPayment')}
            inputProps={{ min: 0, step: '100' }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Rebates"
            fullWidth
            size="small"
            type="number"
            defaultValue={parseFloat(deal.rebates)}
            onChange={handleChange('rebates')}
            inputProps={{ min: 0, step: '50' }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Tax Rate (%)"
            fullWidth
            size="small"
            type="number"
            defaultValue={parseFloat(deal.taxRate)}
            onChange={handleChange('taxRate')}
            inputProps={{ min: 0, step: '0.1' }}
          />
        </Grid>

        {!isCash && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="APR (%)"
                fullWidth
                size="small"
                type="number"
                defaultValue={parseFloat(deal.apr)}
                onChange={handleChange('apr')}
                inputProps={{ min: 0, step: '0.1' }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Term (months)"
                fullWidth
                size="small"
                type="number"
                defaultValue={deal.term}
                onChange={handleChange('term')}
                inputProps={{ min: 1, step: '1' }}
              />
            </Grid>
          </>
        )}
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" gutterBottom>Calculated Outputs</Typography>

      <Box sx={{ maxWidth: 360 }}>
        <OutputRow label="Total Tax" value={fmt.format(parseFloat(deal.totalTax))} />
        {!isCash && (
          <OutputRow label="Amount Financed" value={fmt.format(parseFloat(deal.amountFinanced))} />
        )}
        {!isCash && (
          <OutputRow label="Monthly Payment" value={fmt.format(parseFloat(deal.monthlyPayment))} />
        )}
        <OutputRow
          label="Front-End Gross"
          value={fmt.format(parseFloat(deal.frontEndGross))}
          bold
        />
        {deal.backEndGross != null && (
          <OutputRow label="Back-End Gross" value={fmt.format(parseFloat(deal.backEndGross))} />
        )}
      </Box>
    </Paper>
  );
}
