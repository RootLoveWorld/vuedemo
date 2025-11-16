/**
 * Plugin store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { pluginsApi } from '@/api/plugins'
import type {
  Plugin,
  PluginListItem,
  PluginSearchParams,
  PluginInstallProgress,
} from '@workflow/shared-types'

export const usePluginStore = defineStore('plugin', () => {
  // State
  const plugins = ref<PluginListItem[]>([])
  const currentPlugin = ref<Plugin | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  const selectedCategory = ref<string | null>(null)
  const showInstalledOnly = ref(false)
  const installProgress = ref<Map<string, PluginInstallProgress>>(new Map())

  // Pagination
  const currentPage = ref(1)
  const pageSize = ref(12)
  const totalPlugins = ref(0)

  // Computed
  const totalPages = computed(() => Math.ceil(totalPlugins.value / pageSize.value))

  const installedPlugins = computed(() => plugins.value.filter((p) => p.isInstalled))

  const activePlugins = computed(() => plugins.value.filter((p) => p.isActive))

  const categories = computed(() => {
    const cats = new Set(plugins.value.map((p) => p.category))
    return Array.from(cats)
  })

  // Actions
  async function fetchPlugins(params?: PluginSearchParams) {
    loading.value = true
    error.value = null

    try {
      const searchParams: PluginSearchParams = {
        query: searchQuery.value || undefined,
        category: selectedCategory.value || undefined,
        installed: showInstalledOnly.value || undefined,
        page: currentPage.value,
        limit: pageSize.value,
        ...params,
      }

      const response = await pluginsApi.getPlugins(searchParams)
      plugins.value = response.data
      totalPlugins.value = response.total
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch plugins'
      console.error('Error fetching plugins:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchPlugin(id: string) {
    loading.value = true
    error.value = null

    try {
      currentPlugin.value = await pluginsApi.getPlugin(id)
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch plugin'
      console.error('Error fetching plugin:', err)
    } finally {
      loading.value = false
    }
  }

  async function installPlugin(pluginId: string) {
    loading.value = true
    error.value = null

    try {
      const progress = await pluginsApi.installPlugin({ pluginId })
      installProgress.value.set(pluginId, progress)

      // Poll for installation progress
      await pollInstallProgress(pluginId)

      // Refresh plugins list
      await fetchPlugins()
    } catch (err: any) {
      error.value = err.message || 'Failed to install plugin'
      console.error('Error installing plugin:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function pollInstallProgress(pluginId: string) {
    const maxAttempts = 60 // 60 seconds timeout
    let attempts = 0

    return new Promise<void>((resolve, reject) => {
      const interval = setInterval(async () => {
        attempts++

        try {
          const progress = await pluginsApi.getInstallProgress(pluginId)
          installProgress.value.set(pluginId, progress)

          if (progress.status === 'completed') {
            clearInterval(interval)
            resolve()
          } else if (progress.status === 'failed') {
            clearInterval(interval)
            reject(new Error(progress.error || 'Installation failed'))
          } else if (attempts >= maxAttempts) {
            clearInterval(interval)
            reject(new Error('Installation timeout'))
          }
        } catch (err) {
          clearInterval(interval)
          reject(err)
        }
      }, 1000)
    })
  }

  async function uninstallPlugin(pluginId: string) {
    loading.value = true
    error.value = null

    try {
      await pluginsApi.uninstallPlugin(pluginId)
      await fetchPlugins()
    } catch (err: any) {
      error.value = err.message || 'Failed to uninstall plugin'
      console.error('Error uninstalling plugin:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function activatePlugin(pluginId: string) {
    loading.value = true
    error.value = null

    try {
      await pluginsApi.activatePlugin(pluginId)
      await fetchPlugins()
    } catch (err: any) {
      error.value = err.message || 'Failed to activate plugin'
      console.error('Error activating plugin:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deactivatePlugin(pluginId: string) {
    loading.value = true
    error.value = null

    try {
      await pluginsApi.deactivatePlugin(pluginId)
      await fetchPlugins()
    } catch (err: any) {
      error.value = err.message || 'Failed to deactivate plugin'
      console.error('Error deactivating plugin:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function uploadPlugin(file: File) {
    loading.value = true
    error.value = null

    try {
      const plugin = await pluginsApi.uploadPlugin(file)
      await fetchPlugins()
      return plugin
    } catch (err: any) {
      error.value = err.message || 'Failed to upload plugin'
      console.error('Error uploading plugin:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
    currentPage.value = 1
  }

  function setCategory(category: string | null) {
    selectedCategory.value = category
    currentPage.value = 1
  }

  function setShowInstalledOnly(value: boolean) {
    showInstalledOnly.value = value
    currentPage.value = 1
  }

  function setPage(page: number) {
    currentPage.value = page
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    plugins,
    currentPlugin,
    loading,
    error,
    searchQuery,
    selectedCategory,
    showInstalledOnly,
    installProgress,
    currentPage,
    pageSize,
    totalPlugins,

    // Computed
    totalPages,
    installedPlugins,
    activePlugins,
    categories,

    // Actions
    fetchPlugins,
    fetchPlugin,
    installPlugin,
    uninstallPlugin,
    activatePlugin,
    deactivatePlugin,
    uploadPlugin,
    setSearchQuery,
    setCategory,
    setShowInstalledOnly,
    setPage,
    clearError,
  }
})
