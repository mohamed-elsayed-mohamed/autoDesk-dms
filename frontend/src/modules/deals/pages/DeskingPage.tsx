import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Skeleton,
  Typography,
} from '@mui/material';
import { Deal, CreateDealFeeRequest, UpdateDealFeeRequest, UpsertTradeInRequest, DealStatus } from '../types/deal.types';
import { useDeal } from '../hooks/useDeal';
import { useDealCalculation, DeskingInputs } from '../hooks/useDealCalculation';
import StatusBadge from '../components/StatusBadge';
import DeskingPanel from '../components/DeskingPanel';
import FeeTable from '../components/FeeTable';
import TradeInForm from '../components/TradeInForm';

const BASE_URL = import.meta.env.VITE_API_URL || '';

function getToken(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function DeskingPage() {
  const { id } = useParams<{ id: string }>();
  const { deal, loading, error, refetch } = useDeal(id ?? '');
  const [localDeal, setLocalDeal] = useState<Deal | null>(null);

  const activeDeal = localDeal ?? deal;

  const handleCalcSuccess = useCallback((updated: Deal) => {
    setLocalDeal(updated);
  }, []);

  const { update, calculating, error: calcError, conflictDeal, clearConflict } =
    useDealCalculation(id ?? '', activeDeal?.updatedAt ?? '', handleCalcSuccess);

  const handleUpdate = useCallback(
    (inputs: DeskingInputs) => {
      update(inputs);
    },
    [update],
  );

  const handleAddFee = async (fee: CreateDealFeeRequest) => {
    const res = await fetch(`${BASE_URL}/api/deals/${id}/fees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getToken() },
      body: JSON.stringify(fee),
    });
    if (!res.ok) throw new Error('Failed to add fee');
    refetch();
  };

  const handleUpdateFee = async (feeId: string, fee: UpdateDealFeeRequest) => {
    const res = await fetch(`${BASE_URL}/api/deals/${id}/fees/${feeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getToken() },
      body: JSON.stringify(fee),
    });
    if (!res.ok) throw new Error('Failed to update fee');
    refetch();
  };

  const TRADE_IN_LOCKED_STATUSES: DealStatus[] = [DealStatus.Delivered, DealStatus.Funded, DealStatus.Unwound];
  const tradeInReadOnly = activeDeal ? TRADE_IN_LOCKED_STATUSES.includes(activeDeal.status) : false;

  const handleSaveTradeIn = async (dto: UpsertTradeInRequest) => {
    const hasTradeIn = !!activeDeal?.tradeIn;
    const res = await fetch(`${BASE_URL}/api/deals/${id}/trade-in`, {
      method: hasTradeIn ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', ...getToken() },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Failed to save trade-in');
    refetch();
  };

  const handleRemoveTradeIn = async () => {
    const res = await fetch(`${BASE_URL}/api/deals/${id}/trade-in`, {
      method: 'DELETE',
      headers: getToken(),
    });
    if (!res.ok) throw new Error('Failed to remove trade-in');
    refetch();
  };

  const handleRemoveFee = async (feeId: string) => {
    const res = await fetch(`${BASE_URL}/api/deals/${id}/fees/${feeId}`, {
      method: 'DELETE',
      headers: getToken(),
    });
    if (!res.ok) throw new Error('Failed to remove fee');
    refetch();
  };

  if (loading && !activeDeal) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={160} />
      </Box>
    );
  }

  if (error && !activeDeal) {
    return (
      <Alert severity="error" action={<Button onClick={refetch}>Retry</Button>}>
        {error}
      </Alert>
    );
  }

  if (!activeDeal) return null;

  const customerName = activeDeal.customer
    ? `${activeDeal.customer.firstName} ${activeDeal.customer.lastName}`
    : '—';
  const vehicleDesc = activeDeal.vehicle
    ? `${activeDeal.vehicle.year} ${activeDeal.vehicle.make} ${activeDeal.vehicle.model}${activeDeal.vehicle.trim ? ` ${activeDeal.vehicle.trim}` : ''}`
    : '—';

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h5" fontWeight={700}>
            Deal #{activeDeal.dealNumber}
          </Typography>
          <StatusBadge status={activeDeal.status} size="medium" />
          <Typography variant="body1" color="text.secondary">
            {customerName}
          </Typography>
          <Typography variant="body1" color="text.secondary">·</Typography>
          <Typography variant="body1" color="text.secondary">
            {vehicleDesc}
          </Typography>
        </Box>
      </Paper>

      {/* Conflict warning */}
      {conflictDeal && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button
              size="small"
              color="inherit"
              onClick={() => { setLocalDeal(conflictDeal); clearConflict(); }}
            >
              Load latest
            </Button>
          }
        >
          Deal was modified by another user. Your changes were not saved.
        </Alert>
      )}

      {calcError && (
        <Alert severity="error" sx={{ mb: 2 }}>{calcError}</Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <DeskingPanel deal={activeDeal} onUpdate={handleUpdate} calculating={calculating} />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>Fees</Typography>
          <FeeTable
            fees={activeDeal.fees ?? []}
            dealId={activeDeal.id}
            onAdd={handleAddFee}
            onUpdate={handleUpdateFee}
            onRemove={handleRemoveFee}
          />
        </Grid>

        <Grid item xs={12}>
          <TradeInForm
            tradeIn={activeDeal.tradeIn ?? null}
            dealId={activeDeal.id}
            onSave={handleSaveTradeIn}
            onRemove={handleRemoveTradeIn}
            readOnly={tradeInReadOnly}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
