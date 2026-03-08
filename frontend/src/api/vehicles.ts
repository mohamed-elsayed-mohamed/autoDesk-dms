import apiClient from './client';
import type {
  Vehicle,
  VehicleListItem,
  PaginatedResponse,
  VinDecodeResult,
  DashboardData,
  VehiclePhoto,
} from '../types';

export interface ListVehiclesParams {
  page?: number;
  limit?: number;
  q?: string;
  make?: string;
  model?: string;
  year?: number;
  bodyStyle?: string;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  minMileage?: number;
  maxMileage?: number;
  condition?: string;
  status?: string;
  includeDeleted?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function listVehicles(params: ListVehiclesParams = {}): Promise<PaginatedResponse<VehicleListItem>> {
  const { data } = await apiClient.get('/api/vehicles', { params });
  return data;
}

export async function getVehicle(id: string): Promise<Vehicle> {
  const { data } = await apiClient.get(`/api/vehicles/${id}`);
  return data;
}

export async function createVehicle(vehicle: Record<string, any>): Promise<Vehicle> {
  const { data } = await apiClient.post('/api/vehicles', vehicle);
  return data;
}

export async function updateVehicle(id: string, vehicle: Record<string, any>): Promise<Vehicle> {
  const { data } = await apiClient.patch(`/api/vehicles/${id}`, vehicle);
  return data;
}

export async function deleteVehicle(id: string): Promise<void> {
  await apiClient.delete(`/api/vehicles/${id}`);
}

export async function restoreVehicle(id: string): Promise<Vehicle> {
  const { data } = await apiClient.post(`/api/vehicles/${id}/restore`);
  return data;
}

export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  const { data } = await apiClient.get(`/api/vehicles/vin-decode/${vin}`);
  return data;
}

export async function getDashboard(page?: number, limit?: number): Promise<DashboardData> {
  const { data } = await apiClient.get('/api/vehicles/dashboard', { params: { page, limit } });
  return data;
}

export async function uploadPhoto(vehicleId: string, file: File): Promise<VehiclePhoto> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post(`/api/vehicles/${vehicleId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updatePhoto(
  vehicleId: string,
  photoId: string,
  update: { isPrimary?: boolean; sortOrder?: number },
): Promise<VehiclePhoto> {
  const { data } = await apiClient.patch(`/api/vehicles/${vehicleId}/photos/${photoId}`, update);
  return data;
}

export async function reorderPhotos(vehicleId: string, order: string[]): Promise<VehiclePhoto[]> {
  const { data } = await apiClient.patch(`/api/vehicles/${vehicleId}/photos/reorder`, { order });
  return data;
}

export async function deletePhoto(vehicleId: string, photoId: string): Promise<void> {
  await apiClient.delete(`/api/vehicles/${vehicleId}/photos/${photoId}`);
}
