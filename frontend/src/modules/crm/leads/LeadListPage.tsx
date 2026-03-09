import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Skeleton,
  Alert,
  MenuItem,
  TextField,
  Grid,
  Link,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { getLeads } from '../../../api/leads';
import type { LeadListItem, PaginationMeta } from '../../../types';
import { LeadStatus, LeadSource, UserRole } from '../../../types';
import { useAuth } from '../../auth/AuthContext';
import StatusBadge from '../../../components/StatusBadge';
import PipelineBoard from './components/PipelineBoard';
import apiClient from '../../../api/client';

interface Salesperson {
  id: string;
  firstName: string;
  lastName: string;
}

export default function LeadListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user?.role === UserRole.SalesManager;

  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 25, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [view, setView] = useState<'list' | 'board'>('list');

  const [selectedStatuses, setSelectedStatuses] = useState<LeadStatus[]>([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [source, setSource] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);

  useEffect(() => {
    if (isManager) {
      apiClient.get('/api/users', { params: { role: 'SalesConsultant' } })
        .then((r) => setSalespeople(r.data.data || r.data))
        .catch(() => {});
    }
  }, [isManager]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getLeads({
        status: selectedStatuses.length === 1 ? selectedStatuses[0] : undefined,
        assignedTo: assignedTo || undefined,
        source: source || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page: page + 1,
        limit: view === 'board' ? 200 : 25,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setLeads(result.data);
      setMeta(result.meta);
    } catch {
      setError('Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedStatuses, assignedTo, source, fromDate, toDate, page, view]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const toggleStatus = (s: LeadStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
    setPage(0);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Leads</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isManager && (
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={(_, v) => v && setView(v)}
              size="small"
            >
              <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
              <ToggleButton value="board"><ViewColumnIcon fontSize="small" /></ToggleButton>
            </ToggleButtonGroup>
          )}
          <Button
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={() => navigate('/leads/new')}
          >
            New Lead
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button size="small" color="inherit" onClick={fetchLeads}>Retry</Button>
        }>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter by status:</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {Object.values(LeadStatus).map((s) => (
              <Chip
                key={s}
                label={s === LeadStatus.AppointmentSet ? 'Appt Set' : s}
                size="small"
                variant={selectedStatuses.includes(s) ? 'filled' : 'outlined'}
                onClick={() => toggleStatus(s)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>
        <Grid container spacing={2}>
          {isManager && (
            <Grid item xs={12} sm={3}>
              <TextField
                label="Assigned To"
                select
                fullWidth
                size="small"
                value={assignedTo}
                onChange={(e) => { setAssignedTo(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All</MenuItem>
                {salespeople.map((sp) => (
                  <MenuItem key={sp.id} value={sp.id}>
                    {sp.firstName} {sp.lastName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          <Grid item xs={12} sm={3}>
            <TextField
              label="Source"
              select
              fullWidth
              size="small"
              value={source}
              onChange={(e) => { setSource(e.target.value); setPage(0); }}
            >
              <MenuItem value="">All</MenuItem>
              {Object.values(LeadSource).map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              label="From Date"
              type="date"
              fullWidth
              size="small"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              label="To Date"
              type="date"
              fullWidth
              size="small"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(0); }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      {view === 'board' ? (
        loading ? (
          <Skeleton variant="rounded" height={300} />
        ) : (
          <PipelineBoard leads={leads} />
        )
      ) : loading ? (
        <Paper>
          <Table>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}><Skeleton /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : leads.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>No leads found.</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try adjusting your filters or create a new lead.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/leads/new')}>Create Lead</Button>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Assignee</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Vehicles</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id} hover sx={{ cursor: 'pointer' }}>
                    <TableCell>
                      <Link
                        component="button"
                        variant="body2"
                        sx={{ fontWeight: 600, textDecoration: 'none' }}
                        onClick={() => navigate(`/leads/${l.id}`)}
                      >
                        {l.customer.firstName} {l.customer.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{l.source}</TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                    <TableCell>
                      {l.assignee
                        ? `${l.assignee.firstName} ${l.assignee.lastName}`
                        : <Typography variant="body2" color="text.secondary">Unassigned</Typography>}
                    </TableCell>
                    <TableCell>{l.vehicleCount}</TableCell>
                    <TableCell>{new Date(l.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={meta.total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={25}
            rowsPerPageOptions={[25]}
          />
        </Paper>
      )}
    </Box>
  );
}
