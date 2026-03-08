import apiClient from './client';
import type { LoginRequest, LoginResponse } from '../types';

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post('/api/auth/login', credentials);
  return data;
}
