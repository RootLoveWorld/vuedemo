<script setup lang="ts">
import { Download } from 'lucide-vue-next'
import BaseNode from './BaseNode.vue'
import type { NodeProps } from '@vue-flow/core'

interface NodeData {
  label: string
  config?: {
    inputType?: string
    defaultValue?: any
  }
}

interface Props extends NodeProps<NodeData> {}

defineProps<Props>()
</script>

<template>
  <BaseNode
    :label="data.label"
    :icon="Download"
    color="bg-blue-500"
    :has-input="false"
    :has-output="true"
  >
    <div class="node-info">
      <div v-if="data.config?.inputType" class="info-item">Type: {{ data.config.inputType }}</div>
      <div v-if="data.config?.defaultValue" class="info-item">
        Default: {{ data.config.defaultValue }}
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
