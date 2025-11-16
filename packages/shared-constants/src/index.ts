/**
 * Shared constants for AI Workflow Platform
 * Used by both frontend and BFF layers
 */

// Node type constants
export { NODE_TYPES, NODE_CATEGORIES, NODE_TYPE_METADATA, DEFAULT_NODE_CONFIGS } from './node-types'

// Status constants
export {
  EXECUTION_STATUS,
  NODE_EXECUTION_STATUS,
  LOG_LEVEL,
  WORKFLOW_STATUS,
  HTTP_STATUS,
  WEBSOCKET_EVENTS,
  STATUS_LABELS,
  STATUS_COLORS,
} from './status'

// Error constants
export { ERROR_CODES, ERROR_MESSAGES, type ErrorCode } from './errors'
