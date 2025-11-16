/**
 * API request and response types
 */

import type { Workflow, WorkflowListItem } from './workflow'
import type { Execution, ExecutionLog } from './execution'

// Common API response wrapper
export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
  timestamp: string
}

// Workflow API responses
export interface WorkflowResponse extends Workflow {}

export interface WorkflowListResponse extends PaginatedResponse<WorkflowListItem> {}

// Execution API responses
export interface ExecutionResponse extends Execution {}

export interface ExecutionListResponse extends PaginatedResponse<Execution> {}

export interface ExecutionLogsResponse {
  logs: ExecutionLog[]
  executionId: string
}

// WebSocket event types
export interface WebSocketEvent<T = any> {
  event: string
  data: T
}

export interface ExecutionStatusEvent {
  executionId: string
  status: string
  timestamp: Date
}

export interface ExecutionLogEvent {
  executionId: string
  log: ExecutionLog
}

export interface ExecutionResultEvent {
  executionId: string
  result: any
}

export interface ExecutionErrorEvent {
  executionId: string
  error: string
}

// Model API responses
export interface ModelInfo {
  name: string
  size?: string
  modified?: Date
  digest?: string
}

export interface ModelsListResponse {
  models: ModelInfo[]
}

// Plugin API responses
export interface PluginResponse {
  id: string
  name: string
  version: string
  isInstalled: boolean
  isActive: boolean
}

export interface PluginListResponse extends PaginatedResponse<PluginResponse> {}

export interface PluginInstallResponse {
  success: boolean
  pluginId: string
  message?: string
}
