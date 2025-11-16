/**
 * Plugin related types
 */

export interface PluginManifest {
  id: string
  name: string
  version: string
  author: string
  description: string
  category: 'integration' | 'ai' | 'data' | 'utility' | 'custom'
  icon?: string
  frontend?: {
    component: string
    configPanel: string
  }
  backend?: {
    executor: string
    entrypoint: string
  }
  config?: {
    schema: Record<string, any>
  }
  permissions?: string[]
  dependencies?: {
    python?: string[]
    npm?: string[]
  }
}

export interface Plugin {
  id: string
  name: string
  version: string
  author: string
  description: string
  category: string
  icon?: string
  manifest: PluginManifest
  isInstalled: boolean
  isActive: boolean
  downloads?: number
  rating?: number
  createdAt: Date
  updatedAt: Date
}

export interface PluginListItem {
  id: string
  name: string
  version: string
  author: string
  description: string
  category: string
  icon?: string
  isInstalled: boolean
  isActive: boolean
  downloads?: number
  rating?: number
}

export interface CreatePluginDto {
  manifest: PluginManifest
  file: File
}

export interface InstallPluginDto {
  pluginId: string
}

export interface PluginInstallProgress {
  pluginId: string
  status: 'downloading' | 'extracting' | 'installing' | 'completed' | 'failed'
  progress: number
  message?: string
  error?: string
}

export interface PluginSearchParams {
  query?: string
  category?: string
  installed?: boolean
  page?: number
  limit?: number
}
