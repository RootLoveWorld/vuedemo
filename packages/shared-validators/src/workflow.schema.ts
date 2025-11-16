/**
 * Workflow validation schemas using Zod
 */

import { z } from 'zod'
import { flowNodeSchema, flowEdgeSchema } from './node.schema'

// Workflow definition schema
export const workflowDefinitionSchema = z.object({
  id: z.string().min(1, 'Workflow ID is required'),
  name: z.string().min(1, 'Workflow name is required').max(255),
  description: z.string().max(1000).optional(),
  nodes: z.array(flowNodeSchema).min(1, 'At least one node is required'),
  edges: z.array(flowEdgeSchema),
  version: z.number().int().positive(),
})

// Create workflow DTO schema
export const createWorkflowDtoSchema = z.object({
  name: z.string().min(1, 'Workflow name is required').max(255),
  description: z.string().max(1000).optional(),
  definition: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    nodes: z.array(flowNodeSchema).min(1, 'At least one node is required'),
    edges: z.array(flowEdgeSchema),
  }),
})

// Update workflow DTO schema
export const updateWorkflowDtoSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  definition: z
    .object({
      name: z.string().min(1),
      description: z.string().optional(),
      nodes: z.array(flowNodeSchema).min(1),
      edges: z.array(flowEdgeSchema),
    })
    .optional(),
  isActive: z.boolean().optional(),
})

// Workflow validation rules
export function validateWorkflowStructure(workflow: {
  nodes: Array<{ id: string; type: string }>
  edges: Array<{ source: string; target: string }>
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check for duplicate node IDs
  const nodeIds = workflow.nodes.map((n) => n.id)
  const duplicateIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index)
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate node IDs found: ${duplicateIds.join(', ')}`)
  }

  // Check if edges reference valid nodes
  const nodeIdSet = new Set(nodeIds)
  for (const edge of workflow.edges) {
    if (!nodeIdSet.has(edge.source)) {
      errors.push(`Edge references non-existent source node: ${edge.source}`)
    }
    if (!nodeIdSet.has(edge.target)) {
      errors.push(`Edge references non-existent target node: ${edge.target}`)
    }
  }

  // Check for circular dependencies (simple cycle detection)
  const hasCircularDependency = detectCircularDependency(workflow.nodes, workflow.edges)
  if (hasCircularDependency) {
    errors.push('Circular dependency detected in workflow')
  }

  // Check for at least one input node
  const hasInputNode = workflow.nodes.some((n) => n.type === 'input')
  if (!hasInputNode) {
    errors.push('Workflow must have at least one input node')
  }

  // Check for at least one output node
  const hasOutputNode = workflow.nodes.some((n) => n.type === 'output')
  if (!hasOutputNode) {
    errors.push('Workflow must have at least one output node')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Simple cycle detection using DFS
function detectCircularDependency(
  nodes: Array<{ id: string }>,
  edges: Array<{ source: string; target: string }>
): boolean {
  const graph = new Map<string, string[]>()

  // Build adjacency list
  for (const node of nodes) {
    graph.set(node.id, [])
  }
  for (const edge of edges) {
    graph.get(edge.source)?.push(edge.target)
  }

  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId)
    recursionStack.add(nodeId)

    const neighbors = graph.get(nodeId) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) {
          return true
        }
      } else if (recursionStack.has(neighbor)) {
        return true
      }
    }

    recursionStack.delete(nodeId)
    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) {
        return true
      }
    }
  }

  return false
}
