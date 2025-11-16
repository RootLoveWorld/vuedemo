/**
 * User validation schemas using Zod
 */

import { z } from 'zod'

// Email validation
const emailSchema = z.string().email('Invalid email address')

// Password validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')

// Login DTO schema
export const loginDtoSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

// Register DTO schema
export const registerDtoSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(255).optional(),
})

// Create user DTO schema
export const createUserDtoSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(255).optional(),
})

// Update user DTO schema
export const updateUserDtoSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: emailSchema.optional(),
})

// User schema
export const userSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema,
  name: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
