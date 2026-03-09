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
  FormControlLabel,
  Switch,
  Alert,
  Link,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { getCustomers } from '../../../api/customers';
import type { CustomerListItem, PaginationMeta } from '../../../types';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '../../../types';
import CustomerSearchBar from './components/CustomerSearchBar';

export default function CustomerListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 25, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(25);
  const [includeArchived, setIncludeArchived] = useState(false);

  const isManager = user?.role === UserRole.SalesManager;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCustomers({
        search: search || undefined,
        includeArchived,
        page: page + 1,
        limit: rowsPerPage,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setCustomers(result.data);
      setMeta(result.meta);
    } catch {
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, includeArchived, page, rowsPerPage]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(0);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Customers</Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleIcon />}
          onClick={() => navigate('/customers/new')}
        >
          New Customer
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <Button size="small" color="inherit" onClick={fetchCustomers}>Retry</Button>
        }>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <CustomerSearchBar value={search} onChange={handleSearchChange} />
          </Box>
          {isManager && (
            <FormControlLabel
              control={
                <Switch
                  checked={includeArchived}
                  onChange={(e) => { setIncludeArchived(e.target.checked); setPage(0); }}
                  size="small"
                />
              }
              label="Show archived"
            />
          )}
        </Box>
      </Paper>

      {loading ? (
        <Paper>
          <Table>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((_, j) => (
                    <TableCell key={j}><Skeleton /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : customers.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No customers found.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {search ? 'Try adjusting your search.' : 'Create the first one.'}
          </Typography>
          {!search && (
            <Button variant="contained" onClick={() => navigate('/customers/new')}>
              Create Customer
            </Button>
          )}
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Preferred Contact</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Leads</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id} hover sx={{ cursor: 'pointer' }}>
                    <TableCell>
                      <Link
                        component="button"
                        variant="body2"
                        sx={{ fontWeight: 600, textDecoration: 'none' }}
                        onClick={() => navigate(`/customers/${c.id}`)}
                      >
                        {c.firstName} {c.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{c.phone || '—'}</TableCell>
                    <TableCell>{c.email || '—'}</TableCell>
                    <TableCell>{c.preferredContact}</TableCell>
                    <TableCell>{c.leadCount}</TableCell>
                    <TableCell>
                      {c.archivedAt && (
                        <Chip label="Archived" size="small" color="default" />
                      )}
                    </TableCell>
                    <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
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
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[25]}
          />
        </Paper>
      )}
    </Box>
  );
}
