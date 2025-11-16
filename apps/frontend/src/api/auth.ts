import apiClient from './client'
import type { User } from '@/stores/auth'

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  email: string
  password: string
  name?: string
}

export interface AuthResponse {
  access_token: string
  user: User
}

export const authApi = {
  async login(data: LoginDto): Promise<AuthResponse> {
    return apiClient.post('auth/login', { json: data }).json()
  },

  async register(data: RegisterDto): Promise<AuthResponse> {
    return apiClient.post('auth/register', { json: data }).json()
  },

  async getProfile(): Promise<User> {
    return apiClient.get('auth/profile').json()
  },

  async refreshToken(): Promise<{ access_token: string }> {
    return apiClient.post('auth/refresh').json()
  },
}
