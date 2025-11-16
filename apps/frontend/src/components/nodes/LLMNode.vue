<script setup lang="ts">
import { Brain } from 'lucide-vue-next'
import BaseNode from './BaseNode.vue'
import type { NodeProps } from '@vue-flow/core'

interface NodeData {
  label: string
  config?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }
}

interface Props extends NodeProps<NodeData> {}

defineProps<Props>()
</script>

<template>
  <BaseNode
    :label="data.label"
    :icon="Brain"
    color="bg-purple-500"
    :has-input="true"
    :has-output="true"
  >
    <div class="node-info">
      <div v-if="data.config?.model" class="info-item">Model: {{ data.config.model }}</div>
      <div v-if="data.config?.temperature !== undefined" class="info-item">
        Temperature: {{ data.config.temperature }}
      </div>
      <div v-if="data.config?.maxTokens" class="info-item">
        Max Tokens: {{ data.config.maxTokens }}
      </div>
    </div>
  </BaseNode>
</template>

<style scoped>
.node-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item {
  font-size: 0.75rem;
  color: #6b7280;
}
</style>
