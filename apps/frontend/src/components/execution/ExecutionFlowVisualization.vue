<template>
  <div class="execution-flow-visualization">
    <div class="mb-4">
      <h4 class="text-sm font-semibold mb-2">Workflow Execution Flow</h4>
      <p class="text-xs text-gray-600">Visual representation of node execution status</p>
    </div>

    <div v-if="!workflow || workflow.nodes.length === 0" class="text-center py-8 text-gray-500">
      No workflow data available
    </div>

    <div v-else class="relative border rounded-lg p-4 bg-gray-50 min-h-[300px]">
      <!-- Simple node visualization -->
      <div class="space-y-3">
        <div
          v-for="node in workflow.nodes"
          :key="node.id"
          class="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm transition-all"
          :class="getNodeBorderClass(getNodeStatus(node.id))"
        >
          <!-- Status indicator -->
          <div class="flex-shrink-0">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center"
              :class="getNodeStatusBgClass(getNodeStatus(node.id))"
            >
              <component :is="getNodeStatusIcon(getNodeStatus(node.id))" class="w-5 h-5" />
            </div>
          </div>

          <!-- Node info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-medium text-sm truncate">{{ node.data.label }}</span>
              <span
                class="px-2 py-0.5 rounded-full text-xs font-medium"
                :class="getStatusClass(getNodeStatus(node.id))"
              >
                {{ getNodeStatus(node.id) }}
              </span>
            </div>
            <div class="text-xs text-gray-500">
              <span class="font-mono">{{ node.id }}</span>
              <span class="mx-1">•</span>
              <span>{{ node.type }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Connection indicators -->
      <div v-if="workflow.edges.length > 0" class="mt-4 pt-4 border-t">
        <div class="text-xs text-gray-600 mb-2">Connections:</div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="edge in workflow.edges"
            :key="edge.id"
            class="px-2 py-1 bg-white border rounded text-xs"
          >
            <span class="font-mono">{{ edge.source }}</span>
            <span class="mx-1">→</span>
            <span class="font-mono">{{ edge.target }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useExecutionStore } from '@/stores/execution'
import { useWorkflowStore } from '@/stores/workflow'

const executionStore = useExecutionStore()
const workflowStore = useWorkflowStore()

const workflow = computed(() => {
  if (!workflowStore.currentWorkflow?.definition) return null
  return workflowStore.currentWorkflow.definition
})

function getNodeStatus(nodeId: string): string {
  return executionStore.realTimeStatus.get(nodeId) || 'pending'
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

function getNodeBorderClass(status: string): string {
  switch (status) {
    case 'running':
      return 'border-l-4 border-l-blue-500 shadow-md'
    case 'completed':
      return 'border-l-4 border-l-green-500'
    case 'failed':
      return 'border-l-4 border-l-red-500 shadow-md'
    default:
      return 'border-l-4 border-l-gray-300'
  }
}

function getNodeStatusBgClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-gray-100 text-gray-600'
    case 'running':
      return 'bg-blue-100 text-blue-600'
    case 'completed':
      return 'bg-green-100 text-green-600'
    case 'failed':
      return 'bg-red-100 text-red-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function getNodeStatusIcon(status: string) {
  // Return SVG component based on status
  const icons = {
    pending: 'svg',
    running: 'svg',
    completed: 'svg',
    failed: 'svg',
  }
  return icons[status as keyof typeof icons] || 'svg'
}
</script>

<style scoped>
/* Add any additional styles if needed */
</style>
