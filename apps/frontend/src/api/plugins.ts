/**
 * Plugins API client
 */

import { api } from './client'
import type {
  Plugin,
  PluginListItem,
  PluginSearchParams,
  InstallPluginDto,
  PluginInstallProgress,
  PaginatedResponse,
} from '@workflow/shared-types'

export const pluginsApi = {
  /**
   * Get all plugins with optional filters
   */
  async getPlugins(params?: PluginSearchParams): Promise<PaginatedResponse<PluginListItem>> {
    const searchParams = new URLSearchParams()
    if (params?.query) searchParams.append('query', params.query)
    if (params?.category) searchParams.append('category', params.category)
    if (params?.installed !== undefined) searchParams.append('installed', String(params.installed))
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))

    const url = `/plugins${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    return api.get(url).json()
  },

  /**
   * Get plugin details by ID
   */
  async getPlugin(id: string): Promise<Plugin> {
    return api.get(`/plugins/${id}`).json()
  },

  /**
   * Install a plugin
   */
  async installPlugin(dto: InstallPluginDto): Promise<PluginInstallProgress> {
    return api.post(`/plugins/${dto.pluginId}/install`).json()
  },

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(id: string): Promise<void> {
    return api.delete(`/plugins/${id}/install`).json()
  },

  /**
   * Activate a plugin
   */
  async activatePlugin(id: string): Promise<Plugin> {
    return api.post(`/plugins/${id}/activate`).json()
  },

  /**
   * Deactivate a plugin
   */
  async deactivatePlugin(id: string): Promise<Plugin> {
    return api.post(`/plugins/${id}/deactivate`).json()
  },

  /**
   * Upload a custom plugin
   */
  async uploadPlugin(file: File): Promise<Plugin> {
    const formData = new FormData()
    formData.append('file', file)

    return api
      .post('/plugins/upload', {
        body: formData,
      })
      .json()
  },

  /**
   * Get plugin installation progress
   */
  async getInstallProgress(id: string): Promise<PluginInstallProgress> {
    return api.get(`/plugins/${id}/install/progress`).json()
  },
}
