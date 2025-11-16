/**
 * Workflow related types
 */

import type { FlowNode, FlowEdge } from './node'

export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  version: number
}

export interface Workflow {
  id: string
  name: string
  description?: string
  definition: WorkflowDefinition
  version: number
  isActive: boolean
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateWorkflowDto {
  name: string
  description?: string
  definition: Omit<WorkflowDefinition, 'id' | 'version'>
}

export interface UpdateWorkflowDto {
  name?: string
  description?: string
  definition?: Omit<WorkflowDefinition, 'id' | 'version'>
  isActive?: boolean
}

export interface WorkflowListItem {
  id: string
  name: string
  description?: string
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
