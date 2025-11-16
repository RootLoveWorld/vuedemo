/**
 * Node related types
 */

export type NodeType = 'input' | 'llm' | 'condition' | 'transform' | 'output' | 'loop' | 'merge'

export interface Position {
  x: number
  y: number
}

export interface NodeData {
  label: string
  config: Record<string, any>
}

export interface FlowNode {
  id: string
  type: NodeType
  position: Position
  data: NodeData
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}

// Node-specific configurations
export interface LLMNodeConfig {
  model: string
  prompt: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface ConditionNodeConfig {
  expression: string
  branches: Array<{
    condition: string
    label: string
  }>
}

export interface TransformNodeConfig {
  expression: string
  mapping?: Record<string, string>
}

export interface InputNodeConfig {
  schema: Record<string, any>
  defaultValues?: Record<string, any>
}

export interface OutputNodeConfig {
  format?: 'json' | 'text'
  fields?: string[]
}

export interface LoopNodeConfig {
  iterateOver: string
  maxIterations?: number
}

export interface MergeNodeConfig {
  strategy: 'concat' | 'merge' | 'custom'
  customLogic?: string
}
