import { ref, watch } from 'vue'
import { useWebSocket } from './useWebSocket'
import { useExecutionStore } from '@/stores/execution'
import type { Execution, ExecutionLog } from '@/stores/execution'

export interface ExecutionStatusEvent {
  executionId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  timestamp?: string
}

export interface ExecutionLogEvent {
  executionId: string
  log: ExecutionLog
}

export interface ExecutionResultEvent {
  executionId: string
  result: any
}

export interface ExecutionErrorEvent {
  executionId: string
  error: string
}

export interface NodeStatusEvent {
  executionId: string
  nodeId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  output?: any
}

export function useExecutionWebSocket() {
  const { connect, disconnect, emit, on, off, isConnected, isReconnecting } =
    useWebSocket('/executions')
  const executionStore = useExecutionStore()
  const subscribedExecutions = ref<Set<string>>(new Set())

  function initialize() {
    connect()

    // Listen for execution status updates
    on('status', (data: ExecutionStatusEvent) => {
      console.log('Execution status update:', data)

      if (executionStore.currentExecution?.id === data.executionId) {
        executionStore.currentExecution.status = data.status
      }

      // Update in history if exists
      const historyItem = executionStore.executionHistory.find((e) => e.id === data.executionId)
      if (historyItem) {
        historyItem.status = data.status
      }
    })

    // Listen for execution logs
    on('log', (data: ExecutionLogEvent) => {
      console.log('Execution log:', data)
      executionStore.addLog(data.log)
    })

    // Listen for execution results
    on('result', (data: ExecutionResultEvent) => {
      console.log('Execution result:', data)

      if (executionStore.currentExecution?.id === data.executionId) {
        executionStore.currentExecution.outputData = data.result
        executionStore.currentExecution.status = 'completed'
        executionStore.currentExecution.completedAt = new Date()
      }
    })

    // Listen for execution errors
    on('error', (data: ExecutionErrorEvent) => {
      console.error('Execution error:', data)

      if (executionStore.currentExecution?.id === data.executionId) {
        executionStore.currentExecution.errorMessage = data.error
        executionStore.currentExecution.status = 'failed'
        executionStore.currentExecution.completedAt = new Date()
      }
    })

    // Listen for node status updates
    on('nodeStatus', (data: NodeStatusEvent) => {
      console.log('Node status update:', data)
      executionStore.updateNodeStatus(data.nodeId, data.status)
    })

    // Handle reconnection - resubscribe to executions
    on('connect', () => {
      console.log('Reconnected, resubscribing to executions')
      subscribedExecutions.value.forEach((executionId) => {
        emit('subscribe', executionId)
      })
    })
  }

  function subscribeToExecution(executionId: string) {
    if (!isConnected.value) {
      console.warn('Cannot subscribe: WebSocket not connected')
      return
    }

    emit('subscribe', executionId)
    subscribedExecutions.value.add(executionId)
    console.log('Subscribed to execution:', executionId)
  }

  function unsubscribeFromExecution(executionId: string) {
    if (!isConnected.value) {
      return
    }

    emit('unsubscribe', executionId)
    subscribedExecutions.value.delete(executionId)
    console.log('Unsubscribed from execution:', executionId)
  }

  function cleanup() {
    // Unsubscribe from all executions
    subscribedExecutions.value.forEach((executionId) => {
      unsubscribeFromExecution(executionId)
    })
    subscribedExecutions.value.clear()

    // Remove all event listeners
    off('status')
    off('log')
    off('result')
    off('error')
    off('nodeStatus')
    off('connect')

    disconnect()
  }

  return {
    isConnected,
    isReconnecting,
    subscribedExecutions,
    initialize,
    subscribeToExecution,
    unsubscribeFromExecution,
    cleanup,
  }
}
