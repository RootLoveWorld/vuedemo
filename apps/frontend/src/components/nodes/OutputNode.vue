<script setup lang="ts">
import { Upload } from 'lucide-vue-next'
import BaseNode from './BaseNode.vue'
import type { NodeProps } from '@vue-flow/core'

interface NodeData {
  label: string
  config?: {
    outputFormat?: string
    destination?: string
  }
}

interface Props extends NodeProps<NodeData> {}

defineProps<Props>()
</script>

<template>
  <BaseNode
    :label="data.label"
    :icon="Upload"
    color="bg-blue-500"
    :has-input="true"
    :has-output="false"
  >
    <div class="node-info">
      <div v-if="data.config?.outputFormat" class="info-item">
        Format: {{ data.config.outputFormat }}
      </div>
      <div v-if="data.config?.destination" class="info-item">
        Destination: {{ data.config.destination }}
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
