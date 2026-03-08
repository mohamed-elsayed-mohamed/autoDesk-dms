import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/RestoreFromTrash';
import { getVehicle, deleteVehicle, restoreVehicle } from '../../api/vehicles';
import type { Vehicle } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '../../types';
import VehicleStatusBadge from '../../components/VehicleStatusBadge';

export default function VehicleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isManager = user?.role === UserRole.InventoryManager;
  const isDeleted = !!vehicle?.deletedAt;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getVehicle(id)
      .then(setVehicle)
      .catch(() => setError('Vehicle not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await deleteVehicle(id);
      navigate('/vehicles');
    } catch {
      setError('Failed to archive vehicle');
    } finally {
      setActionLoading(false);
      setDeleteDialog(false);
    }
  };

  const handleRestore = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const restored = await restoreVehicle(id);
      setVehicle(restored);
      setRestoreDialog(false);
    } catch {
      setError('Failed to restore vehicle');
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (price: string | null) => {
    if (!price) return '-';
    return `$${parseFloat(price).toLocaleString()}`;
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={40} />
        <Skeleton variant="rounded" height={200} sx={{ mt: 2 }} />
        <Skeleton variant="rounded" height={200} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error || !vehicle) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">{error || 'Vehicle not found'}</Typography>
        <Button onClick={() => navigate('/vehicles')} sx={{ mt: 2 }}>Back to Inventory</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">
            {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim || ''}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
            <Chip label={`Stock #${vehicle.stockNumber}`} size="small" />
            <VehicleStatusBadge status={vehicle.status} />
            <Chip label={vehicle.condition} size="small" variant="outlined" />
            {isDeleted && <Chip label="Archived" color="error" size="small" />}
          </Box>
        </Box>
        {isManager && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isDeleted ? (
              <Button variant="contained" startIcon={<RestoreIcon />} onClick={() => setRestoreDialog(true)}>
                Restore
              </Button>
            ) : (
              <>
                <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/vehicles/${id}/edit`)}>
                  Edit
                </Button>
                <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteDialog(true)}>
                  Archive
                </Button>
              </>
            )}
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {vehicle.photos.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1 }}>
              {vehicle.photos.map((photo) => (
                <Box
                  key={photo.id}
                  sx={{
                    minWidth: 200,
                    height: 150,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: photo.isPrimary ? '3px solid' : '1px solid',
                    borderColor: photo.isPrimary ? 'primary.main' : 'grey.300',
                    flexShrink: 0,
                  }}
                >
                  <img src={photo.url} alt="Vehicle" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Vehicle Details</Typography>
              <Table size="small">
                <TableBody>
                  <TableRow><TableCell sx={{ fontWeight: 600 }}>VIN</TableCell><TableCell>{vehicle.vin}</TableCell></TableRow>
                  <TableRow><TableCell sx={{ fontWeight: 600 }}>Year</TableCell><TableCell>{vehicle.year}</TableCell></TableRow>
                  <TableRow><TableCell sx={{ fontWeight: 600 }}>Make</TableCell><TableCell>{vehicle.make}</TableCell></TableRow>
                  <TableRow><TableCell sx={{ fontWeight: 600 }}>Model</TableCell><TableCell>{vehicle.model}</TableCell></TableRow>
                  {vehicle.trim && <TableRow><TableCell sx={{ fontWeight: 600 }}>Trim</TableCell><TableCell>{vehicle.trim}</TableCell></TableRow>}
                  {vehicle.bodyStyle && <TableRow><TableCell sx={{ fontWeight: 600 }}>Body Style</TableCell><TableCell>{vehicle.bodyStyle}</TableCell></TableRow>}
                  {vehicle.exteriorColor && <TableRow><TableCell sx={{ fontWeight: 600 }}>Exterior Color</TableCell><TableCell>{vehicle.exteriorColor}</TableCell></TableRow>}
                  {vehicle.interiorColor && <TableRow><TableCell sx={{ fontWeight: 600 }}>Interior Color</TableCell><TableCell>{vehicle.interiorColor}</TableCell></TableRow>}
                  <TableRow><TableCell sx={{ fontWeight: 600 }}>Mileage</TableCell><TableCell>{vehicle.mileage.toLocaleString()}</TableCell></TableRow>
                  {vehicle.lotLocation && <TableRow><TableCell sx={{ fontWeight: 600 }}>Lot Location</TableCell><TableCell>{vehicle.lotLocation}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Pricing & Dates</Typography>
              <Table size="small">
                <TableBody>
                  <TableRow><TableCell sx={{ fontWeight: 600 }}>MSRP</TableCell><TableCell>{formatPrice(vehicle.msrp)}</TableCell></TableRow>
                  <TableRow><TableCell sx={{ fontWeight: 600 }}>Invoice Price</TableCell><TableCell>{formatPrice(vehicle.invoicePrice)}</TableCell></TableRow>
                  <TableRow><TableCell sx={{ fontWeight: 600 }}>Internet Price</TableCell><TableCell>{formatPrice(vehicle.internetPrice)}</TableCell></TableRow>
                  <TableRow><TableCell sx={{ fontWeight: 600 }}>Sale Price</TableCell><TableCell>{formatPrice(vehicle.salePrice)}</TableCell></TableRow>
                  <TableRow><TableCell sx={{ fontWeight: 600 }}>Date Acquired</TableCell><TableCell>{new Date(vehicle.dateAcquired).toLocaleDateString()}</TableCell></TableRow>
                  {vehicle.dateSold && <TableRow><TableCell sx={{ fontWeight: 600 }}>Date Sold</TableCell><TableCell>{new Date(vehicle.dateSold).toLocaleDateString()}</TableCell></TableRow>}
                  <TableRow><TableCell sx={{ fontWeight: 600 }}>Days in Stock</TableCell><TableCell>{vehicle.daysInStock}</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {vehicle.history.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>History</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Field</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Old Value</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>New Value</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Changed By</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vehicle.history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell><Chip label={h.changeType.replace('_', ' ')} size="small" /></TableCell>
                      <TableCell>{h.fieldName || '-'}</TableCell>
                      <TableCell>{h.oldValue || '-'}</TableCell>
                      <TableCell>{h.newValue || '-'}</TableCell>
                      <TableCell>
                        {h.changedBy ? `${h.changedBy.firstName} ${h.changedBy.lastName}` : '-'}
                      </TableCell>
                      <TableCell>{new Date(h.changedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Archive Vehicle</DialogTitle>
        <DialogContent>
          Archive this vehicle? It will be hidden from active inventory.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={actionLoading}>
            {actionLoading ? 'Archiving...' : 'Archive'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={restoreDialog} onClose={() => setRestoreDialog(false)}>
        <DialogTitle>Restore Vehicle</DialogTitle>
        <DialogContent>
          Restore this vehicle to active inventory?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRestore} disabled={actionLoading}>
            {actionLoading ? 'Restoring...' : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
