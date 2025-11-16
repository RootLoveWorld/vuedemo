import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Workflow, WorkflowDefinition } from '@workflow/shared-types'

export const useWorkflowStore = defineStore('workflow', () => {
  const currentWorkflow = ref<Workflow | null>(null)
  const workflows = ref<Workflow[]>([])
  const nodes = ref<any[]>([])
  const edges = ref<any[]>([])
  const selectedNode = ref<any | null>(null)
  const isExecuting = ref(false)

  const hasUnsavedChanges = computed(() => {
    // TODO: Implement change detection
    return false
  })

  function setCurrentWorkflow(workflow: Workflow | null) {
    currentWorkflow.value = workflow
    if (workflow && workflow.definition) {
      nodes.value = workflow.definition.nodes || []
      edges.value = workflow.definition.edges || []
    }
  }

  function setWorkflows(list: Workflow[]) {
    workflows.value = list
  }

  function addNode(node: any) {
    nodes.value.push(node)
  }

  function removeNode(nodeId: string) {
    nodes.value = nodes.value.filter((n) => n.id !== nodeId)
    edges.value = edges.value.filter((e) => e.source !== nodeId && e.target !== nodeId)
  }

  function updateNode(nodeId: string, data: any) {
    const node = nodes.value.find((n) => n.id === nodeId)
    if (node) {
      Object.assign(node, data)
    }
  }

  function addEdge(edge: any) {
    edges.value.push(edge)
  }

  function removeEdge(edgeId: string) {
    edges.value = edges.value.filter((e) => e.id !== edgeId)
  }

  function selectNode(node: any | null) {
    selectedNode.value = node
  }

  function clearWorkflow() {
    currentWorkflow.value = null
    nodes.value = []
    edges.value = []
    selectedNode.value = null
  }

  return {
    currentWorkflow,
    workflows,
    nodes,
    edges,
    selectedNode,
    isExecuting,
    hasUnsavedChanges,
    setCurrentWorkflow,
    setWorkflows,
    addNode,
    removeNode,
    updateNode,
    addEdge,
    removeEdge,
    selectNode,
    clearWorkflow,
  }
})
