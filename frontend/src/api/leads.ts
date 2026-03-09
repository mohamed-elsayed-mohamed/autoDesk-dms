import apiClient from './client';
import type { Lead, LeadListItem, LeadStatus, PaginatedResponse } from '../types';

export interface LeadFilterParams {
  status?: string;
  assignedTo?: string;
  source?: string;
  fromDate?: string;
  toDate?: string;
  customerId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateLeadData {
  customerId?: string;
  customer?: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    preferredContact?: string;
  };
  source: string;
  sourceOther?: string;
  assignedTo?: string;
  notes?: string;
  vehicleIds?: string[];
}

export async function getLeads(params: LeadFilterParams = {}): Promise<PaginatedResponse<LeadListItem>> {
  const { data } = await apiClient.get('/api/leads', { params });
  return data;
}

export async function getLead(id: string): Promise<Lead> {
  const { data } = await apiClient.get(`/api/leads/${id}`);
  return data;
}

export async function createLead(payload: CreateLeadData): Promise<Lead> {
  const { data } = await apiClient.post('/api/leads', payload);
  return data;
}

export async function updateLead(id: string, payload: { notes?: string; sourceOther?: string }): Promise<Lead> {
  const { data } = await apiClient.patch(`/api/leads/${id}`, payload);
  return data;
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
  lostReason?: string,
): Promise<Lead> {
  const { data } = await apiClient.patch(`/api/leads/${id}/status`, { status, lostReason });
  return data;
}

export async function addLeadVehicle(leadId: string, vehicleId: string) {
  const { data } = await apiClient.post(`/api/leads/${leadId}/vehicles`, { vehicleId });
  return data;
}

export async function removeLeadVehicle(leadId: string, vehicleId: string) {
  await apiClient.delete(`/api/leads/${leadId}/vehicles/${vehicleId}`);
}

export async function reassignLead(leadId: string, assignedTo: string): Promise<Lead> {
  const { data } = await apiClient.patch(`/api/leads/${leadId}/reassign`, { assignedTo });
  return data;
}
