/**
 * Status code constants
 */

export const EXECUTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  STOPPED: 'stopped',
} as const

export const NODE_EXECUTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const

export const LOG_LEVEL = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
} as const

export const WORKFLOW_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DRAFT: 'draft',
  ARCHIVED: 'archived',
} as const

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

export const WEBSOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  STATUS: 'status',
  LOG: 'log',
  RESULT: 'result',
  ERROR: 'error',
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed',
} as const

export const STATUS_LABELS = {
  [EXECUTION_STATUS.PENDING]: 'Pending',
  [EXECUTION_STATUS.RUNNING]: 'Running',
  [EXECUTION_STATUS.COMPLETED]: 'Completed',
  [EXECUTION_STATUS.FAILED]: 'Failed',
  [EXECUTION_STATUS.STOPPED]: 'Stopped',
} as const

export const STATUS_COLORS = {
  [EXECUTION_STATUS.PENDING]: '#6b7280',
  [EXECUTION_STATUS.RUNNING]: '#3b82f6',
  [EXECUTION_STATUS.COMPLETED]: '#10b981',
  [EXECUTION_STATUS.FAILED]: '#ef4444',
  [EXECUTION_STATUS.STOPPED]: '#f59e0b',
} as const
