import apiClient from './client';
import type { Notification, PaginatedResponse } from '../types';

export async function getNotifications(params: {
  page?: number;
  limit?: number;
} = {}): Promise<PaginatedResponse<Notification>> {
  const { data } = await apiClient.get('/api/notifications', { params });
  return data;
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const { data } = await apiClient.get('/api/notifications/unread-count');
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/api/notifications/read-all');
}
