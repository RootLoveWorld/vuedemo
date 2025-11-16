<script setup lang="ts">
import { ref } from 'vue'
import { VueFlow, useVueFlow, Panel } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge, Connection } from '@vue-flow/core'

// Import custom node components
import InputNode from '@/components/nodes/InputNode.vue'
import LLMNode from '@/components/nodes/LLMNode.vue'
import ConditionNode from '@/components/nodes/ConditionNode.vue'
import TransformNode from '@/components/nodes/TransformNode.vue'
import OutputNode from '@/components/nodes/OutputNode.vue'
import { markRaw } from 'vue'

// Register custom node types
const nodeTypes = {
  input: markRaw(InputNode) as any,
  llm: markRaw(LLMNode) as any,
  condition: markRaw(ConditionNode) as any,
  transform: markRaw(TransformNode) as any,
  output: markRaw(OutputNode) as any,
}

// Props
interface Props {
  modelValue?: {
    nodes: Node[]
    edges: Edge[]
  }
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({ nodes: [], edges: [] }),
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: { nodes: Node[]; edges: Edge[] }]
  'node-click': [node: Node]
  'edge-click': [edge: Edge]
  'pane-click': []
}>()

// Local state
const nodes = ref<Node[]>(props.modelValue.nodes)
const edges = ref<Edge[]>(props.modelValue.edges)

// Vue Flow instance
const { onConnect, onNodesChange, onEdgesChange, fitView } = useVueFlow()

// Handle node changes
onNodesChange((changes) => {
  // Apply changes to nodes
  changes.forEach((change) => {
    if (change.type === 'position' && change.position) {
      const node = nodes.value.find((n) => n.id === change.id)
      if (node) {
        node.position = change.position
      }
    } else if (change.type === 'remove') {
      nodes.value = nodes.value.filter((n) => n.id !== change.id)
    }
  })
  emitUpdate()
})

// Handle edge changes
onEdgesChange((changes) => {
  changes.forEach((change) => {
    if (change.type === 'remove') {
      edges.value = edges.value.filter((e) => e.id !== change.id)
    }
  })
  emitUpdate()
})

// Handle new connections
onConnect((connection: Connection) => {
  const newEdge: Edge = {
    id: `e${connection.source}-${connection.target}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle || undefined,
    targetHandle: connection.targetHandle || undefined,
  }
  edges.value.push(newEdge)
  emitUpdate()
})

// Emit updates
const emitUpdate = () => {
  emit('update:modelValue', {
    nodes: nodes.value,
    edges: edges.value,
  })
}

// Handle node click
const handleNodeClick = (event: any) => {
  emit('node-click', event.node)
}

// Handle edge click
const handleEdgeClick = (event: any) => {
  emit('edge-click', event.edge)
}

// Handle pane click
const handlePaneClick = () => {
  emit('pane-click')
}

// Handle drop event
const onDrop = (event: any) => {
  // eslint-disable-next-line no-undef
  const dragEvent = event as DragEvent
  dragEvent.preventDefault()

  if (!dragEvent.dataTransfer) return

  const data = dragEvent.dataTransfer.getData('application/vueflow')
  if (!data) return

  const nodeData = JSON.parse(data)

  // Get the canvas position
  // eslint-disable-next-line no-undef
  const canvas = dragEvent.currentTarget as HTMLElement
  const rect = canvas.getBoundingClientRect()

  // Calculate position relative to canvas
  const x = dragEvent.clientX - rect.left
  const y = dragEvent.clientY - rect.top

  // Create new node
  const newNode: Node = {
    id: `${nodeData.type}-${Date.now()}`,
    type: nodeData.type,
    position: { x, y },
    data: {
      label: nodeData.label,
      config: {},
    },
  }

  nodes.value.push(newNode)
  emitUpdate()
}

const onDragOver = (event: any) => {
  // eslint-disable-next-line no-undef
  const dragEvent = event as DragEvent
  dragEvent.preventDefault()
  if (dragEvent.dataTransfer) {
    dragEvent.dataTransfer.dropEffect = 'move'
  }
}

// Expose methods
defineExpose({
  fitView,
  addNode: (node: Node) => {
    nodes.value.push(node)
    emitUpdate()
  },
  removeNode: (nodeId: string) => {
    nodes.value = nodes.value.filter((n) => n.id !== nodeId)
    edges.value = edges.value.filter((e) => e.source !== nodeId && e.target !== nodeId)
    emitUpdate()
  },
  updateNode: (nodeId: string, updates: Partial<Node>) => {
    const node = nodes.value.find((n) => n.id === nodeId)
    if (node) {
      Object.assign(node, updates)
      emitUpdate()
    }
  },
})
</script>

<template>
  <div class="flow-canvas">
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :node-types="nodeTypes"
      :default-zoom="1"
      :min-zoom="0.2"
      :max-zoom="4"
      :snap-to-grid="true"
      :snap-grid="[15, 15]"
      @node-click="handleNodeClick"
      @edge-click="handleEdgeClick"
      @pane-click="handlePaneClick"
      @drop="onDrop"
      @dragover="onDragOver"
    >
      <Background pattern-color="#aaa" :gap="16" />
      <Controls />
      <MiniMap />

      <Panel position="top-left" class="flow-panel">
        <slot name="toolbar" />
      </Panel>

      <Panel position="top-right" class="flow-panel">
        <slot name="actions" />
      </Panel>
    </VueFlow>
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';

.flow-canvas {
  width: 100%;
  height: 100%;
  position: relative;
}

.vue-flow {
  background-color: #f8f9fa;
}

.flow-panel {
  background: white;
  padding: 0.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}

/* Custom node styles */
.vue-flow__node {
  border-radius: 0.5rem;
  border: 2px solid #e5e7eb;
  background: white;
  padding: 0.75rem;
  font-size: 0.875rem;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition: all 0.2s;
}

.vue-flow__node:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.vue-flow__node.selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Custom edge styles */
.vue-flow__edge-path {
  stroke: #9ca3af;
  stroke-width: 2;
}

.vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #3b82f6;
  stroke-width: 3;
}

/* Handle styles */
.vue-flow__handle {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3b82f6;
  border: 2px solid white;
}

.vue-flow__handle:hover {
  width: 14px;
  height: 14px;
}
</style>
