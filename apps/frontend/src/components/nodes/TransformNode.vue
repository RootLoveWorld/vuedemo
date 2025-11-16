<script setup lang="ts">
import { Shuffle } from 'lucide-vue-next'
import BaseNode from './BaseNode.vue'
import type { NodeProps } from '@vue-flow/core'

interface NodeData {
  label: string
  config?: {
    transformType?: string
    expression?: string
  }
}

interface Props extends NodeProps<NodeData> {}

defineProps<Props>()
</script>

<template>
  <BaseNode
    :label="data.label"
    :icon="Shuffle"
    color="bg-green-500"
    :has-input="true"
    :has-output="true"
  >
    <div class="node-info">
      <div v-if="data.config?.transformType" class="info-item">
        Type: {{ data.config.transformType }}
      </div>
      <div v-if="data.config?.expression" class="info-item">
        Expression: {{ data.config.expression }}
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
