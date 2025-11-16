<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkflowStore } from '@/stores/workflow'
import { workflowsApi } from '@/api/workflows'
import FlowCanvas from '@/components/flow/FlowCanvas.vue'
import NodePalette from '@/components/flow/NodePalette.vue'
import PropertyPanel from '@/components/flow/PropertyPanel.vue'
import Toolbar from '@/components/flow/Toolbar.vue'
import VersionHistory from '@/components/workflow/VersionHistory.vue'
import ExecutionTrigger from '@/components/execution/ExecutionTrigger.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Dialog from '@/components/ui/Dialog.vue'
import DialogContent from '@/components/ui/DialogContent.vue'
import DialogHeader from '@/components/ui/DialogHeader.vue'
import DialogTitle from '@/components/ui/DialogTitle.vue'
import DialogFooter from '@/components/ui/DialogFooter.vue'
import Label from '@/components/ui/Label.vue'
import { Save, Loader2, History, Play, ChevronRight, ChevronLeft } from 'lucide-vue-next'
import type { Node, Edge } from '@vue-flow/core'
import type { CreateWorkflowDto, UpdateWorkflowDto } from '@workflow/shared-types'
import { useExecutionWebSocket } from '@/composables/useExecutionWebSocket'

const route = useRoute()
const router = useRouter()
const workflowStore = useWorkflowStore()

// Workflow state
const workflow = ref<{ nodes: Node[]; edges: Edge[] }>({
  nodes: [],
  edges: [],
})

const workflowId = ref<string | null>(null)
const workflowName = ref('')
const workflowDescription = ref('')
const workflowVersion = ref(1)
const isLoading = ref(false)
const isSaving = ref(false)
const showSaveDialog = ref(false)
const showVersionHistory = ref(false)
const showExecutionPanel = ref(false)

// History for undo/redo
const history = ref<Array<{ nodes: Node[]; edges: Edge[] }>>([])
const historyIndex = ref(-1)

// Selected node for property panel
const selectedNode = ref<Node | null>(null)

// Canvas ref
const canvasRef = ref<InstanceType<typeof FlowCanvas> | null>(null)

// WebSocket for execution updates
const { initialize, subscribeToExecution, cleanup } = useExecutionWebSocket()

// Computed properties for undo/redo
const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)

// Check if workflow has unsaved changes
const hasUnsavedChanges = computed(() => {
  return workflowStore.hasUnsavedChanges
})

// Check if this is a new workflow
const isNewWorkflow = computed(() => route.params.id === 'new')

// Save current state to history
const saveToHistory = () => {
  // Remove any future states if we're not at the end
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }

  // Add current state
  history.value.push({
    nodes: JSON.parse(JSON.stringify(workflow.value.nodes)),
    edges: JSON.parse(JSON.stringify(workflow.value.edges)),
  })

  historyIndex.value = history.value.length - 1

  // Limit history to 50 states
  if (history.value.length > 50) {
    history.value.shift()
    historyIndex.value--
  }
}

// Handle node click
const handleNodeClick = (node: Node) => {
  selectedNode.value = node
}

// Handle edge click
const handleEdgeClick = (edge: Edge) => {
  edge
  selectedNode.value = null
}

// Handle pane click
const handlePaneClick = () => {
  selectedNode.value = null
}

// Handle node update from property panel
const handleNodeUpdate = (updatedNode: Node) => {
  if (canvasRef.value) {
    canvasRef.value.updateNode(updatedNode.id, updatedNode)
    saveToHistory()
  }
}

// Handle property panel close
const handlePanelClose = () => {
  selectedNode.value = null
}

// Load workflow from API
async function loadWorkflow(id: string) {
  isLoading.value = true
  try {
    const data = await workflowsApi.getById(id)
    workflowStore.setCurrentWorkflow(data)
    workflowId.value = data.id
    workflowName.value = data.name
    workflowDescription.value = data.description || ''
    workflowVersion.value = data.version

    if (data.definition) {
      workflow.value = {
        nodes: data.definition.nodes || [],
        edges: data.definition.edges || [],
      }
      saveToHistory()
    }
  } catch (error: any) {
    window.alert('加载工作流失败: ' + (error.message || '未知错误'))
    router.push('/workflows')
  } finally {
    isLoading.value = false
  }
}

