import apiClient from './client';
import type { Activity, PaginatedResponse } from '../types';

export interface CreateActivityData {
  customerId: string;
  leadId?: string;
  type: string;
  direction?: string;
  content?: string;
}

export interface TimelineParams {
  page?: number;
  limit?: number;
}

export async function createActivity(payload: CreateActivityData): Promise<Activity> {
  const { data } = await apiClient.post('/api/activities', payload);
  return data;
}

export async function getCustomerTimeline(
  customerId: string,
  params: TimelineParams = {},
): Promise<PaginatedResponse<Activity>> {
  const { data } = await apiClient.get(`/api/customers/${customerId}/timeline`, { params });
  return data;
}

export async function getLeadActivities(
  leadId: string,
  params: TimelineParams = {},
): Promise<PaginatedResponse<Activity>> {
  const { data } = await apiClient.get(`/api/leads/${leadId}/activities`, { params });
  return data;
}
