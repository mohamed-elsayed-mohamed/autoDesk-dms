import apiClient from './client';
import type { Customer, CustomerDetail, CustomerListItem, DuplicateMatch, PaginatedResponse } from '../types';

export interface CustomerSearchParams {
  search?: string;
  includeArchived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateCustomerData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  preferredContact?: string;
  notes?: string;
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  updatedAt: string;
}

export async function getCustomers(params: CustomerSearchParams = {}): Promise<PaginatedResponse<CustomerListItem>> {
  const { data } = await apiClient.get('/api/customers', { params });
  return data;
}

export async function getCustomer(id: string): Promise<CustomerDetail> {
  const { data } = await apiClient.get(`/api/customers/${id}`);
  return data;
}

export async function createCustomer(payload: CreateCustomerData): Promise<Customer> {
  const { data } = await apiClient.post('/api/customers', payload);
  return data;
}

export async function updateCustomer(id: string, payload: UpdateCustomerData): Promise<Customer> {
  const { data } = await apiClient.patch(`/api/customers/${id}`, payload);
  return data;
}

export async function checkDuplicates(params: {
  phone?: string;
  email?: string;
  excludeId?: string;
}): Promise<{ duplicates: DuplicateMatch[] }> {
  const { data } = await apiClient.get('/api/customers/check-duplicates', { params });
  return data;
}

export async function archiveCustomer(id: string): Promise<Pick<Customer, 'id' | 'archivedAt'>> {
  const { data } = await apiClient.patch(`/api/customers/${id}/archive`);
  return data;
}

export async function restoreCustomer(id: string): Promise<Pick<Customer, 'id' | 'archivedAt'>> {
  const { data } = await apiClient.patch(`/api/customers/${id}/restore`);
  return data;
}
