<template>
  <div class="execution-status">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">Execution Status</h3>
      <div class="flex items-center gap-2">
        <span
          class="px-3 py-1 rounded-full text-sm font-medium"
          :class="getStatusClass(execution?.status || 'pending')"
        >
          {{ execution?.status || 'Unknown' }}
        </span>
      </div>
    </div>

    <div v-if="execution" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-500">Execution ID</p>
          <p class="font-mono text-sm">{{ execution.id }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Workflow ID</p>
          <p class="font-mono text-sm">{{ execution.workflowId }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Started At</p>
          <p class="text-sm">
            {{ execution.startedAt ? formatDateTime(execution.startedAt) : 'Not started' }}
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Completed At</p>
          <p class="text-sm">
            {{ execution.completedAt ? formatDateTime(execution.completedAt) : 'Not completed' }}
          </p>
        </div>
      </div>

      <div v-if="execution.status === 'running'" class="mt-4">
        <p class="text-sm text-gray-500 mb-2">Node Status</p>
        <div class="space-y-2">
          <div
            v-for="[nodeId, status] in nodeStatuses"
            :key="nodeId"
            class="flex items-center justify-between p-2 bg-gray-50 rounded"
          >
            <span class="text-sm font-mono">{{ nodeId }}</span>
            <span class="px-2 py-1 rounded text-xs font-medium" :class="getStatusClass(status)">
              {{ status }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="execution.errorMessage" class="mt-4">
        <p class="text-sm text-gray-500 mb-2">Error Message</p>
        <div class="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {{ execution.errorMessage }}
        </div>
      </div>

      <div v-if="execution.outputData" class="mt-4">
        <p class="text-sm text-gray-500 mb-2">Output Data</p>
        <pre class="p-3 bg-gray-50 border border-gray-200 rounded text-sm overflow-x-auto">{{
          JSON.stringify(execution.outputData, null, 2)
        }}</pre>
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-500">No execution selected</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useExecutionStore } from '@/stores/execution'
import type { Execution } from '@/stores/execution'

interface Props {
  execution: Execution | null
}

defineProps<Props>()

const executionStore = useExecutionStore()

const nodeStatuses = computed(() => {
  return Array.from(executionStore.realTimeStatus.entries())
})

function getStatusClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-gray-200 text-gray-800'
    case 'running':
      return 'bg-blue-200 text-blue-800'
    case 'completed':
      return 'bg-green-200 text-green-800'
    case 'failed':
      return 'bg-red-200 text-red-800'
    default:
      return 'bg-gray-200 text-gray-800'
  }
}

function formatDateTime(date: Date): string {
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
</script>
