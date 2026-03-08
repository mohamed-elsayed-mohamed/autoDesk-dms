import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Pagination,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/RestoreFromTrash';
import ArchiveIcon from '@mui/icons-material/Archive';
import { listVehicles, restoreVehicle } from '../../api/vehicles';
import type { VehicleListItem, PaginationMeta } from '../../types';

export default function ArchivedVehiclesPage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 25, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const fetchArchived = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listVehicles({ page, limit: 25, includeDeleted: true });
      setVehicles(result.data.filter((v: any) => v.deletedAt));
      setMeta(result.meta);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived]);

  const handleRestore = async () => {
    if (!restoreId) return;
    setRestoring(true);
    try {
      await restoreVehicle(restoreId);
      setRestoreId(null);
      fetchArchived();
    } catch {
      // Error handling
    } finally {
      setRestoring(false);
    }
  };

  const totalPages = Math.ceil(meta.total / meta.limit);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <ArchiveIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
        <Typography variant="h4">Archived Vehicles</Typography>
      </Box>

      {loading ? (
        <Paper>
          <Table>
            <TableBody>
              {[...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}><Skeleton /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : vehicles.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <ArchiveIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">No archived vehicles</Typography>
          <Typography variant="body2" color="text.secondary">
            Archived vehicles will appear here
          </Typography>
        </Paper>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Stock #</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>VIN</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vehicles.map((v) => (
                  <TableRow key={v.id} hover>
                    <TableCell>{v.stockNumber}</TableCell>
                    <TableCell
                      sx={{ cursor: 'pointer', color: 'primary.main' }}
                      onClick={() => navigate(`/vehicles/${v.id}`)}
                    >
                      {v.year} {v.make} {v.model} {v.trim || ''}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{v.vin}</TableCell>
                    <TableCell><Chip label={v.status} size="small" /></TableCell>
                    <TableCell>
                      {v.internetPrice ? `$${parseFloat(v.internetPrice).toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RestoreIcon />}
                        onClick={() => setRestoreId(v.id)}
                      >
                        Restore
                      </Button>
                    </TableCell>
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
        </>
      )}

      <Dialog open={!!restoreId} onClose={() => setRestoreId(null)}>
        <DialogTitle>Restore Vehicle</DialogTitle>
        <DialogContent>Restore this vehicle to active inventory?</DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreId(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleRestore} disabled={restoring}>
            {restoring ? 'Restoring...' : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
