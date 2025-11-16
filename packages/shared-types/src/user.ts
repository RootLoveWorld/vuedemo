/**
 * User related types
 */

export interface User {
  id: string
  email: string
  name?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserDto {
  email: string
  password: string
  name?: string
}

export interface UpdateUserDto {
  name?: string
  email?: string
}

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
  user: Omit<User, 'password'>
}
