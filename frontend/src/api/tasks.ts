import apiClient from './client';
import type { Task, TaskStatus, PaginatedResponse } from '../types';

export interface CreateTaskData {
  leadId: string;
  type?: string;
  description?: string;
  dueAt: string;
}

export interface TaskFilterParams {
  assignedTo?: string;
  status?: string;
  leadId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MyTodayResponse {
  data: Task[];
  meta: { todayCount: number; overdueCount: number };
}

export async function createTask(payload: CreateTaskData): Promise<Task> {
  const { data } = await apiClient.post('/api/tasks', payload);
  return data;
}

export async function getMyTasks(): Promise<MyTodayResponse> {
  const { data } = await apiClient.get('/api/tasks/my-today');
  return data;
}

export async function getTasks(params: TaskFilterParams = {}): Promise<PaginatedResponse<Task>> {
  const { data } = await apiClient.get('/api/tasks', { params });
  return data;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  const { data } = await apiClient.patch(`/api/tasks/${id}`, { status });
  return data;
}

export async function reassignTask(id: string, assignedTo: string): Promise<Task> {
  const { data } = await apiClient.patch(`/api/tasks/${id}/reassign`, { assignedTo });
  return data;
}

export async function getLeadTasks(
  leadId: string,
  params: { status?: string; page?: number; limit?: number } = {},
): Promise<PaginatedResponse<Task>> {
  const { data } = await apiClient.get(`/api/leads/${leadId}/tasks`, { params });
  return data;
}
