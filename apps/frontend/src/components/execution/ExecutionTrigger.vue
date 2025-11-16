<template>
  <div class="execution-trigger">
    <div class="mb-4">
      <h3 class="text-lg font-semibold mb-2">Execute Workflow</h3>
      <p class="text-sm text-gray-600">Configure input parameters and start execution</p>
    </div>

    <!-- Input Parameters Form -->
    <div class="space-y-4">
      <div>
        <Label for="input-data">Input Data (JSON)</Label>
        <Textarea
          id="input-data"
          v-model="inputDataText"
          placeholder='{"key": "value"}'
          rows="6"
          class="font-mono text-sm mt-1"
          :class="{ 'border-red-500': validationError }"
        />
        <p v-if="validationError" class="text-sm text-red-600 mt-1">
          {{ validationError }}
        </p>
        <p v-else class="text-sm text-gray-500 mt-1">
          Enter input data as JSON. This will be passed to the workflow's input nodes.
        </p>
      </div>

      <!-- Quick Templates -->
      <div>
        <Label>Quick Templates</Label>
        <div class="flex gap-2 mt-1">
          <Button variant="outline" size="sm" @click="useEmptyTemplate">Empty Object</Button>
          <Button variant="outline" size="sm" @click="useTextTemplate">Text Input</Button>
          <Button variant="outline" size="sm" @click="useArrayTemplate">Array Input</Button>
        </div>
      </div>

      <!-- Execution Actions -->
      <div class="flex gap-2 pt-2">
        <Button :disabled="!canExecute || isExecuting" class="flex-1" @click="handleExecute">
          <span v-if="isExecuting">Executing...</span>
          <span v-else>Start Execution</span>
        </Button>

        <Button
          v-if="currentExecution && currentExecution.status === 'running'"
          variant="destructive"
          :disabled="isStopping"
          @click="handleStop"
        >
          <span v-if="isStopping">Stopping...</span>
          <span v-else>Stop</span>
        </Button>
      </div>

      <!-- Error Display -->
      <Alert v-if="error" variant="destructive">
        <p class="text-sm">{{ error }}</p>
      </Alert>

      <!-- Current Execution Status -->
      <div v-if="currentExecution" class="border rounded-lg p-4 bg-gray-50">
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-medium">Current Execution</h4>
          <span
            class="px-2 py-1 text-xs font-medium rounded"
            :class="getStatusClass(currentExecution.status)"
          >
            {{ currentExecution.status.toUpperCase() }}
          </span>
        </div>
        <div class="text-sm text-gray-600 space-y-1">
          <p>ID: {{ currentExecution.id }}</p>
          <p v-if="currentExecution.startedAt">
            Started: {{ formatDate(currentExecution.startedAt) }}
          </p>
          <p v-if="currentExecution.completedAt">
            Completed: {{ formatDate(currentExecution.completedAt) }}
          </p>
          <p v-if="currentExecution.errorMessage" class="text-red-600">
            Error: {{ currentExecution.errorMessage }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useExecutionStore } from '@/stores/execution'
import { useWorkflowStore } from '@/stores/workflow'
import { executionsApi } from '@/api/executions'
import Button from '@/components/ui/Button.vue'
import Label from '@/components/ui/Label.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Alert from '@/components/ui/Alert.vue'

const executionStore = useExecutionStore()
const workflowStore = useWorkflowStore()

const inputDataText = ref('{\n  \n}')
const validationError = ref('')
const error = ref('')
const isExecuting = ref(false)
const isStopping = ref(false)

const currentExecution = computed(() => executionStore.currentExecution)

const canExecute = computed(() => {
  return workflowStore.currentWorkflow && !isExecuting.value
})

// Validate JSON input on change
watch(inputDataText, (newValue) => {
  if (!newValue.trim()) {
    validationError.value = ''
    return
  }

  try {
    JSON.parse(newValue)
    validationError.value = ''
  } catch {
    validationError.value = 'Invalid JSON format'
  }
})

async function handleExecute() {
  if (!workflowStore.currentWorkflow) {
    error.value = 'No workflow selected'
    return
  }

  // Validate JSON
  let inputData = {}
  if (inputDataText.value.trim()) {
    try {
      inputData = JSON.parse(inputDataText.value)
    } catch {
      validationError.value = 'Invalid JSON format'
      return
    }
  }

  try {
    error.value = ''
    isExecuting.value = true

    // Clear previous logs and statuses
    executionStore.clearLogs()
    executionStore.clearNodeStatuses()

    // Start execution
    const execution = await executionsApi.execute({
      workflowId: workflowStore.currentWorkflow.id,
      inputData,
    })

    // Set current execution
    executionStore.setCurrentExecution(execution)

    // Emit event for parent to handle WebSocket subscription
    emit('execution-started', execution.id)
  } catch (err: any) {
    error.value = err.message || 'Failed to start execution'
  } finally {
    isExecuting.value = false
  }
}

async function handleStop() {
  if (!currentExecution.value) return

  try {
    isStopping.value = true
    error.value = ''
    await executionsApi.stop(currentExecution.value.id)
  } catch (err: any) {
    error.value = err.message || 'Failed to stop execution'
  } finally {
    isStopping.value = false
  }
}

function useEmptyTemplate() {
  inputDataText.value = '{\n  \n}'
}

function useTextTemplate() {
  inputDataText.value = '{\n  "text": "Enter your text here"\n}'
}

function useArrayTemplate() {
  inputDataText.value = '{\n  "items": [\n    "item1",\n    "item2"\n  ]\n}'
}

function getStatusClass(status: string) {
  const classes = {
    pending: 'bg-yellow-100 text-yellow-800',
    running: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    stopped: 'bg-gray-100 text-gray-800',
  }
  return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800'
}

function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString()
}

const emit = defineEmits<{
  'execution-started': [executionId: string]
}>()
</script>
