<script setup lang="ts">
import { computed } from 'vue'
import type { PluginListItem } from '@workflow/shared-types'
import { Button } from '@/components/ui/Button.vue'
import { Card } from '@/components/ui/Card.vue'
import { usePluginStore } from '@/stores/plugin'
import PluginDetailDialog from './PluginDetailDialog.vue'

interface Props {
  plugin: PluginListItem
}

const props = defineProps<Props>()
const pluginStore = usePluginStore()

const categoryColors: Record<string, string> = {
  integration: 'bg-blue-100 text-blue-800',
  ai: 'bg-purple-100 text-purple-800',
  data: 'bg-green-100 text-green-800',
  utility: 'bg-yellow-100 text-yellow-800',
  custom: 'bg-gray-100 text-gray-800',
}

const categoryColor = computed(() => {
  return categoryColors[props.plugin.category] || categoryColors.custom
})

const installProgress = computed(() => {
  return pluginStore.installProgress.get(props.plugin.id)
})

const isInstalling = computed(() => {
  const progress = installProgress.value
  return progress && ['downloading', 'extracting', 'installing'].includes(progress.status)
})

async function handleInstall() {
  try {
    await pluginStore.installPlugin(props.plugin.id)
  } catch (error) {
    console.error('Failed to install plugin:', error)
  }
}

async function handleUninstall() {
  if (confirm(`Are you sure you want to uninstall ${props.plugin.name}?`)) {
    try {
      await pluginStore.uninstallPlugin(props.plugin.id)
    } catch (error) {
      console.error('Failed to uninstall plugin:', error)
    }
  }
}

async function handleToggleActive() {
  try {
    if (props.plugin.isActive) {
      await pluginStore.deactivatePlugin(props.plugin.id)
    } else {
      await pluginStore.activatePlugin(props.plugin.id)
    }
  } catch (error) {
    console.error('Failed to toggle plugin:', error)
  }
}
</script>

<template>
  <Card class="plugin-card">
    <div class="card-header">
      <div class="plugin-icon">
        {{ plugin.icon || '🔌' }}
      </div>
      <div class="plugin-info">
        <h3 class="plugin-name">{{ plugin.name }}</h3>
        <p class="plugin-author">by {{ plugin.author }}</p>
      </div>
      <span :class="['category-badge', categoryColor]">
        {{ plugin.category }}
      </span>
    </div>

    <div class="card-body">
      <p class="plugin-description">{{ plugin.description }}</p>

      <div class="plugin-meta">
        <div class="meta-item">
          <span class="meta-label">Version:</span>
          <span class="meta-value">{{ plugin.version }}</span>
        </div>
        <div v-if="plugin.downloads" class="meta-item">
          <span class="meta-label">Downloads:</span>
          <span class="meta-value">{{ plugin.downloads.toLocaleString() }}</span>
        </div>
        <div v-if="plugin.rating" class="meta-item">
          <span class="meta-label">Rating:</span>
          <span class="meta-value">⭐ {{ plugin.rating.toFixed(1) }}</span>
        </div>
      </div>

      <!-- Installation Progress -->
      <div v-if="isInstalling" class="install-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${installProgress?.progress || 0}%` }"></div>
        </div>
        <p class="progress-text">
          {{ installProgress?.message || 'Installing...' }}
        </p>
      </div>
    </div>

    <div class="card-footer">
      <div class="status-badges">
        <span v-if="plugin.isInstalled" class="status-badge installed"> ✓ Installed </span>
        <span v-if="plugin.isActive" class="status-badge active"> ● Active </span>
      </div>

      <div class="actions">
        <PluginDetailDialog :plugin-id="plugin.id" />

        <template v-if="!plugin.isInstalled">
          <Button size="sm" :disabled="isInstalling || pluginStore.loading" @click="handleInstall">
            {{ isInstalling ? 'Installing...' : 'Install' }}
          </Button>
        </template>

        <template v-else>
          <Button
            size="sm"
            variant="outline"
            :disabled="pluginStore.loading"
            @click="handleToggleActive"
          >
            {{ plugin.isActive ? 'Deactivate' : 'Activate' }}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            :disabled="pluginStore.loading"
            @click="handleUninstall"
          >
            Uninstall
          </Button>
        </template>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.plugin-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.plugin-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.25rem;
  border-bottom: 1px solid hsl(var(--border));
}

.plugin-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.plugin-info {
  flex: 1;
  min-width: 0;
}

.plugin-name {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-author {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
}

.category-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
}

.card-body {
  flex: 1;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.plugin-description {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.plugin-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
}

.meta-item {
  display: flex;
  gap: 0.25rem;
}

.meta-label {
  color: hsl(var(--muted-foreground));
}

.meta-value {
  font-weight: 500;
}

.install-progress {
  margin-top: auto;
}

.progress-bar {
  width: 100%;
  height: 0.5rem;
  background: hsl(var(--muted));
  border-radius: 0.25rem;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: hsl(var(--primary));
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

.card-footer {
  padding: 1.25rem;
  border-top: 1px solid hsl(var(--border));
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.status-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.installed {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.status-badge.active {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
