import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { DealType, CreateDealRequest } from '../types/deal.types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

interface CustomerOption { id: string; firstName: string; lastName: string; email: string | null }
interface VehicleOption { id: string; year: number; make: string; model: string; stockNumber: number }

function getToken(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function DealCreatePage() {
  const navigate = useNavigate();

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const [dealType, setDealType] = useState<DealType>(DealType.Finance);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const searchCustomers = useCallback(async (term: string) => {
    if (!term.trim()) { setCustomerResults([]); return; }
    try {
      const res = await fetch(`${BASE_URL}/api/customers?search=${encodeURIComponent(term)}`, {
        headers: getToken(),
      });
      if (!res.ok) return;
      const json = await res.json();
      setCustomerResults(json.data ?? []);
    } catch { /* silent */ }
  }, []);

  const loadVehicles = useCallback(async () => {
    if (vehiclesLoaded) return;
    try {
      const res = await fetch(`${BASE_URL}/api/vehicles?status=FrontlineReady`, {
        headers: getToken(),
      });
      if (!res.ok) return;
      const json = await res.json();
      setVehicles(json.data ?? []);
      setVehiclesLoaded(true);
    } catch { /* silent */ }
  }, [vehiclesLoaded]);

  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerSearch(e.target.value);
    setSelectedCustomer(null);
    searchCustomers(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!selectedCustomer) errors.customer = 'Please select a customer';
    if (!selectedVehicleId) errors.vehicle = 'Please select a vehicle';
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }

    setFieldErrors({});
    setSubmitting(true);
    setError(null);

    const body: CreateDealRequest = {
      customerId: selectedCustomer!.id,
      vehicleId: selectedVehicleId,
      dealType,
    };

    try {
      const res = await fetch(`${BASE_URL}/api/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getToken() },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? `Request failed: ${res.status}`);
      }
      const deal = await res.json();
      navigate(`/deals/${deal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Create Deal</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 3, maxWidth: 680 }} component="form" onSubmit={handleSubmit}>
        {/* Customer search */}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>Customer</Typography>
        <TextField
          label="Search customers"
          fullWidth
          size="small"
          value={selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : customerSearch}
          onChange={handleCustomerSearchChange}
          error={!!fieldErrors.customer}
          helperText={fieldErrors.customer}
          sx={{ mb: 1 }}
        />
        {customerResults.length > 0 && !selectedCustomer && (
          <Paper variant="outlined" sx={{ mb: 2, maxHeight: 200, overflow: 'auto' }}>
            <List dense disablePadding>
              {customerResults.map((c) => (
                <ListItemButton key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerResults([]); }}>
                  <ListItemText
                    primary={`${c.firstName} ${c.lastName}`}
                    secondary={c.email ?? undefined}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        )}

        {/* Vehicle picker */}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 1 }}>
          Vehicle
        </Typography>
        <TextField
          select
          label="Select vehicle"
          fullWidth
          size="small"
          value={selectedVehicleId}
          onChange={(e) => setSelectedVehicleId(e.target.value)}
          onFocus={loadVehicles}
          error={!!fieldErrors.vehicle}
          helperText={fieldErrors.vehicle}
          sx={{ mb: 2 }}
        >
          {vehicles.length === 0 && (
            <MenuItem value="" disabled>No frontline-ready vehicles</MenuItem>
          )}
          {vehicles.map((v) => (
            <MenuItem key={v.id} value={v.id}>
              #{v.stockNumber} — {v.year} {v.make} {v.model}
            </MenuItem>
          ))}
        </TextField>

        {/* Deal type */}
        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <FormLabel component="legend">Deal Type</FormLabel>
          <RadioGroup
            row
            value={dealType}
            onChange={(e) => setDealType(e.target.value as DealType)}
          >
            {Object.values(DealType).map((t) => (
              <FormControlLabel key={t} value={t} control={<Radio />} label={t} />
            ))}
          </RadioGroup>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" onClick={() => navigate(-1)}>Cancel</Button>
          <Button
            variant="contained"
            type="submit"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : undefined}
          >
            Create Deal
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
