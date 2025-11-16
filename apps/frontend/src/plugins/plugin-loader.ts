/**
 * Plugin Loader
 * Dynamically loads and registers plugins at runtime
 */

import { defineAsyncComponent, Component } from 'vue'
import type { Plugin, PluginManifest } from '@workflow/shared-types'
import { pluginsApi } from '@/api/plugins'

export interface LoadedPlugin {
  id: string
  manifest: PluginManifest
  NodeComponent?: Component
  ConfigPanel?: Component
}

export class PluginLoader {
  private loadedPlugins = new Map<string, LoadedPlugin>()
  private loadingPromises = new Map<string, Promise<LoadedPlugin>>()

  /**
   * Load a single plugin by ID
   */
  async loadPlugin(pluginId: string): Promise<LoadedPlugin> {
    // Return cached plugin if already loaded
    if (this.loadedPlugins.has(pluginId)) {
      return this.loadedPlugins.get(pluginId)!
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(pluginId)) {
      return this.loadingPromises.get(pluginId)!
    }

    // Start loading
    const loadingPromise = this._loadPluginInternal(pluginId)
    this.loadingPromises.set(pluginId, loadingPromise)

    try {
      const plugin = await loadingPromise
      this.loadedPlugins.set(pluginId, plugin)
      return plugin
    } finally {
      this.loadingPromises.delete(pluginId)
    }
  }

  private async _loadPluginInternal(pluginId: string): Promise<LoadedPlugin> {
    try {
      // Fetch plugin metadata from API
      const pluginData = await pluginsApi.getPlugin(pluginId)

      if (!pluginData.isInstalled || !pluginData.isActive) {
        throw new Error(`Plugin ${pluginId} is not installed or not active`)
      }

      const manifest = pluginData.manifest

      // Create loaded plugin object
      const loadedPlugin: LoadedPlugin = {
        id: pluginId,
        manifest,
      }

      // Load frontend components if available
      if (manifest.frontend) {
        // In a real implementation, these would be loaded from a CDN or plugin server
        // For now, we'll create async components that can be loaded dynamically
        if (manifest.frontend.component) {
          loadedPlugin.NodeComponent = defineAsyncComponent(() =>
            this._loadComponent(pluginId, manifest.frontend!.component)
          )
        }

        if (manifest.frontend.configPanel) {
          loadedPlugin.ConfigPanel = defineAsyncComponent(() =>
            this._loadComponent(pluginId, manifest.frontend!.configPanel)
          )
        }
      }

      console.log(`Plugin ${pluginId} loaded successfully`)
      return loadedPlugin
    } catch (error) {
      console.error(`Failed to load plugin ${pluginId}:`, error)
      throw error
    }
  }

  /**
   * Load a component from plugin
   * In production, this would fetch from a CDN or plugin server
   */
  private async _loadComponent(pluginId: string, componentPath: string): Promise<Component> {
    try {
      // Construct the URL for the plugin component
      // In production, this would be something like:
      // const url = `${PLUGIN_CDN_URL}/${pluginId}/${componentPath}`
      const url = `/api/plugins/${pluginId}/assets/${componentPath}`

      // Dynamically import the component
      // Note: This requires the component to be served as an ES module
      const module = await import(/* @vite-ignore */ url)
      return module.default || module
    } catch (error) {
      console.error(`Failed to load component ${componentPath} for plugin ${pluginId}:`, error)
      throw error
    }
  }

  /**
   * Load all active plugins
   */
  async loadAllPlugins(): Promise<LoadedPlugin[]> {
    try {
      // Fetch all installed and active plugins
      const response = await pluginsApi.getPlugins({
        installed: true,
        limit: 100,
      })

      const activePlugins = response.data.filter((p) => p.isActive)

      // Load all plugins in parallel
      const loadPromises = activePlugins.map((p) => this.loadPlugin(p.id))
      const loadedPlugins = await Promise.allSettled(loadPromises)

      // Filter successful loads
      const successful = loadedPlugins
        .filter((result) => result.status === 'fulfilled')
        .map((result) => (result as PromiseFulfilledResult<LoadedPlugin>).value)

      // Log failures
      loadedPlugins
        .filter((result) => result.status === 'rejected')
        .forEach((result) => {
          console.error('Failed to load plugin:', (result as PromiseRejectedResult).reason)
        })

      console.log(`Loaded ${successful.length} of ${activePlugins.length} plugins`)
      return successful
    } catch (error) {
      console.error('Failed to load plugins:', error)
      return []
    }
  }

  /**
   * Get a loaded plugin by ID
   */
  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.loadedPlugins.get(pluginId)
  }

  /**
   * Get all loaded plugins
   */
  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values())
  }

  /**
   * Check if a plugin is loaded
   */
  isPluginLoaded(pluginId: string): boolean {
    return this.loadedPlugins.has(pluginId)
  }

  /**
   * Unload a plugin
   */
  unloadPlugin(pluginId: string): void {
    this.loadedPlugins.delete(pluginId)
    this.loadingPromises.delete(pluginId)
    console.log(`Plugin ${pluginId} unloaded`)
  }

  /**
   * Reload a plugin
   */
  async reloadPlugin(pluginId: string): Promise<LoadedPlugin> {
    this.unloadPlugin(pluginId)
    return this.loadPlugin(pluginId)
  }

  /**
   * Clear all loaded plugins
   */
  clearAll(): void {
    this.loadedPlugins.clear()
    this.loadingPromises.clear()
    console.log('All plugins cleared')
  }
}

// Export singleton instance
export const pluginLoader = new PluginLoader()