// Save workflow to API
async function saveWorkflow() {
  if (!workflowName.value.trim()) {
    window.alert('请输入工作流名称')
    return
  }

  isSaving.value = true
  try {
    const definition = {
      nodes: workflow.value.nodes,
      edges: workflow.value.edges,
    }

    if (isNewWorkflow.value || !workflowId.value) {
      // Create new workflow
      const dto: CreateWorkflowDto = {
        name: workflowName.value,
        description: workflowDescription.value,
        definition: definition as any,
      }
      const created = await workflowsApi.create(dto)
      workflowId.value = created.id
      workflowStore.setCurrentWorkflow(created)

      // Navigate to the edit page
      router.replace(`/workflows/${created.id}`)
      showSaveDialog.value = false
    } else {
      // Update existing workflow
      const dto: UpdateWorkflowDto = {
        name: workflowName.value,
        description: workflowDescription.value,
        definition: definition as any,
      }
      const updated = await workflowsApi.update(workflowId.value, dto)
      workflowStore.setCurrentWorkflow(updated)
      showSaveDialog.value = false
    }
  } catch (error: any) {
    window.alert('保存工作流失败: ' + (error.message || '未知错误'))
  } finally {
    isSaving.value = false
  }
}

// Toolbar actions
const handleSave = () => {
  showSaveDialog.value = true
}

const handleLoad = () => {
  // eslint-disable-next-line no-undef
  const input = window.document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json'
  input.onchange = (e: any) => {
    const file = e.target.files[0]
    if (file) {
      // eslint-disable-next-line no-undef
      const reader = new window.FileReader()
      reader.onload = (event: any) => {
        try {
          const data = JSON.parse(event.target.result)
          workflow.value = data
          saveToHistory()
        } catch {
          window.alert('Invalid workflow file')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

const handleUndo = () => {
  if (canUndo.value) {
    historyIndex.value--
    workflow.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]))
  }
}

const handleRedo = () => {
  if (canRedo.value) {
    historyIndex.value++
    workflow.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]))
  }
}

const handleZoomIn = () => {
  // Zoom functionality will be handled by Vue Flow
}

const handleZoomOut = () => {
  // Zoom functionality will be handled by Vue Flow
}

const handleFitView = () => {
  if (canvasRef.value) {
    canvasRef.value.fitView()
  }
}

const handleShowVersionHistory = () => {
  showVersionHistory.value = true
}

const handleVersionHistoryClose = () => {
  showVersionHistory.value = false
}

const handleVersionRollback = async () => {
  // Reload the workflow after rollback
  if (workflowId.value) {
    await loadWorkflow(workflowId.value)
  }
  showVersionHistory.value = false
}

const toggleExecutionPanel = () => {
  showExecutionPanel.value = !showExecutionPanel.value
}

const handleExecutionStarted = (executionId: string) => {
  // Subscribe to execution updates via WebSocket
  subscribeToExecution(executionId)
}

// Initialize
onMounted(() => {
  const id = route.params.id as string
  if (id && id !== 'new') {
    loadWorkflow(id)
  } else {
    // New workflow
    workflowName.value = '新工作流'
    saveToHistory()
  }

  // Initialize WebSocket connection
  initialize()
})

// Cleanup on unmount
import { onUnmounted } from 'vue'
onUnmounted(() => {
  cleanup()
})

// Watch for changes to mark as unsaved
watch(
  () => workflow.value,
  () => {
    // Mark as having unsaved changes
  },
  { deep: true }
)
</script>

