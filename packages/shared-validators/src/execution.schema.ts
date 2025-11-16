/**
 * Execution validation schemas using Zod
 */

import { z } from 'zod'

// Execution status enum
export const executionStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'stopped',
])

// Log level enum
export const logLevelSchema = z.enum(['debug', 'info', 'warning', 'error'])

// Create execution DTO schema
export const createExecutionDtoSchema = z.object({
  workflowId: z.string().uuid('Invalid workflow ID'),
  inputData: z.record(z.any()).optional(),
})

// Execution log schema
export const executionLogSchema = z.object({
  id: z.string().uuid(),
  executionId: z.string().uuid(),
  nodeId: z.string().optional(),
  level: logLevelSchema,
  message: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
})

// Node execution status schema
export const nodeExecutionStatusSchema = z.object({
  nodeId: z.string().min(1),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  output: z.any().optional(),
  error: z.string().optional(),
})

// Execution result schema
export const executionResultSchema = z.object({
  id: z.string().uuid(),
  status: executionStatusSchema,
  outputData: z.record(z.any()).optional(),
  errorMessage: z.string().optional(),
})

// Validate execution input data
export function validateExecutionInput(
  inputData: any,
  schema?: Record<string, any>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!schema) {
    return { isValid: true, errors: [] }
  }

  // Basic validation - check if required fields are present
  for (const [key, config] of Object.entries(schema)) {
    if (typeof config === 'object' && config !== null) {
      const fieldConfig = config as any
      if (fieldConfig.required && !(key in inputData)) {
        errors.push(`Required field '${key}' is missing`)
      }

      // Type validation
      if (key in inputData && fieldConfig.type) {
        const actualType = typeof inputData[key]
        const expectedType = fieldConfig.type

        if (expectedType === 'array' && !Array.isArray(inputData[key])) {
          errors.push(`Field '${key}' must be an array`)
        } else if (expectedType !== 'array' && actualType !== expectedType) {
          errors.push(`Field '${key}' must be of type ${expectedType}`)
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
