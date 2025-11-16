import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Execution {
  id: string
  workflowId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  inputData?: any
  outputData?: any
  errorMessage?: string
  startedAt?: Date
  completedAt?: Date
  createdAt: Date
}

export interface ExecutionLog {
  id: string
  executionId: string
  nodeId?: string
  level: 'info' | 'warning' | 'error'
  message: string
  metadata?: any
  createdAt: Date
}

export const useExecutionStore = defineStore('execution', () => {
  const currentExecution = ref<Execution | null>(null)
  const executionHistory = ref<Execution[]>([])
  const logs = ref<ExecutionLog[]>([])
  const realTimeStatus = ref<Map<string, string>>(new Map())

  function setCurrentExecution(execution: Execution | null) {
    currentExecution.value = execution
  }

  function setExecutionHistory(history: Execution[]) {
    executionHistory.value = history
  }

  function addLog(log: ExecutionLog) {
    logs.value.push(log)
  }

  function clearLogs() {
    logs.value = []
  }

  function updateNodeStatus(nodeId: string, status: string) {
    realTimeStatus.value.set(nodeId, status)
  }

  function clearNodeStatuses() {
    realTimeStatus.value.clear()
  }

  function updateExecutionStatus(
    executionId: string,
    status: 'pending' | 'running' | 'completed' | 'failed'
  ) {
    if (currentExecution.value?.id === executionId) {
      currentExecution.value.status = status
    }

    const historyItem = executionHistory.value.find((e) => e.id === executionId)
    if (historyItem) {
      historyItem.status = status
    }
  }

  function setExecutionResult(executionId: string, result: any) {
    if (currentExecution.value?.id === executionId) {
      currentExecution.value.outputData = result
      currentExecution.value.status = 'completed'
      currentExecution.value.completedAt = new Date()
    }
  }

  function setExecutionError(executionId: string, error: string) {
    if (currentExecution.value?.id === executionId) {
      currentExecution.value.errorMessage = error
      currentExecution.value.status = 'failed'
      currentExecution.value.completedAt = new Date()
    }
  }

  return {
    currentExecution,
    executionHistory,
    logs,
    realTimeStatus,
    setCurrentExecution,
    setExecutionHistory,
    addLog,
    clearLogs,
    updateNodeStatus,
    clearNodeStatuses,
    updateExecutionStatus,
    setExecutionResult,
    setExecutionError,
  }
})
