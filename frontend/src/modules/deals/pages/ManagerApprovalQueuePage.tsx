import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Deal, DealStatus } from '../types/deal.types';
import { useDeals } from '../hooks/useDeals';
import StatusBadge from '../components/StatusBadge';

const BASE_URL = import.meta.env.VITE_API_URL || '';

function getToken(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Note Dialog ──────────────────────────────────────────────────────────────

interface SendBackDialogProps {
  open: boolean;
  dealNumber: number | null;
  onConfirm: (note: string) => void;
  onCancel: () => void;
  submitting: boolean;
}

function SendBackDialog({ open, dealNumber, onConfirm, onCancel, submitting }: SendBackDialogProps) {
  const [note, setNote] = useState('');

  const handleEnter = () => setNote('');

  const handleConfirm = () => {
    if (!note.trim()) return;
    onConfirm(note.trim());
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onEnter: handleEnter }}
    >
      <DialogTitle>Send Back to Desking{dealNumber ? ` — Deal #${dealNumber}` : ''}</DialogTitle>
      <DialogContent>
        <TextField
          label="Reason (required)"
          multiline
          minRows={3}
          fullWidth
          value={note}
          onChange={(e) => setNote(e.target.value)}
          sx={{ mt: 1 }}
          autoFocus
          helperText="Explain why the deal is being sent back."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleConfirm}
          disabled={!note.trim() || submitting}
        >
          {submitting ? 'Submitting…' : 'Send Back'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Row Actions ──────────────────────────────────────────────────────────────

interface RowActionsProps {
  deal: Deal;
  onSuccess: () => void;
}

function RowActions({ deal, onSuccess }: RowActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const postStatus = async (newStatus: DealStatus, note?: string) => {
    setSubmitting(true);
    setRowError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/deals/${deal.id}/status`, {
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
      setRowError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = () => {
    postStatus(DealStatus.Fni);
  };

  const handleSendBackConfirm = (note: string) => {
    postStatus(DealStatus.Desking, note).then(() => {
      setDialogOpen(false);
    });
  };

  return (
    <>
      {rowError && (
        <Typography variant="caption" color="error" display="block" sx={{ mb: 0.5 }}>
          {rowError}
        </Typography>
      )}
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={handleApprove}
          disabled={submitting}
        >
          Approve
        </Button>
        <Button
          variant="outlined"
          color="warning"
          size="small"
          onClick={() => setDialogOpen(true)}
          disabled={submitting}
        >
          Send Back
        </Button>
      </Stack>

      <SendBackDialog
        open={dialogOpen}
        dealNumber={deal.dealNumber}
        onConfirm={handleSendBackConfirm}
        onCancel={() => setDialogOpen(false)}
        submitting={submitting}
      />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManagerApprovalQueuePage() {
  const navigate = useNavigate();
  const { deals, loading, error, refetch } = useDeals({ status: DealStatus.Desking, pageSize: 100 });

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [salespersonSearch, setSalespersonSearch] = useState('');

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // Date range filter
      if (dateFrom) {
        const created = new Date(deal.createdAt);
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (created < from) return false;
      }
      if (dateTo) {
        const created = new Date(deal.createdAt);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (created > to) return false;
      }

      // Salesperson name filter
      if (salespersonSearch.trim()) {
        const search = salespersonSearch.trim().toLowerCase();
        const name = deal.createdBy
          ? `${deal.createdBy.firstName} ${deal.createdBy.lastName}`.toLowerCase()
          : '';
        if (!name.includes(search)) return false;
      }

      return true;
    });
  }, [deals, dateFrom, dateTo, salespersonSearch]);

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            Manager Approval Queue
          </Typography>
          <StatusBadge status={DealStatus.Desking} size="medium" />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Review deals awaiting your approval to advance to F&I.
        </Typography>
      </Paper>

      {/* Filter Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            label="From Date"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="To Date"
            type="date"
            size="small"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="Sales Consultant"
            size="small"
            value={salespersonSearch}
            onChange={(e) => setSalespersonSearch(e.target.value)}
            placeholder="Search by name…"
            sx={{ minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {(dateFrom || dateTo || salespersonSearch) && (
            <Button
              size="small"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSalespersonSearch('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" action={<Button onClick={refetch}>Retry</Button>} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700 } }}>
              <TableCell>Deal #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Vehicle</TableCell>
              <TableCell>Sales Consultant</TableCell>
              <TableCell>Created Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton variant="text" width={j === 5 ? 140 : 100} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}

            {!loading && filteredDeals.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No deals awaiting approval
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}

            {!loading && filteredDeals.map((deal) => {
              const customerName = deal.customer
                ? `${deal.customer.firstName} ${deal.customer.lastName}`
                : deal.customerId;

              const vehicleDesc = deal.vehicle
                ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}${deal.vehicle.trim ? ` ${deal.vehicle.trim}` : ''}`
                : deal.vehicleId;

              const salespersonName = deal.createdBy
                ? `${deal.createdBy.firstName} ${deal.createdBy.lastName}`
                : '—';

              return (
                <TableRow
                  key={deal.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell
                    onClick={() => navigate(`/deals/${deal.id}/jacket`)}
                    sx={{ fontWeight: 700, color: 'primary.main' }}
                  >
                    #{deal.dealNumber}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/deals/${deal.id}/jacket`)}>
                    {customerName}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/deals/${deal.id}/jacket`)}>
                    {vehicleDesc}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/deals/${deal.id}/jacket`)}>
                    {salespersonName}
                  </TableCell>
                  <TableCell onClick={() => navigate(`/deals/${deal.id}/jacket`)}>
                    {formatDate(deal.createdAt)}
                  </TableCell>
                  <TableCell align="right">
                    <RowActions deal={deal} onSuccess={refetch} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
