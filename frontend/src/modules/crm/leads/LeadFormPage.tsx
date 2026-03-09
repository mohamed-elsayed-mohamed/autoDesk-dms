import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface ApiError { response?: { data?: { message?: unknown } } }
function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && 'response' in err;
}
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Autocomplete,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { createLead } from '../../../api/leads';
import { getCustomers } from '../../../api/customers';
import apiClient from '../../../api/client';
import { LeadSource, PreferredContact } from '../../../types';
import type { CustomerListItem } from '../../../types';
import VehicleInterestPicker from './components/VehicleInterestPicker';

interface Salesperson {
  id: string;
  firstName: string;
  lastName: string;
}

export default function LeadFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillCustomerId = searchParams.get('customerId');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [customerOptions, setCustomerOptions] = useState<CustomerListItem[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);
  const [createNewCustomer, setCreateNewCustomer] = useState(false);

  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [assignedTo, setAssignedTo] = useState('');

  const [source, setSource] = useState('');
  const [sourceOther, setSourceOther] = useState('');
  const [vehicleIds, setVehicleIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const [newCustomer, setNewCustomer] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    preferredContact: PreferredContact.Phone as string,
  });

  // Load prefilled customer
  useEffect(() => {
    if (prefillCustomerId) {
      getCustomers({ search: '', page: 1, limit: 50 }).then((r) => {
        const found = r.data.find((c) => c.id === prefillCustomerId);
        if (found) setSelectedCustomer(found);
      }).catch(() => {});
    }
  }, [prefillCustomerId]);

  // Load salespeople
  useEffect(() => {
    apiClient.get('/api/users', { params: { role: 'SalesConsultant' } })
      .then((r) => setSalespeople(r.data.data || r.data))
      .catch(() => {});
  }, []);

  const handleCustomerSearch = async (_: React.SyntheticEvent, value: string) => {
    setCustomerSearch(value);
    if (!value || value.length < 2) {
      setCustomerOptions([]);
      return;
    }
    try {
      const result = await getCustomers({ search: value, limit: 20 });
      setCustomerOptions(result.data);
    } catch {
      setCustomerOptions([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source) { setError('Please select a lead source'); return; }
    if (!createNewCustomer && !selectedCustomer) { setError('Please select or create a customer'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        source,
        sourceOther: source === LeadSource.Other ? sourceOther : undefined,
        assignedTo: assignedTo && assignedTo !== 'round-robin' ? assignedTo : undefined,
        notes: notes || undefined,
        vehicleIds: vehicleIds.length > 0 ? vehicleIds : undefined,
        ...(createNewCustomer
          ? { customer: { firstName: newCustomer.firstName, lastName: newCustomer.lastName, phone: newCustomer.phone || undefined, email: newCustomer.email || undefined, preferredContact: newCustomer.preferredContact || undefined } }
          : { customerId: selectedCustomer!.id }),
      };

      const lead = await createLead(payload);
      navigate(`/leads/${lead.id}`);
    } catch (err) {
      if (isApiError(err) && err.response?.data?.message) {
        const msg = err.response.data.message;
        setError(typeof msg === 'string' ? msg : Array.isArray(msg) ? (msg as string[]).join(', ') : 'Failed to create lead');
      } else {
        setError('Failed to create lead');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>New Lead</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Customer</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={createNewCustomer}
                    onChange={(e) => {
                      setCreateNewCustomer(e.target.checked);
                      setSelectedCustomer(null);
                    }}
                    size="small"
                  />
                }
                label="Create new customer"
              />
            </Box>

            {!createNewCustomer ? (
              <Autocomplete
                options={customerOptions}
                value={selectedCustomer}
                inputValue={customerSearch}
                getOptionLabel={(c) => `${c.firstName} ${c.lastName}${c.phone ? ` — ${c.phone}` : ''}${c.email ? ` — ${c.email}` : ''}`}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                filterOptions={(x) => x}
                onInputChange={handleCustomerSearch}
                onChange={(_, val) => setSelectedCustomer(val)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search customer"
                    placeholder="Type name, phone, or email..."
                    size="small"
                  />
                )}
              />
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="First Name"
                    fullWidth
                    required
                    value={newCustomer.firstName}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, firstName: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Last Name"
                    fullWidth
                    required
                    value={newCustomer.lastName}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, lastName: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Phone"
                    fullWidth
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email"
                    fullWidth
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, email: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Preferred Contact"
                    select
                    fullWidth
                    value={newCustomer.preferredContact}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, preferredContact: e.target.value }))}
                  >
                    {Object.values(PreferredContact).map((v) => (
                      <MenuItem key={v} value={v}>{v}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Lead Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Source"
                  select
                  fullWidth
                  required
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  {Object.values(LeadSource).map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              {source === LeadSource.Other && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Specify Other Source"
                    fullWidth
                    value={sourceOther}
                    onChange={(e) => setSourceOther(e.target.value)}
                  />
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Assign To"
                  select
                  fullWidth
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <MenuItem value="round-robin">Auto-assign (round-robin)</MenuItem>
                  <Divider />
                  {salespeople.map((sp) => (
                    <MenuItem key={sp.id} value={sp.id}>
                      {sp.firstName} {sp.lastName}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Vehicles of Interest</Typography>
            <VehicleInterestPicker selectedIds={vehicleIds} onChange={setVehicleIds} />
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Notes</Typography>
            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => navigate(-1)}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
          >
            {saving ? 'Creating...' : 'Create Lead'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
