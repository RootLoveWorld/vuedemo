<template>
  <div class="execution-logs">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">Execution Logs</h3>
      <div class="flex items-center gap-2">
        <span v-if="isConnected" class="flex items-center gap-1 text-sm text-green-600">
          <span class="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
          Connected
        </span>
        <span v-else-if="isReconnecting" class="flex items-center gap-1 text-sm text-yellow-600">
          <span class="w-2 h-2 bg-yellow-600 rounded-full animate-pulse"></span>
          Reconnecting...
        </span>
        <span v-else class="flex items-center gap-1 text-sm text-red-600">
          <span class="w-2 h-2 bg-red-600 rounded-full"></span>
          Disconnected
        </span>
        <Button variant="outline" size="sm" @click="clearLogs"> Clear Logs </Button>
      </div>
    </div>

    <div
      ref="logsContainer"
      class="logs-container bg-gray-900 text-gray-100 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm"
    >
      <div v-if="logs.length === 0" class="text-gray-500 text-center py-8">
        No logs yet. Logs will appear here when execution starts.
      </div>
      <div
        v-for="log in logs"
        :key="log.id"
        class="log-entry mb-2 flex gap-2"
        :class="getLogClass(log.level)"
      >
        <span class="text-gray-500 shrink-0">
          {{ formatTime(log.createdAt) }}
        </span>
        <span class="font-semibold shrink-0" :class="getLevelClass(log.level)">
          [{{ log.level.toUpperCase() }}]
        </span>
        <span v-if="log.nodeId" class="text-blue-400 shrink-0"> [{{ log.nodeId }}] </span>
        <span class="break-all">{{ log.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useExecutionStore } from '@/stores/execution'
import type { ExecutionLog } from '@/stores/execution'
import Button from '@/components/ui/Button.vue'

interface Props {
  isConnected: boolean
  isReconnecting: boolean
}

defineProps<Props>()

const executionStore = useExecutionStore()
const logsContainer = ref<HTMLDivElement | null>(null)

const logs = ref<ExecutionLog[]>([])

// Watch for new logs and auto-scroll
watch(
  () => executionStore.logs,
  (newLogs) => {
    logs.value = newLogs
    nextTick(() => {
      scrollToBottom()
    })
  },
  { deep: true, immediate: true }
)

function scrollToBottom() {
  if (logsContainer.value) {
    logsContainer.value.scrollTop = logsContainer.value.scrollHeight
  }
}

function clearLogs() {
  executionStore.clearLogs()
  logs.value = []
}

function formatTime(date: Date): string {
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getLogClass(level: string): string {
  switch (level) {
    case 'error':
      return 'text-red-400'
    case 'warning':
      return 'text-yellow-400'
    default:
      return 'text-gray-300'
  }
}

function getLevelClass(level: string): string {
  switch (level) {
    case 'error':
      return 'text-red-500'
    case 'warning':
      return 'text-yellow-500'
    case 'info':
      return 'text-blue-500'
    default:
      return 'text-gray-500'
  }
}
</script>

<style scoped>
.logs-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.logs-container::-webkit-scrollbar {
  width: 8px;
}

.logs-container::-webkit-scrollbar-track {
  background: transparent;
}

.logs-container::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 4px;
}

.logs-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}
</style>
