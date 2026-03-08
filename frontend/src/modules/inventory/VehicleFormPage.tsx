import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import { createVehicle, updateVehicle, getVehicle, decodeVin } from '../../api/vehicles';
import { Condition, VehicleStatus } from '../../types';
import PhotoManager from './PhotoManager';

const conditionOptions = Object.values(Condition);
const statusOptions = Object.values(VehicleStatus);

const statusLabels: Record<string, string> = {
  InTransit: 'In Transit',
  InRecon: 'In Recon',
  FrontlineReady: 'Frontline Ready',
  Sold: 'Sold',
  Wholesaled: 'Wholesaled',
};

export default function VehicleFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicateError, setDuplicateError] = useState<{ message: string; archivedVehicleId?: string } | null>(null);

  const [form, setForm] = useState({
    vin: '',
    year: '',
    make: '',
    model: '',
    trim: '',
    bodyStyle: '',
    exteriorColor: '',
    interiorColor: '',
    mileage: '0',
    condition: Condition.Used,
    status: VehicleStatus.InTransit,
    msrp: '',
    invoicePrice: '',
    internetPrice: '',
    salePrice: '',
    lotLocation: '',
    dateAcquired: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      getVehicle(id)
        .then((v) => {
          setForm({
            vin: v.vin,
            year: String(v.year),
            make: v.make,
            model: v.model,
            trim: v.trim || '',
            bodyStyle: v.bodyStyle || '',
            exteriorColor: v.exteriorColor || '',
            interiorColor: v.interiorColor || '',
            mileage: String(v.mileage),
            condition: v.condition,
            status: v.status,
            msrp: v.msrp || '',
            invoicePrice: v.invoicePrice || '',
            internetPrice: v.internetPrice || '',
            salePrice: v.salePrice || '',
            lotLocation: v.lotLocation || '',
            dateAcquired: v.dateAcquired.split('T')[0],
          });
        })
        .catch(() => setError('Failed to load vehicle'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
    setDuplicateError(null);
  };

  const handleDecode = async () => {
    if (form.vin.length !== 17) {
      setError('VIN must be exactly 17 characters');
      return;
    }
    setDecoding(true);
    setError('');
    try {
      const result = await decodeVin(form.vin);
      if (result.decoded) {
        setForm((prev) => ({
          ...prev,
          year: result.year ? String(result.year) : prev.year,
          make: result.make || prev.make,
          model: result.model || prev.model,
          trim: result.trim || prev.trim,
          bodyStyle: result.bodyStyle || prev.bodyStyle,
        }));
      } else {
        setError(`VIN decode failed: ${result.reason || 'Unknown error'}. You can enter details manually.`);
      }
    } catch {
      setError('VIN decode service unavailable. You can enter details manually.');
    } finally {
      setDecoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setDuplicateError(null);

    const payload: Record<string, any> = {
      vin: form.vin,
      year: parseInt(form.year, 10),
      make: form.make,
      model: form.model,
      condition: form.condition,
      status: form.status,
      mileage: parseInt(form.mileage, 10) || 0,
      dateAcquired: form.dateAcquired,
    };

    if (form.trim) payload.trim = form.trim;
    if (form.bodyStyle) payload.bodyStyle = form.bodyStyle;
    if (form.exteriorColor) payload.exteriorColor = form.exteriorColor;
    if (form.interiorColor) payload.interiorColor = form.interiorColor;
    if (form.msrp) payload.msrp = parseFloat(form.msrp);
    if (form.invoicePrice) payload.invoicePrice = parseFloat(form.invoicePrice);
    if (form.internetPrice) payload.internetPrice = parseFloat(form.internetPrice);
    if (form.salePrice) payload.salePrice = parseFloat(form.salePrice);
    if (form.lotLocation) payload.lotLocation = form.lotLocation;

    try {
      if (isEdit && id) {
        const { vin, ...updatePayload } = payload;
        await updateVehicle(id, updatePayload);
        navigate(`/vehicles/${id}`);
      } else {
        const vehicle = await createVehicle(payload);
        navigate(`/vehicles/${vehicle.id}`);
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        setDuplicateError({
          message: err.response.data.message,
          archivedVehicleId: err.response.data.archivedVehicleId,
        });
      } else if (err.response?.data?.message) {
        setError(typeof err.response.data.message === 'string' ? err.response.data.message : err.response.data.message.join(', '));
      } else {
        setError('Failed to save vehicle');
      }
    } finally {
      setSaving(false);
    }
  };

  const internetPriceRequired = form.status === VehicleStatus.FrontlineReady;

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
        {isEdit ? 'Edit Vehicle' : 'Add Vehicle'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {duplicateError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {duplicateError.message}
          {duplicateError.archivedVehicleId && (
            <Button
              size="small"
              sx={{ ml: 1 }}
              onClick={() => navigate(`/vehicles/${duplicateError.archivedVehicleId}`)}
            >
              View Archived Vehicle
            </Button>
          )}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Vehicle Identification</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  label="VIN"
                  fullWidth
                  required
                  value={form.vin}
                  onChange={handleChange('vin')}
                  disabled={isEdit}
                  inputProps={{ maxLength: 17 }}
                  helperText={`${form.vin.length}/17 characters`}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                {!isEdit && (
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleDecode}
                    disabled={decoding || form.vin.length !== 17}
                    startIcon={decoding ? <CircularProgress size={18} /> : <SearchIcon />}
                    sx={{ height: 56 }}
                  >
                    {decoding ? 'Decoding VIN...' : 'Decode VIN'}
                  </Button>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Vehicle Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <TextField label="Year" fullWidth required value={form.year} onChange={handleChange('year')} type="number" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Make" fullWidth required value={form.make} onChange={handleChange('make')} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Model" fullWidth required value={form.model} onChange={handleChange('model')} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Trim" fullWidth value={form.trim} onChange={handleChange('trim')} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Body Style" fullWidth value={form.bodyStyle} onChange={handleChange('bodyStyle')} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Exterior Color" fullWidth value={form.exteriorColor} onChange={handleChange('exteriorColor')} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Interior Color" fullWidth value={form.interiorColor} onChange={handleChange('interiorColor')} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Mileage" fullWidth value={form.mileage} onChange={handleChange('mileage')} type="number" InputProps={{ inputProps: { min: 0 } }} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Status & Pricing</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <TextField label="Condition" select fullWidth required value={form.condition} onChange={handleChange('condition')}>
                  {conditionOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Status" select fullWidth required value={form.status} onChange={handleChange('status')}>
                  {statusOptions.map((s) => <MenuItem key={s} value={s}>{statusLabels[s] || s}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Date Acquired" type="date" fullWidth required value={form.dateAcquired} onChange={handleChange('dateAcquired')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Lot Location" fullWidth value={form.lotLocation} onChange={handleChange('lotLocation')} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="MSRP"
                  fullWidth
                  value={form.msrp}
                  onChange={handleChange('msrp')}
                  type="number"
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Invoice Price"
                  fullWidth
                  value={form.invoicePrice}
                  onChange={handleChange('invoicePrice')}
                  type="number"
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label={internetPriceRequired ? 'Internet Price *' : 'Internet Price'}
                  fullWidth
                  required={internetPriceRequired}
                  value={form.internetPrice}
                  onChange={handleChange('internetPrice')}
                  type="number"
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  helperText={internetPriceRequired ? 'Required for Frontline Ready' : ''}
                  error={internetPriceRequired && !form.internetPrice}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Sale Price"
                  fullWidth
                  value={form.salePrice}
                  onChange={handleChange('salePrice')}
                  type="number"
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {isEdit && id && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Photos</Typography>
              <PhotoManager vehicleId={id} />
            </CardContent>
          </Card>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => navigate(-1)}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
          >
            {saving ? 'Saving...' : isEdit ? 'Update Vehicle' : 'Add Vehicle'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
