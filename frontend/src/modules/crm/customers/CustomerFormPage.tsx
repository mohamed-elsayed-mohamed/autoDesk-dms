import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getApiErrorMessage, isConflictError } from '../../../api/errorUtils';
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
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import {
  getCustomer,
  createCustomer,
  updateCustomer,
  checkDuplicates,
} from '../../../api/customers';
import { PreferredContact } from '../../../types';
import type { DuplicateMatch } from '../../../types';
import DuplicateWarning from './components/DuplicateWarning';

export default function CustomerFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    preferredContact: PreferredContact.Phone as string,
    notes: '',
  });

  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      getCustomer(id)
        .then((c) => {
          setForm({
            firstName: c.firstName,
            lastName: c.lastName,
            phone: c.phone || '',
            email: c.email || '',
            street: c.street || '',
            city: c.city || '',
            state: c.state || '',
            zip: c.zip || '',
            preferredContact: c.preferredContact,
            notes: c.notes || '',
          });
          setUpdatedAt(c.updatedAt);
        })
        .catch(() => setError('Failed to load customer'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleBlurCheck = async (field: 'phone' | 'email') => {
    const value = form[field];
    if (!value) return;
    try {
      const result = await checkDuplicates({
        [field]: value,
        excludeId: id,
      });
      setDuplicates(result.duplicates);
    } catch {
      // Silently ignore duplicate check errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone || undefined,
      email: form.email || undefined,
      street: form.street || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      zip: form.zip || undefined,
      preferredContact: form.preferredContact || undefined,
      notes: form.notes || undefined,
    };

    try {
      if (isEdit && id) {
        await updateCustomer(id, { ...payload, updatedAt });
        navigate(`/customers/${id}`);
      } else {
        const customer = await createCustomer(payload);
        navigate(`/customers/${customer.id}`);
      }
    } catch (err) {
      if (isConflictError(err)) {
        setError('Record was modified by another user. Please refresh.');
      } else {
        setError(getApiErrorMessage(err, 'Failed to save customer'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {isEdit ? 'Edit Customer' : 'New Customer'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DuplicateWarning
        duplicates={duplicates}
        onDismiss={() => setDuplicates([])}
        onViewExisting={(existingId) => navigate(`/customers/${existingId}`)}
      />

      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Contact Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  fullWidth
                  required
                  value={form.firstName}
                  onChange={handleChange('firstName')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  fullWidth
                  required
                  value={form.lastName}
                  onChange={handleChange('lastName')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone"
                  fullWidth
                  value={form.phone}
                  onChange={handleChange('phone')}
                  onBlur={() => handleBlurCheck('phone')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email"
                  fullWidth
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  onBlur={() => handleBlurCheck('email')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Preferred Contact"
                  select
                  fullWidth
                  value={form.preferredContact}
                  onChange={handleChange('preferredContact')}
                >
                  {Object.values(PreferredContact).map((v) => (
                    <MenuItem key={v} value={v}>{v}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Address</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Street"
                  fullWidth
                  value={form.street}
                  onChange={handleChange('street')}
                />
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField
                  label="City"
                  fullWidth
                  value={form.city}
                  onChange={handleChange('city')}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="State"
                  fullWidth
                  value={form.state}
                  onChange={handleChange('state')}
                  inputProps={{ maxLength: 2 }}
                  helperText="2-letter code"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="ZIP"
                  fullWidth
                  value={form.zip}
                  onChange={handleChange('zip')}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Notes</Typography>
            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={4}
              value={form.notes}
              onChange={handleChange('notes')}
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
            {saving ? 'Saving...' : isEdit ? 'Update Customer' : 'Create Customer'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
