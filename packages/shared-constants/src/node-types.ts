/**
 * Node type constants
 */

export const NODE_TYPES = {
  INPUT: 'input',
  LLM: 'llm',
  CONDITION: 'condition',
  TRANSFORM: 'transform',
  OUTPUT: 'output',
  LOOP: 'loop',
  MERGE: 'merge',
} as const

export const NODE_CATEGORIES = {
  INPUT: 'Input',
  PROCESSING: 'Processing',
  AI: 'AI',
  LOGIC: 'Logic',
  OUTPUT: 'Output',
} as const

export const NODE_TYPE_METADATA = {
  [NODE_TYPES.INPUT]: {
    label: 'Input',
    category: NODE_CATEGORIES.INPUT,
    description: 'Receives external input data',
    icon: 'input',
    color: '#3b82f6',
  },
  [NODE_TYPES.LLM]: {
    label: 'LLM',
    category: NODE_CATEGORIES.AI,
    description: 'Calls large language model',
    icon: 'brain',
    color: '#8b5cf6',
  },
  [NODE_TYPES.CONDITION]: {
    label: 'Condition',
    category: NODE_CATEGORIES.LOGIC,
    description: 'Conditional branching',
    icon: 'git-branch',
    color: '#f59e0b',
  },
  [NODE_TYPES.TRANSFORM]: {
    label: 'Transform',
    category: NODE_CATEGORIES.PROCESSING,
    description: 'Data transformation',
    icon: 'shuffle',
    color: '#10b981',
  },
  [NODE_TYPES.OUTPUT]: {
    label: 'Output',
    category: NODE_CATEGORIES.OUTPUT,
    description: 'Output results',
    icon: 'output',
    color: '#ef4444',
  },
  [NODE_TYPES.LOOP]: {
    label: 'Loop',
    category: NODE_CATEGORIES.LOGIC,
    description: 'Iterate over data',
    icon: 'repeat',
    color: '#06b6d4',
  },
  [NODE_TYPES.MERGE]: {
    label: 'Merge',
    category: NODE_CATEGORIES.PROCESSING,
    description: 'Merge multiple inputs',
    icon: 'merge',
    color: '#ec4899',
  },
} as const

export const DEFAULT_NODE_CONFIGS = {
  [NODE_TYPES.INPUT]: {
    schema: {},
    defaultValues: {},
  },
  [NODE_TYPES.LLM]: {
    model: 'llama2',
    prompt: '',
    temperature: 0.7,
    maxTokens: 2000,
    stream: false,
  },
  [NODE_TYPES.CONDITION]: {
    expression: '',
    branches: [],
  },
  [NODE_TYPES.TRANSFORM]: {
    expression: '',
    mapping: {},
  },
  [NODE_TYPES.OUTPUT]: {
    format: 'json',
    fields: [],
  },
  [NODE_TYPES.LOOP]: {
    iterateOver: '',
    maxIterations: 100,
  },
  [NODE_TYPES.MERGE]: {
    strategy: 'merge',
  },
} as const
