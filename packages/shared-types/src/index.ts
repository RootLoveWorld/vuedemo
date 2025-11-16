/**
 * Shared TypeScript types for AI Workflow Platform
 * Used by both frontend and BFF layers
 */

// User types
export type {
  User,
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  RegisterDto,
  AuthResponse,
} from './user'

// Node types
export type {
  NodeType,
  Position,
  NodeData,
  FlowNode,
  FlowEdge,
  LLMNodeConfig,
  ConditionNodeConfig,
  TransformNodeConfig,
  InputNodeConfig,
  OutputNodeConfig,
  LoopNodeConfig,
  MergeNodeConfig,
} from './node'

// Workflow types
export type {
  WorkflowDefinition,
  Workflow,
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowListItem,
} from './workflow'

// Execution types
export type {
  ExecutionStatus,
  LogLevel,
  Execution,
  ExecutionLog,
  CreateExecutionDto,
  ExecutionResult,
  NodeExecutionStatus,
  ExecutionContext,
} from './execution'

// API types
export type {
  ApiResponse,
  PaginatedResponse,
  ApiError,
  WorkflowResponse,
  WorkflowListResponse,
  ExecutionResponse,
  ExecutionListResponse,
  ExecutionLogsResponse,
  WebSocketEvent,
  ExecutionStatusEvent,
  ExecutionLogEvent,
  ExecutionResultEvent,
  ExecutionErrorEvent,
  ModelInfo,
  ModelsListResponse,
  PluginResponse,
  PluginListResponse,
  PluginInstallResponse,
} from './api'

// Plugin types
export type {
  PluginManifest,
  Plugin,
  PluginListItem,
  CreatePluginDto,
  InstallPluginDto,
  PluginInstallProgress,
  PluginSearchParams,
} from './plugin'
