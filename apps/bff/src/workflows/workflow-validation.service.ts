import { Injectable, BadRequestException } from '@nestjs/common'
import { validateWorkflowStructure } from '@workflow/shared-validators'
import type { FlowNode, FlowEdge } from '@workflow/shared-types'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

@Injectable()
export class WorkflowValidationService {
  /**
   * Validate complete workflow structure
   */
  validateWorkflow(workflow: { nodes: FlowNode[]; edges: FlowEdge[] }): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Use shared validator for basic structure validation
    const structureValidation = validateWorkflowStructure(workflow)
    if (!structureValidation.isValid) {
      errors.push(...structureValidation.errors)
    }

    // Additional validation rules
    this.validateNodeConnections(workflow, errors, warnings)
    this.validateNodeConfigurations(workflow, errors, warnings)
    this.validateEdgeConnections(workflow, errors, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Validate node connections
   */
  private validateNodeConnections(
    workflow: { nodes: FlowNode[]; edges: FlowEdge[] },
    errors: string[],
    warnings: string[]
  ): void {
    const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]))

    // Check for orphaned nodes (nodes with no connections)
    for (const node of workflow.nodes) {
      // Skip input and output nodes from orphan check
      if (node.type === 'input' || node.type === 'output') {
        continue
      }

      const hasIncoming = workflow.edges.some((e) => e.target === node.id)
      const hasOutgoing = workflow.edges.some((e) => e.source === node.id)

      if (!hasIncoming && !hasOutgoing) {
        warnings.push(`Node "${node.data.label}" (${node.id}) is not connected to any other nodes`)
      }
    }

    // Check for dead-end paths (nodes with no path to output)
    const outputNodes = workflow.nodes.filter((n) => n.type === 'output')
    if (outputNodes.length > 0) {
      for (const node of workflow.nodes) {
        if (node.type !== 'output') {
          const hasPathToOutput = this.hasPathToNode(
            node.id,
            outputNodes.map((n) => n.id),
            workflow.edges
          )
          if (!hasPathToOutput) {
            warnings.push(`Node "${node.data.label}" (${node.id}) has no path to any output node`)
          }
        }
      }
    }

    // Check for unreachable nodes (nodes with no path from input)
    const inputNodes = workflow.nodes.filter((n) => n.type === 'input')
    if (inputNodes.length > 0) {
      for (const node of workflow.nodes) {
        if (node.type !== 'input') {
          const hasPathFromInput = this.hasPathFromNode(
            inputNodes.map((n) => n.id),
            node.id,
            workflow.edges
          )
          if (!hasPathFromInput) {
            warnings.push(
              `Node "${node.data.label}" (${node.id}) is not reachable from any input node`
            )
          }
        }
      }
    }
  }

  /**
   * Validate node configurations
   */
  private validateNodeConfigurations(
    workflow: { nodes: FlowNode[] },
    errors: string[],
    warnings: string[]
  ): void {
    for (const node of workflow.nodes) {
      const config = node.data.config

      switch (node.type) {
        case 'llm':
          this.validateLLMNode(node, config, errors, warnings)
          break
        case 'condition':
          this.validateConditionNode(node, config, errors, warnings)
          break
        case 'transform':
          this.validateTransformNode(node, config, errors, warnings)
          break
        case 'input':
          this.validateInputNode(node, config, errors, warnings)
          break
        case 'output':
          this.validateOutputNode(node, config, errors, warnings)
          break
        case 'loop':
          this.validateLoopNode(node, config, errors, warnings)
          break
        case 'merge':
          this.validateMergeNode(node, config, errors, warnings)
          break
        default:
          warnings.push(`Unknown node type: ${node.type} for node ${node.id}`)
      }
    }
  }

  /**
   * Validate LLM node configuration
   */
  private validateLLMNode(
    node: FlowNode,
    config: Record<string, unknown>,
    errors: string[],
    warnings: string[]
  ): void {
    if (!config.model || typeof config.model !== 'string') {
      errors.push(`LLM node "${node.data.label}" (${node.id}) must specify a model`)
    }

    if (!config.prompt || typeof config.prompt !== 'string') {
      errors.push(`LLM node "${node.data.label}" (${node.id}) must have a prompt`)
    }

    if (config.temperature !== undefined) {
      const temp = Number(config.temperature)
      if (isNaN(temp) || temp < 0 || temp > 2) {
        errors.push(
          `LLM node "${node.data.label}" (${node.id}) temperature must be between 0 and 2`
        )
      }
    }

    if (config.maxTokens !== undefined) {
      const maxTokens = Number(config.maxTokens)
      if (isNaN(maxTokens) || maxTokens < 1) {
        errors.push(
          `LLM node "${node.data.label}" (${node.id}) maxTokens must be a positive number`
        )
      }
    }
  }

  /**
   * Validate condition node configuration
   */
  private validateConditionNode(
    node: FlowNode,
    config: Record<string, unknown>,
    errors: string[],
    warnings: string[]
  ): void {
    if (!config.expression || typeof config.expression !== 'string') {
      errors.push(`Condition node "${node.data.label}" (${node.id}) must have an expression`)
    }

    if (config.branches && Array.isArray(config.branches)) {
      if (config.branches.length === 0) {
        warnings.push(`Condition node "${node.data.label}" (${node.id}) has no branches defined`)
      }

      for (const branch of config.branches) {
        if (!branch.condition || !branch.label) {
          errors.push(
            `Condition node "${node.data.label}" (${node.id}) has invalid branch configuration`
          )
        }
      }
    }
  }

  /**
   * Validate transform node configuration
   */
  private validateTransformNode(
    node: FlowNode,
    config: Record<string, unknown>,
    errors: string[],
    warnings: string[]
  ): void {
    if (!config.expression || typeof config.expression !== 'string') {
      errors.push(`Transform node "${node.data.label}" (${node.id}) must have an expression`)
    }

    // Validate mapping if present
    if (config.mapping && typeof config.mapping !== 'object') {
      errors.push(`Transform node "${node.data.label}" (${node.id}) mapping must be an object`)
    }
  }

  /**
   * Validate input node configuration
   */
  private validateInputNode(
    node: FlowNode,
    config: Record<string, unknown>,
    errors: string[],
    warnings: string[]
  ): void {
    if (!config.schema || typeof config.schema !== 'object') {
      warnings.push(`Input node "${node.data.label}" (${node.id}) should define a schema`)
    }
  }

  /**
   * Validate output node configuration
   */
  private validateOutputNode(
    node: FlowNode,
    config: Record<string, unknown>,
    errors: string[],
    warnings: string[]
  ): void {
    if (config.format && !['json', 'text'].includes(config.format as string)) {
      errors.push(`Output node "${node.data.label}" (${node.id}) format must be 'json' or 'text'`)
    }
  }

  /**
   * Validate loop node configuration
   */
  private validateLoopNode(
    node: FlowNode,
    config: Record<string, unknown>,
    errors: string[],
    warnings: string[]
  ): void {
    if (!config.iterateOver || typeof config.iterateOver !== 'string') {
      errors.push(`Loop node "${node.data.label}" (${node.id}) must specify what to iterate over`)
    }

    if (config.maxIterations !== undefined) {
      const maxIter = Number(config.maxIterations)
      if (isNaN(maxIter) || maxIter < 1) {
        errors.push(
          `Loop node "${node.data.label}" (${node.id}) maxIterations must be a positive number`
        )
      }
    }
  }

  /**
   * Validate merge node configuration
   */
  private validateMergeNode(
    node: FlowNode,
    config: Record<string, unknown>,
    errors: string[],
    warnings: string[]
  ): void {
    if (!config.strategy || !['concat', 'merge', 'custom'].includes(config.strategy as string)) {
      errors.push(
        `Merge node "${node.data.label}" (${node.id}) must have a valid strategy (concat, merge, or custom)`
      )
    }

    if (config.strategy === 'custom' && !config.customLogic) {
      errors.push(
        `Merge node "${node.data.label}" (${node.id}) with custom strategy must provide customLogic`
      )
    }
  }

  /**
   * Validate edge connections
   */
  private validateEdgeConnections(
    workflow: { nodes: FlowNode[]; edges: FlowEdge[] },
    errors: string[],
    warnings: string[]
  ): void {
    const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]))

    for (const edge of workflow.edges) {
      const sourceNode = nodeMap.get(edge.source)
      const targetNode = nodeMap.get(edge.target)

      if (!sourceNode) {
        errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`)
        continue
      }

      if (!targetNode) {
        errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`)
        continue
      }

      // Validate that output nodes don't have outgoing edges
      if (sourceNode.type === 'output') {
        errors.push(
          `Output node "${sourceNode.data.label}" (${sourceNode.id}) cannot have outgoing edges`
        )
      }

      // Validate that input nodes don't have incoming edges
      if (targetNode.type === 'input') {
        errors.push(
          `Input node "${targetNode.data.label}" (${targetNode.id}) cannot have incoming edges`
        )
      }
    }
  }

  /**
   * Check if there's a path from a node to any of the target nodes
   */
  private hasPathToNode(startNodeId: string, targetNodeIds: string[], edges: FlowEdge[]): boolean {
    const visited = new Set<string>()
    const queue: string[] = [startNodeId]

    while (queue.length > 0) {
      const currentId = queue.shift()!

      if (targetNodeIds.includes(currentId)) {
        return true
      }

      if (visited.has(currentId)) {
        continue
      }

      visited.add(currentId)

      // Find all outgoing edges from current node
      const outgoingEdges = edges.filter((e) => e.source === currentId)
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          queue.push(edge.target)
        }
      }
    }

    return false
  }

  /**
   * Check if there's a path from any source node to the target node
   */
  private hasPathFromNode(
    sourceNodeIds: string[],
    targetNodeId: string,
    edges: FlowEdge[]
  ): boolean {
    for (const sourceId of sourceNodeIds) {
      if (this.hasPathToNode(sourceId, [targetNodeId], edges)) {
        return true
      }
    }
    return false
  }

  /**
   * Validate and throw if invalid
   */
  validateOrThrow(workflow: { nodes: FlowNode[]; edges: FlowEdge[] }): void {
    const result = this.validateWorkflow(workflow)

    if (!result.isValid) {
      throw new BadRequestException({
        message: 'Workflow validation failed',
        errors: result.errors,
        warnings: result.warnings,
      })
    }
  }
}
