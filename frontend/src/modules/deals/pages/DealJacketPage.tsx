import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DealStatus, DealType } from '../types/deal.types';
import { useDeal } from '../hooks/useDeal';
import StatusBadge from '../components/StatusBadge';
import StatusHistoryTimeline from '../components/StatusHistoryTimeline';
import DocumentsList from '../components/DocumentsList';

const BASE_URL = import.meta.env.VITE_API_URL || '';

function getToken() {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getCurrentUserRole(): string | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.role ?? null;
  } catch {
    return null;
  }
}

function fmt(value: string | number | null | undefined, prefix = '$'): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return `${prefix}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(value: string | null | undefined): string {
  if (!value) return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return `${num.toFixed(2)}%`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        {children}
      </CardContent>
    </Card>
  );
}

function FinancialRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 0.4,
      }}
    >
      <Typography variant="body2" color={bold ? 'text.primary' : 'text.secondary'} fontWeight={bold ? 700 : 400}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={bold ? 700 : 500}>
        {value}
      </Typography>
    </Box>
  );
}

// ─── Note dialog ──────────────────────────────────────────────────────────────

interface NoteDialogProps {
  open: boolean;
  title: string;
  onConfirm: (note: string) => void;
  onCancel: () => void;
  submitting: boolean;
}

function NoteDialog({ open, title, onConfirm, onCancel, submitting }: NoteDialogProps) {
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    if (!note.trim()) return;
    onConfirm(note.trim());
  };

  // Reset when dialog opens
  const handleEnter = () => setNote('');

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth TransitionProps={{ onEnter: handleEnter }}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          label="Note (required)"
          multiline
          minRows={3}
          fullWidth
          value={note}
          onChange={(e) => setNote(e.target.value)}
          sx={{ mt: 1 }}
          autoFocus
          helperText="Please provide a reason."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!note.trim() || submitting}
        >
          {submitting ? 'Submitting…' : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Pipeline Actions ─────────────────────────────────────────────────────────

interface PipelineActionsProps {
  dealId: string;
  status: DealStatus;
  onSuccess: () => void;
}

function PipelineActions({ dealId, status, onSuccess }: PipelineActionsProps) {
  const userRole = getCurrentUserRole();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    newStatus: DealStatus;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const openNoteDialog = (title: string, newStatus: DealStatus) => {
    setDialogConfig({ title, newStatus });
    setActionError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogConfig(null);
  };

  const postStatus = async (newStatus: DealStatus, note?: string) => {
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/deals/${dealId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getToken() },
        body: JSON.stringify({ newStatus, ...(note ? { note } : {}) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Request failed: ${res.status}`);
      }
      onSuccess();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectAction = (newStatus: DealStatus) => {
    postStatus(newStatus);
  };

  const handleNoteConfirm = (note: string) => {
    if (!dialogConfig) return;
    postStatus(dialogConfig.newStatus, note).then(() => {
      closeDialog();
    });
  };

  // Terminal statuses — no actions
  if (status === DealStatus.Funded || status === DealStatus.Unwound) {
    return null;
  }

  return (
    <Box>
      {actionError && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <Stack spacing={1}>
        {status === DealStatus.Desking && (
          <>
            {(userRole === 'SalesManager' || !userRole) && (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => handleDirectAction(DealStatus.Fni)}
                disabled={submitting}
              >
                Approve to F&I
              </Button>
            )}
            {(userRole === 'SalesConsultant' || !userRole) && (
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={() => openNoteDialog('Unwind Deal', DealStatus.Unwound)}
                disabled={submitting}
              >
                Unwind
              </Button>
            )}
          </>
        )}

        {status === DealStatus.Fni && (
          <>
            {(userRole === 'SalesManager' || !userRole) && (
              <Button
                variant="outlined"
                color="warning"
                fullWidth
                onClick={() => openNoteDialog('Send Back to Desking', DealStatus.Desking)}
                disabled={submitting}
              >
                Send Back to Desking
              </Button>
            )}
            {(userRole === 'SalesConsultant' || userRole === 'FniManager' || !userRole) && (
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => handleDirectAction(DealStatus.ContractsSigned)}
                disabled={submitting}
              >
                Advance to Contracts Signed
              </Button>
            )}
            {(userRole === 'SalesConsultant' || !userRole) && (
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={() => openNoteDialog('Unwind Deal', DealStatus.Unwound)}
                disabled={submitting}
              >
                Unwind
              </Button>
            )}
          </>
        )}

        {status === DealStatus.ContractsSigned && (
          <>
            {(userRole === 'SalesConsultant' || !userRole) && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  onClick={() => handleDirectAction(DealStatus.Delivered)}
                  disabled={submitting}
                >
                  Mark as Delivered
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  onClick={() => openNoteDialog('Unwind Deal', DealStatus.Unwound)}
                  disabled={submitting}
                >
                  Unwind
                </Button>
              </>
            )}
          </>
        )}

        {status === DealStatus.Delivered && (
          <>
            {(userRole === 'SalesConsultant' || !userRole) && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  onClick={() => handleDirectAction(DealStatus.Funded)}
                  disabled={submitting}
                >
                  Mark as Funded
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  onClick={() => openNoteDialog('Unwind Deal', DealStatus.Unwound)}
                  disabled={submitting}
                >
                  Unwind
                </Button>
              </>
            )}
          </>
        )}
      </Stack>

      {dialogConfig && (
        <NoteDialog
          open={dialogOpen}
          title={dialogConfig.title}
          onConfirm={handleNoteConfirm}
          onCancel={closeDialog}
          submitting={submitting}
        />
      )}
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealJacketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deal, loading, error, refetch } = useDeal(id ?? '');

  if (loading && !deal) {
    return (
      <Box>
        <Skeleton variant="text" width={340} height={52} sx={{ mb: 1 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rounded" height={140} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" height={140} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" height={260} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rounded" height={200} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (error && !deal) {
    return (
      <Alert severity="error" action={<Button onClick={refetch}>Retry</Button>}>
        {error}
      </Alert>
    );
  }

  if (!deal) return null;

  const customerName = deal.customer
    ? `${deal.customer.firstName} ${deal.customer.lastName}`
    : '—';

  const vehicleDesc = deal.vehicle
    ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}${deal.vehicle.trim ? ` ${deal.vehicle.trim}` : ''}`
    : '—';

  const userRole = getCurrentUserRole();
  const isCash = deal.dealType === DealType.Cash;

  // Net trade calculation
  const netTrade = deal.tradeIn
    ? parseFloat(deal.tradeIn.allowance) - parseFloat(deal.tradeIn.payoff)
    : null;

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            size="small"
            onClick={() => navigate('/deals')}
          >
            Back to Deals
          </Button>
          <Typography variant="h5" fontWeight={700}>
            Deal #{deal.dealNumber}
          </Typography>
          <StatusBadge status={deal.status} size="medium" />
          <Chip
            label={deal.dealType}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </Paper>

      <Grid container spacing={2}>
        {/* ── Left column (2/3) ── */}
        <Grid item xs={12} md={8}>

          {/* Customer Info */}
          <SectionCard title="Customer">
            <Stack spacing={0.5}>
              <Typography variant="body1" fontWeight={600}>{customerName}</Typography>
              {deal.customer?.email && (
                <Typography variant="body2" color="text.secondary">
                  {deal.customer.email}
                </Typography>
              )}
              {deal.customer?.phone && (
                <Typography variant="body2" color="text.secondary">
                  {deal.customer.phone}
                </Typography>
              )}
            </Stack>
          </SectionCard>

          {/* Vehicle Info */}
          <SectionCard title="Vehicle">
            <Stack spacing={0.5}>
              <Typography variant="body1" fontWeight={600}>{vehicleDesc}</Typography>
              {deal.vehicle && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    VIN: {deal.vehicle.vin}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Stock #: {deal.vehicle.stockNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Condition: {deal.vehicle.condition}
                  </Typography>
                </>
              )}
            </Stack>
          </SectionCard>

          {/* Financial Breakdown */}
          <SectionCard title="Financial Breakdown">
            <FinancialRow label="Sale Price" value={fmt(deal.salePrice)} />
            <FinancialRow label="Down Payment" value={fmt(deal.downPayment)} />
            <FinancialRow label="Rebates" value={fmt(deal.rebates)} />
            <FinancialRow label="Total Tax" value={fmt(deal.totalTax)} />

            {/* Fees itemized */}
            {deal.fees && deal.fees.length > 0 && (
              <>
                <Divider sx={{ my: 0.75 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 0.25 }}>
                  Fees
                </Typography>
                {deal.fees.map((fee) => (
                  <FinancialRow
                    key={fee.id}
                    label={`${fee.name}${fee.taxable ? ' (taxable)' : ''}`}
                    value={fmt(fee.amount)}
                  />
                ))}
              </>
            )}

            {/* Net trade */}
            {netTrade !== null && (
              <>
                <Divider sx={{ my: 0.75 }} />
                <FinancialRow
                  label="Net Trade"
                  value={fmt(netTrade.toFixed(2))}
                />
              </>
            )}

            <Divider sx={{ my: 0.75 }} />
            <FinancialRow label="Amount Financed" value={fmt(deal.amountFinanced)} bold />

            {/* Finance/Lease fields */}
            {!isCash && (
              <>
                <FinancialRow label="APR" value={fmtPct(deal.apr)} />
                <FinancialRow label="Term" value={deal.term ? `${deal.term} months` : '—'} />
                <FinancialRow label="Monthly Payment" value={fmt(deal.monthlyPayment)} bold />
              </>
            )}

            <Divider sx={{ my: 0.75 }} />
            <FinancialRow label="Front-End Gross" value={fmt(deal.frontEndGross)} bold />
            {deal.backEndGross !== null && deal.backEndGross !== undefined && (
              <FinancialRow label="Back-End Gross" value={fmt(deal.backEndGross)} bold />
            )}
          </SectionCard>

          {/* Trade-In Detail */}
          {deal.tradeIn && (
            <SectionCard title="Trade-In">
              <Stack spacing={0.5}>
                <Typography variant="body1" fontWeight={600}>
                  {deal.tradeIn.year} {deal.tradeIn.make} {deal.tradeIn.model}
                </Typography>
                {deal.tradeIn.vin && (
                  <Typography variant="body2" color="text.secondary">
                    VIN: {deal.tradeIn.vin}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  Condition: {deal.tradeIn.condition}
                </Typography>
              </Stack>
              <Divider sx={{ my: 1 }} />
              <FinancialRow label="ACV" value={fmt(deal.tradeIn.acv)} />
              <FinancialRow label="Allowance" value={fmt(deal.tradeIn.allowance)} />
              <FinancialRow label="Payoff" value={fmt(deal.tradeIn.payoff)} />
              {netTrade !== null && (
                <FinancialRow label="Net Trade" value={fmt(netTrade.toFixed(2))} bold />
              )}
              {deal.tradeIn.lenderName && (
                <FinancialRow label="Lender" value={deal.tradeIn.lenderName} />
              )}
            </SectionCard>
          )}

          {/* Documents */}
          <SectionCard title="Documents">
            <DocumentsList
              dealId={deal.id}
              documents={deal.documents ?? []}
              onGenerated={refetch}
              canGenerate={
                userRole === 'SalesConsultant' || userRole === 'FniManager'
              }
            />
          </SectionCard>
        </Grid>

        {/* ── Right column (1/3) ── */}
        <Grid item xs={12} md={4}>
          {/* Pipeline Actions */}
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Pipeline Actions
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <PipelineActions dealId={deal.id} status={deal.status} onSuccess={refetch} />
              {(deal.status === DealStatus.Funded || deal.status === DealStatus.Unwound) && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  This deal is in a terminal state. No further actions are available.
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Status History Timeline */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Status History
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <StatusHistoryTimeline history={deal.statusHistory ?? []} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
