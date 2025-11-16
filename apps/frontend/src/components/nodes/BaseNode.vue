<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { Component } from 'vue'

interface Props {
  label: string
  icon: Component
  color: string
  hasInput?: boolean
  hasOutput?: boolean
  status?: 'idle' | 'running' | 'success' | 'error'
}

withDefaults(defineProps<Props>(), {
  hasInput: true,
  hasOutput: true,
  status: 'idle',
})
</script>

<template>
  <div class="base-node" :class="[`status-${status}`, color]">
    <Handle v-if="hasInput" type="target" :position="Position.Left" class="node-handle" />

    <div class="node-header">
      <div class="node-icon">
        <component :is="icon" :size="16" />
      </div>
      <div class="node-label">{{ label }}</div>
    </div>

    <div class="node-content">
      <slot />
    </div>

    <Handle v-if="hasOutput" type="source" :position="Position.Right" class="node-handle" />
  </div>
</template>

<style scoped>
.base-node {
  min-width: 180px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  transition: all 0.2s;
}

.base-node:hover {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.base-node.status-running {
  border-color: #3b82f6;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.base-node.status-success {
  border-color: #10b981;
}

.base-node.status-error {
  border-color: #ef4444;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.node-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.node-icon {
  width: 32px;
  height: 32px;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.bg-blue-500 .node-icon {
  background: #3b82f6;
}

.bg-purple-500 .node-icon {
  background: #a855f7;
}

.bg-yellow-500 .node-icon {
  background: #eab308;
}

.bg-green-500 .node-icon {
  background: #22c55e;
}

.bg-orange-500 .node-icon {
  background: #f97316;
}

.bg-teal-500 .node-icon {
  background: #14b8a6;
}

.node-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.node-content {
  padding: 0.75rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.node-handle {
  width: 10px;
  height: 10px;
  background: #3b82f6;
  border: 2px solid white;
}
</style>
