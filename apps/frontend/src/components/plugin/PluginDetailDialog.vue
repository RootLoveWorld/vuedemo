<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePluginStore } from '@/stores/plugin'
import { Button } from '@/components/ui/Button.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog.vue'

interface Props {
  pluginId: string
}

const props = defineProps<Props>()
const pluginStore = usePluginStore()

const open = ref(false)

watch(open, async (isOpen) => {
  if (isOpen && props.pluginId) {
    await pluginStore.fetchPlugin(props.pluginId)
  }
})

const plugin = () => pluginStore.currentPlugin

async function handleInstall() {
  if (!plugin()) return

  try {
    await pluginStore.installPlugin(plugin()!.id)
    open.value = false
  } catch (error) {
    console.error('Failed to install plugin:', error)
  }
}

async function handleUninstall() {
  if (!plugin()) return

  if (confirm(`Are you sure you want to uninstall ${plugin()!.name}?`)) {
    try {
      await pluginStore.uninstallPlugin(plugin()!.id)
      open.value = false
    } catch (error) {
      console.error('Failed to uninstall plugin:', error)
    }
  }
}
</script>

<template>
  <div>
    <Button variant="ghost" size="sm" @click="open = true"> Details </Button>

    <Dialog v-model:open="open">
      <DialogContent class="plugin-detail-dialog">
        <DialogHeader>
          <div class="dialog-header-content">
            <div class="plugin-icon-large">
              {{ plugin()?.icon || '🔌' }}
            </div>
            <div>
              <DialogTitle>{{ plugin()?.name }}</DialogTitle>
              <DialogDescription>
                by {{ plugin()?.author }} • v{{ plugin()?.version }}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div v-if="pluginStore.loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading plugin details...</p>
        </div>

        <div v-else-if="plugin()" class="dialog-body">
          <!-- Description -->
          <section class="section">
            <h3 class="section-title">Description</h3>
            <p class="section-content">{{ plugin()!.description }}</p>
          </section>

          <!-- Category -->
          <section class="section">
            <h3 class="section-title">Category</h3>
            <span class="category-badge">{{ plugin()!.category }}</span>
          </section>

          <!-- Stats -->
          <section class="section">
            <h3 class="section-title">Statistics</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">Downloads</span>
                <span class="stat-value">{{ plugin()!.downloads?.toLocaleString() || 'N/A' }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Rating</span>
                <span class="stat-value">
                  {{ plugin()!.rating ? `⭐ ${plugin()!.rating.toFixed(1)}` : 'N/A' }}
                </span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Version</span>
                <span class="stat-value">{{ plugin()!.version }}</span>
              </div>
            </div>
          </section>

          <!-- Permissions -->
          <section v-if="plugin()!.manifest.permissions?.length" class="section">
            <h3 class="section-title">Required Permissions</h3>
            <ul class="permissions-list">
              <li v-for="permission in plugin()!.manifest.permissions" :key="permission">
                {{ permission }}
              </li>
            </ul>
          </section>

          <!-- Dependencies -->
          <section
            v-if="
              plugin()!.manifest.dependencies?.python?.length ||
              plugin()!.manifest.dependencies?.npm?.length
            "
            class="section"
          >
            <h3 class="section-title">Dependencies</h3>
            <div class="dependencies">
              <div v-if="plugin()!.manifest.dependencies?.python?.length" class="dep-group">
                <h4 class="dep-title">Python</h4>
                <ul class="dep-list">
                  <li v-for="dep in plugin()!.manifest.dependencies.python" :key="dep">
                    {{ dep }}
                  </li>
                </ul>
              </div>
              <div v-if="plugin()!.manifest.dependencies?.npm?.length" class="dep-group">
                <h4 class="dep-title">NPM</h4>
                <ul class="dep-list">
                  <li v-for="dep in plugin()!.manifest.dependencies.npm" :key="dep">
                    {{ dep }}
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <!-- Status -->
          <section class="section">
            <h3 class="section-title">Status</h3>
            <div class="status-info">
              <span :class="['status-badge', plugin()!.isInstalled ? 'installed' : '']">
                {{ plugin()!.isInstalled ? '✓ Installed' : '○ Not Installed' }}
              </span>
              <span
                v-if="plugin()!.isInstalled"
                :class="['status-badge', plugin()!.isActive ? 'active' : '']"
              >
                {{ plugin()!.isActive ? '● Active' : '○ Inactive' }}
              </span>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="open = false">Close</Button>
          <template v-if="plugin()">
            <Button
              v-if="!plugin()!.isInstalled"
              :disabled="pluginStore.loading"
              @click="handleInstall"
            >
              Install Plugin
            </Button>
            <Button
              v-else
              variant="destructive"
              :disabled="pluginStore.loading"
              @click="handleUninstall"
            >
              Uninstall Plugin
            </Button>
          </template>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.plugin-detail-dialog {
  max-width: 600px;
}

.dialog-header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.plugin-icon-large {
  font-size: 3rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid hsl(var(--border));
  border-top-color: hsl(var(--primary));
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
  padding: 0.5rem;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--muted-foreground));
}

.section-content {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: hsl(var(--foreground));
}

.category-badge {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
}

.permissions-list,
.dep-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.permissions-list li,
.dep-list li {
  padding: 0.5rem;
  background: hsl(var(--muted));
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-family: monospace;
}

.dependencies {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dep-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dep-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.status-info {
  display: flex;
  gap: 0.75rem;
}

.status-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.status-badge.installed {
  background: hsl(var(--success) / 0.1);
  color: hsl(var(--success));
}

.status-badge.active {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}
</style>
