<template>
  <div class="execution-result-visualization">
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-4">Execution Result Visualization</h3>

      <!-- Tabs for different views -->
      <div class="flex gap-2 border-b mb-4">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="px-4 py-2 text-sm font-medium transition-colors"
          :class="
            activeTab === tab.id
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          "
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Node Status View -->
      <div v-if="activeTab === 'nodes'" class="space-y-4">
        <div v-if="nodeStatuses.length === 0" class="text-center py-8 text-gray-500">
          No node execution data available
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="nodeStatus in nodeStatuses"
            :key="nodeStatus.nodeId"
            class="border rounded-lg p-4 hover:shadow-md transition-shadow"
            :class="getNodeStatusBorderClass(nodeStatus.status)"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-mono text-sm font-medium">{{ nodeStatus.nodeId }}</span>
                  <span
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="getStatusClass(nodeStatus.status)"
                  >
                    {{ nodeStatus.status }}
                  </span>
                </div>
                <div v-if="nodeStatus.startedAt" class="text-xs text-gray-500">
                  Started: {{ formatDateTime(nodeStatus.startedAt) }}
                </div>
                <div v-if="nodeStatus.completedAt" class="text-xs text-gray-500">
                  Completed: {{ formatDateTime(nodeStatus.completedAt) }}
                  <span v-if="nodeStatus.startedAt" class="ml-2">
                    ({{ calculateDuration(nodeStatus.startedAt, nodeStatus.completedAt) }})
                  </span>
                </div>
              </div>
              <div class="flex items-center">
                <component :is="getStatusIcon(nodeStatus.status)" class="w-5 h-5" />
              </div>
            </div>

            <!-- Node Output -->
            <div v-if="nodeStatus.output" class="mt-3">
              <div class="text-xs font-medium text-gray-700 mb-1">Output:</div>
              <pre
                class="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto max-h-32"
                >{{ formatOutput(nodeStatus.output) }}</pre
              >
            </div>

            <!-- Node Error -->
            <div v-if="nodeStatus.error" class="mt-3">
              <div class="text-xs font-medium text-red-700 mb-1">Error:</div>
              <div class="text-xs bg-red-50 border border-red-200 rounded p-2 text-red-800">
                {{ nodeStatus.error }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline View -->
      <div v-if="activeTab === 'timeline'" class="space-y-4">
        <div v-if="timelineEvents.length === 0" class="text-center py-8 text-gray-500">
          No timeline data available
        </div>
        <div v-else class="relative">
          <!-- Timeline line -->
          <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>

          <!-- Timeline events -->
          <div class="space-y-4">
            <div v-for="(event, index) in timelineEvents" :key="index" class="relative pl-12 pb-4">
              <!-- Timeline dot -->
              <div
                class="absolute left-2.5 w-3 h-3 rounded-full border-2 border-white"
                :class="getTimelineDotClass(event.type)"
              ></div>

              <!-- Event content -->
              <div class="bg-white border rounded-lg p-3 shadow-sm">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-medium">{{ event.title }}</span>
                  <span class="text-xs text-gray-500">{{ formatTime(event.timestamp) }}</span>
                </div>
                <div class="text-xs text-gray-600">{{ event.description }}</div>
                <div v-if="event.nodeId" class="text-xs text-gray-500 mt-1">
                  Node: <span class="font-mono">{{ event.nodeId }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Summary View -->
      <div v-if="activeTab === 'errors'" class="space-y-4">
        <div v-if="errorSummary.length === 0" class="text-center py-8 text-gray-500">
          <div class="flex flex-col items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-green-500"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span class="text-green-600 font-medium">No errors detected</span>
          </div>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="(error, index) in errorSummary"
            :key="index"
            class="border border-red-200 rounded-lg p-4 bg-red-50"
          >
            <div class="flex items-start gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="text-red-600 shrink-0 mt-0.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              <div class="flex-1">
                <div class="font-medium text-red-900 mb-1">{{ error.nodeId }}</div>
                <div class="text-sm text-red-800">{{ error.message }}</div>
                <div class="text-xs text-red-600 mt-2">
                  {{ formatDateTime(error.timestamp) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Flow Diagram View -->
      <div v-if="activeTab === 'flow'" class="space-y-4">
        <ExecutionFlowVisualization />
      </div>

      <!-- Statistics View -->
      <div v-if="activeTab === 'stats'" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="border rounded-lg p-4 bg-white">
            <div class="text-sm text-gray-600 mb-1">Total Nodes</div>
            <div class="text-2xl font-bold">{{ statistics.totalNodes }}</div>
          </div>
          <div class="border rounded-lg p-4 bg-white">
            <div class="text-sm text-gray-600 mb-1">Completed</div>
            <div class="text-2xl font-bold text-green-600">{{ statistics.completedNodes }}</div>
          </div>
          <div class="border rounded-lg p-4 bg-white">
            <div class="text-sm text-gray-600 mb-1">Failed</div>
            <div class="text-2xl font-bold text-red-600">{{ statistics.failedNodes }}</div>
          </div>
          <div class="border rounded-lg p-4 bg-white">
            <div class="text-sm text-gray-600 mb-1">Total Duration</div>
            <div class="text-2xl font-bold">{{ statistics.totalDuration }}</div>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="border rounded-lg p-4 bg-white">
          <div class="text-sm text-gray-600 mb-2">Execution Progress</div>
          <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              class="h-full transition-all duration-300"
              :class="statistics.failedNodes > 0 ? 'bg-red-500' : 'bg-green-500'"
              :style="{ width: `${statistics.progressPercentage}%` }"
            ></div>
          </div>
          <div class="text-xs text-gray-500 mt-1 text-right">
            {{ statistics.progressPercentage }}%
          </div>
        </div>

        <!-- Node status breakdown -->
        <div class="border rounded-lg p-4 bg-white">
          <div class="text-sm font-medium mb-3">Node Status Breakdown</div>
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Pending</span>
              <span class="font-medium">{{ statistics.pendingNodes }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Running</span>
              <span class="font-medium">{{ statistics.runningNodes }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Completed</span>
              <span class="font-medium text-green-600">{{ statistics.completedNodes }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Failed</span>
              <span class="font-medium text-red-600">{{ statistics.failedNodes }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useExecutionStore } from '@/stores/execution'
import ExecutionFlowVisualization from './ExecutionFlowVisualization.vue'
import type { NodeExecutionStatus } from '@workflow/shared-types'

interface TimelineEvent {
  type: 'start' | 'node' | 'error' | 'complete'
  title: string
  description: string
  timestamp: Date
  nodeId?: string
}

interface ErrorSummary {
  nodeId: string
  message: string
  timestamp: Date
}

const executionStore = useExecutionStore()

const activeTab = ref<'nodes' | 'timeline' | 'errors' | 'stats' | 'flow'>('nodes')

const tabs = [
  { id: 'nodes' as const, label: 'Node Status' },
  { id: 'timeline' as const, label: 'Timeline' },
  { id: 'errors' as const, label: 'Errors' },
  { id: 'stats' as const, label: 'Statistics' },
  { id: 'flow' as const, label: 'Flow Diagram' },
]

// Compute node statuses from store
const nodeStatuses = computed<NodeExecutionStatus[]>(() => {
  const statuses: NodeExecutionStatus[] = []
  executionStore.realTimeStatus.forEach((status, nodeId) => {
    statuses.push({
      nodeId,
      status: status as any,
      startedAt: undefined,
      completedAt: undefined,
    })
  })
  return statuses
})

// Compute timeline events
const timelineEvents = computed<TimelineEvent[]>(() => {
  const events: TimelineEvent[] = []

  // Add execution start event
  if (executionStore.currentExecution?.startedAt) {
    events.push({
      type: 'start',
      title: 'Execution Started',
      description: `Workflow execution ${executionStore.currentExecution.id} started`,
      timestamp: new Date(executionStore.currentExecution.startedAt),
    })
  }

  // Add node events from logs
  executionStore.logs.forEach((log) => {
    if (log.nodeId) {
      events.push({
        type: log.level === 'error' ? 'error' : 'node',
        title: log.level === 'error' ? 'Node Error' : 'Node Event',
        description: log.message,
        timestamp: new Date(log.createdAt),
        nodeId: log.nodeId,
      })
    }
  })

  // Add execution complete event
  if (executionStore.currentExecution?.completedAt) {
    events.push({
      type: 'complete',
      title: 'Execution Completed',
      description: `Workflow execution finished with status: ${executionStore.currentExecution.status}`,
      timestamp: new Date(executionStore.currentExecution.completedAt),
    })
  }

  // Sort by timestamp
  return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
})

// Compute error summary
const errorSummary = computed<ErrorSummary[]>(() => {
  const errors: ErrorSummary[] = []

  // Add errors from logs
  executionStore.logs
    .filter((log) => log.level === 'error')
    .forEach((log) => {
      errors.push({
        nodeId: log.nodeId || 'Unknown',
        message: log.message,
        timestamp: new Date(log.createdAt),
      })
    })

  // Add execution error if exists
  if (
    executionStore.currentExecution?.errorMessage &&
    executionStore.currentExecution?.status === 'failed'
  ) {
    errors.push({
      nodeId: 'Execution',
      message: executionStore.currentExecution.errorMessage,
      timestamp: executionStore.currentExecution.completedAt || new Date(),
    })
  }

  return errors
})

// Compute statistics
const statistics = computed(() => {
  const totalNodes = nodeStatuses.value.length
  const completedNodes = nodeStatuses.value.filter((n) => n.status === 'completed').length
  const failedNodes = nodeStatuses.value.filter((n) => n.status === 'failed').length
  const runningNodes = nodeStatuses.value.filter((n) => n.status === 'running').length
  const pendingNodes = nodeStatuses.value.filter((n) => n.status === 'pending').length

  const progressPercentage =
    totalNodes > 0 ? Math.round(((completedNodes + failedNodes) / totalNodes) * 100) : 0

  let totalDuration = 'N/A'
  if (executionStore.currentExecution?.startedAt && executionStore.currentExecution?.completedAt) {
    totalDuration = calculateDuration(
      executionStore.currentExecution.startedAt,
      executionStore.currentExecution.completedAt
    )
  }

  return {
    totalNodes,
    completedNodes,
    failedNodes,
    runningNodes,
    pendingNodes,
    progressPercentage,
    totalDuration,
  }
})

// Helper functions
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

function getNodeStatusBorderClass(status: string): string {
  switch (status) {
    case 'running':
      return 'border-l-4 border-l-blue-500'
    case 'completed':
      return 'border-l-4 border-l-green-500'
    case 'failed':
      return 'border-l-4 border-l-red-500'
    default:
      return 'border-l-4 border-l-gray-300'
  }
}

function getStatusIcon(status: string) {
  const icons = {
    pending: 'svg',
    running: 'svg',
    completed: 'svg',
    failed: 'svg',
  }
  return icons[status as keyof typeof icons] || 'svg'
}

function getTimelineDotClass(type: string): string {
  switch (type) {
    case 'start':
      return 'bg-blue-500'
    case 'node':
      return 'bg-gray-500'
    case 'error':
      return 'bg-red-500'
    case 'complete':
      return 'bg-green-500'
    default:
      return 'bg-gray-500'
  }
}

function formatDateTime(date: Date | string): string {
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

function formatTime(date: Date): string {
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function calculateDuration(start: Date | string, end: Date | string): string {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  const durationMs = endTime - startTime

  if (durationMs < 1000) {
    return `${durationMs}ms`
  } else if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(2)}s`
  } else {
    const minutes = Math.floor(durationMs / 60000)
    const seconds = ((durationMs % 60000) / 1000).toFixed(0)
    return `${minutes}m ${seconds}s`
  }
}

function formatOutput(output: any): string {
  if (typeof output === 'string') {
    return output
  }
  return JSON.stringify(output, null, 2)
}

// Watch for execution changes to auto-switch to appropriate tab
watch(
  () => executionStore.currentExecution?.status,
  (status) => {
    if (status === 'failed' && errorSummary.value.length > 0) {
      activeTab.value = 'errors'
    }
  }
)
</script>

<style scoped>
/* Add any additional styles if needed */
</style>
