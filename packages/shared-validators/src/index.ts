/**
 * Shared Zod validation schemas for AI Workflow Platform
 * Used by both frontend and BFF layers
 */

// Node schemas
export {
  positionSchema,
  nodeTypeSchema,
  nodeDataSchema,
  flowNodeSchema,
  flowEdgeSchema,
  llmNodeConfigSchema,
  conditionNodeConfigSchema,
  transformNodeConfigSchema,
  inputNodeConfigSchema,
  outputNodeConfigSchema,
  loopNodeConfigSchema,
  mergeNodeConfigSchema,
  validateNodeConfig,
} from './node.schema'

// Workflow schemas
export {
  workflowDefinitionSchema,
  createWorkflowDtoSchema,
  updateWorkflowDtoSchema,
  validateWorkflowStructure,
} from './workflow.schema'

// Execution schemas
export {
  executionStatusSchema,
  logLevelSchema,
  createExecutionDtoSchema,
  executionLogSchema,
  nodeExecutionStatusSchema,
  executionResultSchema,
  validateExecutionInput,
} from './execution.schema'

// User schemas
export {
  loginDtoSchema,
  registerDtoSchema,
  createUserDtoSchema,
  updateUserDtoSchema,
  userSchema,
} from './user.schema'
