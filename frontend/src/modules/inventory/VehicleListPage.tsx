import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  Grid,
  MenuItem,
  Collapse,
  Skeleton,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ClearIcon from '@mui/icons-material/Clear';
import { listVehicles, type ListVehiclesParams } from '../../api/vehicles';
import type { VehicleListItem, PaginationMeta } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { Condition, UserRole } from '../../types';
import VehicleStatusBadge from '../../components/VehicleStatusBadge';

function SortHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
}: {
  label: string;
  field: string;
  currentSort: string;
  currentOrder: string;
  onSort: (field: string) => void;
}) {
  const active = currentSort === field;
  return (
    <TableCell
      sx={{ cursor: 'pointer', userSelect: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
      onClick={() => onSort(field)}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {label}
        {active && (currentOrder === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
      </Box>
    </TableCell>
  );
}

export default function VehicleListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 25, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('dateAcquired');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params: ListVehiclesParams = {
        page,
        limit: 25,
        sortBy,
        sortOrder,
      };
      if (search) params.q = search;
      if (filters.make) params.make = filters.make;
      if (filters.model) params.model = filters.model;
      if (filters.year) params.year = parseInt(filters.year, 10);
      if (filters.bodyStyle) params.bodyStyle = filters.bodyStyle;
      if (filters.condition) params.condition = filters.condition;
      if (filters.minPrice) params.minPrice = parseFloat(filters.minPrice);
      if (filters.maxPrice) params.maxPrice = parseFloat(filters.maxPrice);
      if (filters.color) params.color = filters.color;
      if (filters.minMileage) params.minMileage = parseInt(filters.minMileage, 10);
      if (filters.maxMileage) params.maxMileage = parseInt(filters.maxMileage, 10);

      const result = await listVehicles(params);
      setVehicles(result.data);
      setMeta(result.meta);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortOrder, filters]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchVehicles();
  };

  const clearFilters = () => {
    setFilters({});
    setSearch('');
    setPage(1);
  };

  const handleFilterChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const formatPrice = (price: string | null) => {
    if (!price) return '-';
    return `$${parseFloat(price).toLocaleString()}`;
  };

  const totalPages = Math.ceil(meta.total / meta.limit);
  const isManager = user?.role === UserRole.InventoryManager;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Inventory</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isManager && (
            <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => navigate('/vehicles/new')}>
              Add Vehicle
            </Button>
          )}
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: 8 }}>
            <TextField
              size="small"
              placeholder="Search by make, model, trim, or VIN..."
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              }}
            />
            <Button type="submit" variant="outlined" size="small">Search</Button>
          </form>
          <Button
            variant={showFilters ? 'contained' : 'outlined'}
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
            size="small"
          >
            Filters
          </Button>
          {(search || Object.values(filters).some(Boolean)) && (
            <Button startIcon={<ClearIcon />} onClick={clearFilters} size="small" color="secondary">
              Clear
            </Button>
          )}
        </Box>

        <Collapse in={showFilters}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6} sm={2}>
              <TextField size="small" label="Make" fullWidth value={filters.make || ''} onChange={handleFilterChange('make')} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField size="small" label="Model" fullWidth value={filters.model || ''} onChange={handleFilterChange('model')} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField size="small" label="Year" fullWidth value={filters.year || ''} onChange={handleFilterChange('year')} type="number" />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField size="small" label="Body Style" fullWidth value={filters.bodyStyle || ''} onChange={handleFilterChange('bodyStyle')} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField size="small" label="Condition" select fullWidth value={filters.condition || ''} onChange={handleFilterChange('condition')}>
                <MenuItem value="">All</MenuItem>
                {Object.values(Condition).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField size="small" label="Color" fullWidth value={filters.color || ''} onChange={handleFilterChange('color')} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField size="small" label="Min Price" fullWidth value={filters.minPrice || ''} onChange={handleFilterChange('minPrice')} type="number" InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField size="small" label="Max Price" fullWidth value={filters.maxPrice || ''} onChange={handleFilterChange('maxPrice')} type="number" InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField size="small" label="Min Mileage" fullWidth value={filters.minMileage || ''} onChange={handleFilterChange('minMileage')} type="number" />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField size="small" label="Max Mileage" fullWidth value={filters.maxMileage || ''} onChange={handleFilterChange('maxMileage')} type="number" />
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {loading ? (
        <Paper>
          <Table>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(8)].map((_, j) => (
                    <TableCell key={j}><Skeleton /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : vehicles.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {search || Object.values(filters).some(Boolean)
              ? 'No vehicles match your filters'
              : 'No vehicles yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {search || Object.values(filters).some(Boolean)
              ? 'Try adjusting your search criteria'
              : 'Add your first vehicle to get started'}
          </Typography>
          {!search && !Object.values(filters).some(Boolean) && isManager && (
            <Button variant="contained" onClick={() => navigate('/vehicles/new')}>Add Your First Vehicle</Button>
          )}
          {(search || Object.values(filters).some(Boolean)) && (
            <Button variant="outlined" onClick={clearFilters}>Clear Filters</Button>
          )}
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 60 }}></TableCell>
                  <SortHeader label="Stock #" field="stockNumber" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  <SortHeader label="Year" field="year" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  <SortHeader label="Make" field="make" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  <TableCell sx={{ fontWeight: 600 }}>Model</TableCell>
                  <SortHeader label="Mileage" field="mileage" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  <SortHeader label="Price" field="internetPrice" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <SortHeader label="Days" field="dateAcquired" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                </TableRow>
              </TableHead>
              <TableBody>
                {vehicles.map((v) => (
                  <TableRow
                    key={v.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/vehicles/${v.id}`)}
                  >
                    <TableCell>
                      {v.primaryPhotoUrl ? (
                        <Box
                          component="img"
                          src={v.primaryPhotoUrl}
                          alt=""
                          sx={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 1 }}
                        />
                      ) : (
                        <Box sx={{ width: 48, height: 36, bgcolor: 'grey.200', borderRadius: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>{v.stockNumber}</TableCell>
                    <TableCell>{v.year}</TableCell>
                    <TableCell>{v.make}</TableCell>
                    <TableCell>{v.model}{v.trim ? ` ${v.trim}` : ''}</TableCell>
                    <TableCell>{v.mileage.toLocaleString()}</TableCell>
                    <TableCell>{formatPrice(v.internetPrice)}</TableCell>
                    <TableCell>
                      <VehicleStatusBadge status={v.status} />
                    </TableCell>
                    <TableCell>{v.daysInStock}d</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
            {meta.total} vehicle{meta.total !== 1 ? 's' : ''} total
          </Typography>
        </>
      )}
    </Box>
  );
}