<template>
  <div class="h-screen flex flex-col">
    <!-- Header -->
    <div class="border-b p-4 bg-white flex items-center justify-between">
      <div class="flex items-center gap-4">
        <Button variant="ghost" @click="router.push('/workflows')"> ← 返回 </Button>
        <div>
          <h1 class="text-2xl font-bold">{{ workflowName || '工作流编辑器' }}</h1>
          <p v-if="workflowDescription" class="text-sm text-muted-foreground">
            {{ workflowDescription }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="hasUnsavedChanges" class="text-sm text-muted-foreground"> 未保存的更改 </span>
        <Button
          v-if="!isNewWorkflow && workflowId"
          variant="outline"
          @click="handleShowVersionHistory"
        >
          <History class="w-4 h-4 mr-2" />
          版本历史
        </Button>
        <Button
          variant="outline"
          :class="showExecutionPanel ? 'bg-primary/10' : ''"
          @click="toggleExecutionPanel"
        >
          <Play class="w-4 h-4 mr-2" />
          执行
        </Button>
        <Button :disabled="isSaving" @click="handleSave">
          <Loader2 v-if="isSaving" class="w-4 h-4 mr-2 animate-spin" />
          <Save v-else class="w-4 h-4 mr-2" />
          保存
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <Loader2 class="w-8 h-8 animate-spin text-primary" />
    </div>

    <!-- Editor -->
    <div v-else class="flex-1 flex overflow-hidden">
      <NodePalette />
      <div class="flex-1 relative">
        <FlowCanvas
          ref="canvasRef"
          v-model="workflow"
          @node-click="handleNodeClick"
          @edge-click="handleEdgeClick"
          @pane-click="handlePaneClick"
        >
          <template #toolbar>
            <Toolbar
              :can-undo="canUndo"
              :can-redo="canRedo"
              @save="handleSave"
              @load="handleLoad"
              @undo="handleUndo"
              @redo="handleRedo"
              @zoom-in="handleZoomIn"
              @zoom-out="handleZoomOut"
              @fit-view="handleFitView"
            />
          </template>
        </FlowCanvas>
      </div>
      <PropertyPanel
        :selected-node="selectedNode"
        @update:node="handleNodeUpdate"
        @close="handlePanelClose"
      />

      <!-- Execution Panel -->
      <div
        v-if="showExecutionPanel"
        class="w-96 border-l bg-white overflow-y-auto transition-all duration-300"
      >
        <div class="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
          <h2 class="text-lg font-semibold">执行工作流</h2>
          <Button variant="ghost" size="sm" @click="toggleExecutionPanel">
            <ChevronRight class="w-4 h-4" />
          </Button>
        </div>
        <div class="p-4">
          <ExecutionTrigger @execution-started="handleExecutionStarted" />
        </div>
      </div>

      <!-- Execution Panel Toggle (when closed) -->
      <Button
        v-else
        variant="outline"
        size="sm"
        class="absolute right-4 top-4 z-10"
        @click="toggleExecutionPanel"
      >
        <ChevronLeft class="w-4 h-4 mr-1" />
        执行
      </Button>

      <VersionHistory
        v-if="showVersionHistory && workflowId"
        :workflow-id="workflowId"
        :current-version="workflowVersion"
        :current-definition="workflow"
        @close="handleVersionHistoryClose"
        @rollback="handleVersionRollback"
      />
    </div>

    <!-- Save Dialog -->
    <Dialog v-model:open="showSaveDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ isNewWorkflow ? '创建工作流' : '保存工作流' }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 p-6">
          <div>
            <Label for="name">名称 *</Label>
            <Input id="name" v-model="workflowName" placeholder="输入工作流名称" class="mt-2" />
          </div>
          <div>
            <Label for="description">描述</Label>
            <Input
              id="description"
              v-model="workflowDescription"
              placeholder="输入工作流描述（可选）"
              class="mt-2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" :disabled="isSaving" @click="showSaveDialog = false">
            取消
          </Button>
          <Button :disabled="isSaving || !workflowName.trim()" @click="saveWorkflow">
            <Loader2 v-if="isSaving" class="w-4 h-4 mr-2 animate-spin" />
            {{ isNewWorkflow ? '创建' : '保存' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
