<template>
  <div class="container mx-auto p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">Executions</h1>
      <p class="text-gray-600">Monitor and view execution history</p>
    </div>

    <!-- Execution History Section -->
    <div class="mb-6 bg-white rounded-lg shadow">
      <div class="p-6 border-b">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">Execution History</h2>
          <Button variant="outline" size="sm" @click="loadExecutionHistory">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="mr-2"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            Refresh
          </Button>
        </div>

        <!-- Search and Filter -->
        <div class="flex gap-4 mb-4">
          <div class="flex-1">
            <Input
              v-model="searchQuery"
              placeholder="Search by execution ID or workflow ID..."
              class="w-full"
            />
          </div>
          <select
            v-model="statusFilter"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <!-- Execution List -->
      <div class="divide-y">
        <div v-if="isLoadingHistory" class="p-8 text-center text-gray-500">
          Loading execution history...
        </div>
        <div v-else-if="filteredExecutions.length === 0" class="p-8 text-center text-gray-500">
          No executions found
        </div>
        <div
          v-for="execution in filteredExecutions"
          v-else
          :key="execution.id"
          class="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          :class="{ 'bg-blue-50': selectedExecutionId === execution.id }"
          @click="selectExecution(execution)"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <span
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="getStatusClass(execution.status)"
                >
                  {{ execution.status }}
                </span>
                <span class="font-mono text-sm text-gray-600">{{ execution.id }}</span>
              </div>
              <div class="text-sm text-gray-600">
                <span>Workflow: {{ execution.workflowId }}</span>
                <span class="mx-2">•</span>
                <span>{{ formatDateTime(execution.createdAt) }}</span>
              </div>
              <div v-if="execution.errorMessage" class="text-sm text-red-600 mt-1">
                Error: {{ execution.errorMessage }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Button
                v-if="execution.status === 'running'"
                variant="outline"
                size="sm"
                @click.stop="stopExecutionById(execution.id)"
              >
                Stop
              </Button>
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
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Execution Details Section -->
    <div v-if="selectedExecution" class="space-y-6">
      <!-- Execution Result Visualization -->
      <div class="bg-white rounded-lg shadow p-6">
        <ExecutionResultVisualization />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Execution Status Panel -->
        <div class="bg-white rounded-lg shadow p-6">
          <ExecutionStatus :execution="selectedExecution" />
        </div>

        <!-- Execution Logs Panel -->
        <div class="bg-white rounded-lg shadow p-6">
          <ExecutionLogs :is-connected="isConnected" :is-reconnecting="isReconnecting" />
        </div>
      </div>
    </div>

    <!-- Test Execution Section -->
    <div class="mt-6 bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">Test Execution</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Workflow ID</label>
          <Input v-model="testWorkflowId" placeholder="Enter workflow ID" class="max-w-md" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Input Data (JSON)</label>
          <Textarea
            v-model="testInputData"
            placeholder='{"key": "value"}'
            rows="4"
            class="max-w-md font-mono text-sm"
          />
        </div>
        <div class="flex gap-2">
          <Button :disabled="!testWorkflowId || isExecuting" @click="startTestExecution">
            {{ isExecuting ? 'Executing...' : 'Start Execution' }}
          </Button>
          <Button
            v-if="executionStore.currentExecution"
            variant="outline"
            :disabled="executionStore.currentExecution.status !== 'running'"
            @click="stopExecution"
          >
            Stop Execution
          </Button>
        </div>
        <div v-if="error" class="text-sm text-red-600">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useExecutionStore } from '@/stores/execution'
import { useExecutionWebSocket } from '@/composables/useExecutionWebSocket'
import { executionsApi } from '@/api/executions'
import ExecutionStatus from '@/components/execution/ExecutionStatus.vue'
import ExecutionLogs from '@/components/execution/ExecutionLogs.vue'
import ExecutionResultVisualization from '@/components/execution/ExecutionResultVisualization.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'

const executionStore = useExecutionStore()
const { isConnected, isReconnecting, initialize, subscribeToExecution, cleanup } =
  useExecutionWebSocket()

const testWorkflowId = ref('')
const testInputData = ref('{\n  "input": "test"\n}')
const isExecuting = ref(false)
const error = ref('')

// Execution history state
const searchQuery = ref('')
const statusFilter = ref('')
const isLoadingHistory = ref(false)
const selectedExecutionId = ref<string | null>(null)

// Computed properties
const filteredExecutions = computed(() => {
  let executions = executionStore.executionHistory

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    executions = executions.filter(
      (e) => e.id.toLowerCase().includes(query) || e.workflowId.toLowerCase().includes(query)
    )
  }

  // Filter by status
  if (statusFilter.value) {
    executions = executions.filter((e) => e.status === statusFilter.value)
  }

  return executions
})

const selectedExecution = computed(() => {
  if (!selectedExecutionId.value) return null
  return executionStore.executionHistory.find((e) => e.id === selectedExecutionId.value) || null
})

onMounted(() => {
  // Initialize WebSocket connection
  initialize()
  // Load execution history
  loadExecutionHistory()
})

onUnmounted(() => {
  // Clean up WebSocket connection
  cleanup()
})

async function loadExecutionHistory() {
  isLoadingHistory.value = true
  try {
    const executions = await executionsApi.getHistory()
    executionStore.setExecutionHistory(executions)
  } catch (err: any) {
    error.value = err.message || 'Failed to load execution history'
  } finally {
    isLoadingHistory.value = false
  }
}

function selectExecution(execution: any) {
  selectedExecutionId.value = execution.id
  executionStore.setCurrentExecution(execution)
  // Subscribe to execution updates if it's still running
  if (execution.status === 'running') {
    subscribeToExecution(execution.id)
  }
}

async function stopExecutionById(executionId: string) {
  try {
    await executionsApi.stop(executionId)
  } catch (err: any) {
    error.value = err.message || 'Failed to stop execution'
  }
}

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

async function startTestExecution() {
  if (!testWorkflowId.value) {
    error.value = 'Please enter a workflow ID'
    return
  }

  try {
    error.value = ''
    isExecuting.value = true

    // Parse input data
    let inputData = {}
    if (testInputData.value.trim()) {
      try {
        inputData = JSON.parse(testInputData.value)
      } catch {
        error.value = 'Invalid JSON in input data'
        isExecuting.value = false
        return
      }
    }

    // Clear previous logs and statuses
    executionStore.clearLogs()
    executionStore.clearNodeStatuses()

    // Start execution
    const execution = await executionsApi.execute({
      workflowId: testWorkflowId.value,
      inputData,
    })

    // Set current execution
    executionStore.setCurrentExecution(execution)

    // Subscribe to execution updates via WebSocket
    subscribeToExecution(execution.id)
  } catch (e: any) {
    error.value = e.message || 'Failed to start execution'
  } finally {
    isExecuting.value = false
  }
}

async function stopExecution() {
  if (!executionStore.currentExecution) return

  try {
    await executionsApi.stop(executionStore.currentExecution.id)
  } catch (e: any) {
    error.value = e.message || 'Failed to stop execution'
  }
}
</script>
