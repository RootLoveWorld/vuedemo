/**
 * Plugin Manager Composable
 * Provides a unified interface for plugin management
 */

import { ref, computed } from 'vue'
import { pluginLoader } from '@/plugins/plugin-loader'
import { pluginRegistry } from '@/plugins/plugin-registry'
import type { LoadedPlugin } from '@/plugins/plugin-loader'
import type { CustomNodeType } from '@/plugins/plugin-registry'

const isInitialized = ref(false)
const isLoading = ref(false)
const loadError = ref<string | null>(null)

export function usePluginManager() {
  /**
   * Initialize the plugin system
   * Loads all active plugins and registers their node types
   */
  async function initialize() {
    if (isInitialized.value) {
      console.log('Plugin manager already initialized')
      return
    }

    isLoading.value = true
    loadError.value = null

    try {
      console.log('Initializing plugin manager...')

      // Load all active plugins
      const plugins = await pluginLoader.loadAllPlugins()

      // Register custom node types
      plugins.forEach((plugin) => {
        try {
          pluginRegistry.registerNodeType(plugin)
        } catch (error) {
          console.error(`Failed to register plugin ${plugin.id}:`, error)
        }
      })

      isInitialized.value = true
      console.log(`Plugin manager initialized with ${plugins.length} plugins`)
    } catch (error: any) {
      loadError.value = error.message || 'Failed to initialize plugin manager'
      console.error('Plugin manager initialization failed:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load a specific plugin
   */
  async function loadPlugin(pluginId: string): Promise<LoadedPlugin> {
    isLoading.value = true
    loadError.value = null

    try {
      const plugin = await pluginLoader.loadPlugin(pluginId)
      pluginRegistry.registerNodeType(plugin)
      return plugin
    } catch (error: any) {
      loadError.value = error.message || `Failed to load plugin ${pluginId}`
      console.error(`Failed to load plugin ${pluginId}:`, error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Unload a specific plugin
   */
  function unloadPlugin(pluginId: string): void {
    pluginLoader.unloadPlugin(pluginId)
    pluginRegistry.unregisterNodeType(pluginId)
  }

  /**
   * Reload a specific plugin
   */
  async function reloadPlugin(pluginId: string): Promise<LoadedPlugin> {
    unloadPlugin(pluginId)
    return loadPlugin(pluginId)
  }

  /**
   * Get all loaded plugins
   */
  function getLoadedPlugins(): LoadedPlugin[] {
    return pluginLoader.getAllPlugins()
  }

  /**
   * Get all custom node types
   */
  function getCustomNodeTypes(): CustomNodeType[] {
    return pluginRegistry.getAllNodeTypes()
  }

  /**
   * Get custom node types by category
   */
  function getNodeTypesByCategory(category: string): CustomNodeType[] {
    return pluginRegistry.getNodeTypesByCategory(category)
  }

  /**
   * Check if a node type is a custom plugin node
   */
  function isCustomNodeType(type: string): boolean {
    return pluginRegistry.isCustomNodeType(type)
  }

  /**
   * Get the component for a node type
   */
  function getNodeComponent(type: string) {
    return pluginRegistry.getNodeComponent(type)
  }

  /**
   * Get the config panel for a node type
   */
  function getConfigPanel(type: string) {
    return pluginRegistry.getConfigPanel(type)
  }

  /**
   * Clear all plugins and reset
   */
  function reset(): void {
    pluginLoader.clearAll()
    pluginRegistry.clearAll()
    isInitialized.value = false
    loadError.value = null
  }

  // Computed properties
  const loadedPluginCount = computed(() => getLoadedPlugins().length)
  const customNodeTypeCount = computed(() => getCustomNodeTypes().length)

  return {
    // State
    isInitialized,
    isLoading,
    loadError,
    loadedPluginCount,
    customNodeTypeCount,

    // Methods
    initialize,
    loadPlugin,
    unloadPlugin,
    reloadPlugin,
    getLoadedPlugins,
    getCustomNodeTypes,
    getNodeTypesByCategory,
    isCustomNodeType,
    getNodeComponent,
    getConfigPanel,
    reset,
  }
}
