import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Skeleton,
  Chip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DeleteIcon from '@mui/icons-material/Delete';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getVehicle, uploadPhoto, updatePhoto, reorderPhotos, deletePhoto } from '../../api/vehicles';
import type { VehiclePhoto } from '../../types';

function SortablePhoto({
  photo,
  onSetPrimary,
  onDelete,
}: {
  photo: VehiclePhoto;
  onSetPrimary: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: photo.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        position: 'relative',
        width: 150,
        height: 150,
        borderRadius: 2,
        overflow: 'hidden',
        border: photo.isPrimary ? '3px solid' : '1px solid',
        borderColor: photo.isPrimary ? 'primary.main' : 'grey.300',
        cursor: 'grab',
        '&:hover .photo-actions': { opacity: 1 },
      }}
    >
      <img
        src={photo.url}
        alt="Vehicle"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {photo.isPrimary && (
        <Chip
          label="Primary"
          size="small"
          color="primary"
          sx={{ position: 'absolute', top: 4, left: 4 }}
        />
      )}
      <Box
        className="photo-actions"
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.2s',
        }}
      >
        <IconButton size="small" sx={{ color: 'white' }} onClick={(e) => { e.stopPropagation(); onSetPrimary(); }}>
          {photo.isPrimary ? <StarIcon /> : <StarBorderIcon />}
        </IconButton>
        <IconButton size="small" sx={{ color: 'error.light' }} onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <DeleteIcon />
        </IconButton>
      </Box>
    </Box>
  );
}

export default function PhotoManager({ vehicleId }: { vehicleId: string }) {
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadPhotos = useCallback(async () => {
    try {
      const vehicle = await getVehicle(vehicleId);
      setPhotos(vehicle.photos);
    } catch {
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await uploadPhoto(vehicleId, file);
      await loadPhotos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSetPrimary = async (photoId: string) => {
    try {
      await updatePhoto(vehicleId, photoId, { isPrimary: true });
      await loadPhotos();
    } catch {
      setError('Failed to set primary');
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      await deletePhoto(vehicleId, photoId);
      setDeleteConfirm(null);
      await loadPhotos();
    } catch {
      setError('Failed to delete photo');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    const newPhotos = arrayMove(photos, oldIndex, newIndex);
    setPhotos(newPhotos);

    try {
      await reorderPhotos(vehicleId, newPhotos.map((p) => p.id));
    } catch {
      await loadPhotos();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" width={150} height={150} />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button
          variant="outlined"
          component="label"
          startIcon={uploading ? null : <CloudUploadIcon />}
          disabled={uploading || photos.length >= 20}
        >
          {uploading ? 'Uploading...' : 'Upload Photo'}
          <input type="file" hidden accept="image/jpeg,image/png" onChange={handleUpload} />
        </Button>
        <Typography variant="body2" color="text.secondary">
          {photos.length}/20 photos
        </Typography>
        {photos.length >= 20 && (
          <Alert severity="info" sx={{ py: 0 }}>Photo limit reached (20/20)</Alert>
        )}
      </Box>

      {photos.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No photos yet. Upload your first photo.
        </Typography>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {photos.map((photo) => (
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  onSetPrimary={() => handleSetPrimary(photo.id)}
                  onDelete={() => setDeleteConfirm(photo.id)}
                />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Photo</DialogTitle>
        <DialogContent>Are you sure you want to delete this photo?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
