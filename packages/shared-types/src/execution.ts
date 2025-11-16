/**
 * Execution related types
 */

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped'

export type LogLevel = 'info' | 'warning' | 'error' | 'debug'

export interface Execution {
  id: string
  workflowId: string
  userId: string
  status: ExecutionStatus
  inputData?: Record<string, any>
  outputData?: Record<string, any>
  errorMessage?: string
  startedAt?: Date
  completedAt?: Date
  createdAt: Date
}

export interface ExecutionLog {
  id: string
  executionId: string
  nodeId?: string
  level: LogLevel
  message: string
  metadata?: Record<string, any>
  createdAt: Date
}

export interface CreateExecutionDto {
  workflowId: string
  inputData?: Record<string, any>
}

export interface ExecutionResult {
  id: string
  status: ExecutionStatus
  outputData?: Record<string, any>
  errorMessage?: string
}

export interface NodeExecutionStatus {
  nodeId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  output?: any
  error?: string
}

export interface ExecutionContext {
  executionId: string
  workflowId: string
  variables: Record<string, any>
  nodeStatuses: Map<string, NodeExecutionStatus>
}
