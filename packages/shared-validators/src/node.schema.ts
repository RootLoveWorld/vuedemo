/**
 * Node validation schemas using Zod
 */

import { z } from 'zod'

// Position schema
export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

// Node type enum
export const nodeTypeSchema = z.enum([
  'input',
  'llm',
  'condition',
  'transform',
  'output',
  'loop',
  'merge',
])

// Base node data schema
export const nodeDataSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  config: z.record(z.any()),
})

// Flow node schema
export const flowNodeSchema = z.object({
  id: z.string().min(1, 'Node ID is required'),
  type: nodeTypeSchema,
  position: positionSchema,
  data: nodeDataSchema,
})

// Flow edge schema
export const flowEdgeSchema = z.object({
  id: z.string().min(1, 'Edge ID is required'),
  source: z.string().min(1, 'Source node is required'),
  target: z.string().min(1, 'Target node is required'),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
})

// Node-specific config schemas
export const llmNodeConfigSchema = z.object({
  model: z.string().min(1, 'Model is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().min(1).max(100000).optional().default(2000),
  stream: z.boolean().optional().default(false),
})

export const conditionNodeConfigSchema = z.object({
  expression: z.string().min(1, 'Expression is required'),
  branches: z.array(
    z.object({
      condition: z.string().min(1),
      label: z.string().min(1),
    })
  ),
})

export const transformNodeConfigSchema = z.object({
  expression: z.string().min(1, 'Expression is required'),
  mapping: z.record(z.string()).optional(),
})

export const inputNodeConfigSchema = z.object({
  schema: z.record(z.any()),
  defaultValues: z.record(z.any()).optional(),
})

export const outputNodeConfigSchema = z.object({
  format: z.enum(['json', 'text']).optional().default('json'),
  fields: z.array(z.string()).optional(),
})

export const loopNodeConfigSchema = z.object({
  iterateOver: z.string().min(1, 'Iterate over field is required'),
  maxIterations: z.number().min(1).max(10000).optional().default(100),
})

export const mergeNodeConfigSchema = z.object({
  strategy: z.enum(['concat', 'merge', 'custom']),
  customLogic: z.string().optional(),
})

// Validate node config based on type
export function validateNodeConfig(type: string, config: any) {
  switch (type) {
    case 'llm':
      return llmNodeConfigSchema.parse(config)
    case 'condition':
      return conditionNodeConfigSchema.parse(config)
    case 'transform':
      return transformNodeConfigSchema.parse(config)
    case 'input':
      return inputNodeConfigSchema.parse(config)
    case 'output':
      return outputNodeConfigSchema.parse(config)
    case 'loop':
      return loopNodeConfigSchema.parse(config)
    case 'merge':
      return mergeNodeConfigSchema.parse(config)
    default:
      return config
  }
}
