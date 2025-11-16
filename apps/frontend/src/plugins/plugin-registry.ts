/**
 * Plugin Registry
 * Manages registration and retrieval of custom node types from plugins
 */

import type { Component } from 'vue'
import type { NodeType } from '@workflow/shared-types'
import type { LoadedPlugin } from './plugin-loader'

export interface CustomNodeType {
  type: string
  name: string
  category: string
  icon?: string
  component: Component
  configPanel?: Component
  defaultConfig?: Record<string, any>
}

export class PluginRegistry {
  private customNodeTypes = new Map<string, CustomNodeType>()

  /**
   * Register a custom node type from a plugin
   */
  registerNodeType(plugin: LoadedPlugin): void {
    if (!plugin.NodeComponent) {
      console.warn(`Plugin ${plugin.id} has no node component`)
      return
    }

    const nodeType: CustomNodeType = {
      type: plugin.id,
      name: plugin.manifest.name,
      category: plugin.manifest.category,
      icon: plugin.manifest.icon,
      component: plugin.NodeComponent,
      configPanel: plugin.ConfigPanel,
      defaultConfig: this._extractDefaultConfig(plugin.manifest),
    }

    this.customNodeTypes.set(plugin.id, nodeType)
    console.log(`Registered custom node type: ${plugin.id}`)
  }

  /**
   * Extract default configuration from plugin manifest
   */
  private _extractDefaultConfig(manifest: any): Record<string, any> {
    if (!manifest.config?.schema?.properties) {
      return {}
    }

    const config: Record<string, any> = {}
    const properties = manifest.config.schema.properties

    for (const [key, prop] of Object.entries(properties)) {
      const property = prop as any
      if (property.default !== undefined) {
        config[key] = property.default
      }
    }

    return config
  }

  /**
   * Unregister a custom node type
   */
  unregisterNodeType(pluginId: string): void {
    this.customNodeTypes.delete(pluginId)
    console.log(`Unregistered custom node type: ${pluginId}`)
  }

  /**
   * Get a custom node type by ID
   */
  getNodeType(pluginId: string): CustomNodeType | undefined {
    return this.customNodeTypes.get(pluginId)
  }

  /**
   * Get all registered custom node types
   */
  getAllNodeTypes(): CustomNodeType[] {
    return Array.from(this.customNodeTypes.values())
  }

  /**
   * Get custom node types by category
   */
  getNodeTypesByCategory(category: string): CustomNodeType[] {
    return this.getAllNodeTypes().filter((nodeType) => nodeType.category === category)
  }

  /**
   * Check if a node type is registered
   */
  hasNodeType(pluginId: string): boolean {
    return this.customNodeTypes.has(pluginId)
  }

  /**
   * Check if a node type is a custom plugin node
   */
  isCustomNodeType(type: string): boolean {
    // Built-in node types
    const builtInTypes: NodeType[] = [
      'input',
      'llm',
      'condition',
      'transform',
      'output',
      'loop',
      'merge',
    ]

    return !builtInTypes.includes(type as NodeType)
  }

  /**
   * Get the component for a node type
   */
  getNodeComponent(type: string): Component | undefined {
    const nodeType = this.getNodeType(type)
    return nodeType?.component
  }

  /**
   * Get the config panel for a node type
   */
  getConfigPanel(type: string): Component | undefined {
    const nodeType = this.getNodeType(type)
    return nodeType?.configPanel
  }

  /**
   * Clear all registered node types
   */
  clearAll(): void {
    this.customNodeTypes.clear()
    console.log('All custom node types cleared')
  }
}

// Export singleton instance
export const pluginRegistry = new PluginRegistry()
