<script setup lang="ts">
import { GitBranch } from 'lucide-vue-next'
import BaseNode from './BaseNode.vue'
import type { NodeProps } from '@vue-flow/core'

interface NodeData {
  label: string
  config?: {
    condition?: string
    operator?: string
  }
}

interface Props extends NodeProps<NodeData> {}

defineProps<Props>()
</script>

<template>
  <BaseNode
    :label="data.label"
    :icon="GitBranch"
    color="bg-yellow-500"
    :has-input="true"
    :has-output="true"
  >
    <div class="node-info">
      <div v-if="data.config?.condition" class="info-item">
        Condition: {{ data.config.condition }}
      </div>
      <div v-if="data.config?.operator" class="info-item">Operator: {{ data.config.operator }}</div>
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
