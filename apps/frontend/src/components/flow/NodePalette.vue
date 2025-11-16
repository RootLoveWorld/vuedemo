<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Download, Brain, GitBranch, Shuffle, Upload, Repeat, Merge, Puzzle } from 'lucide-vue-next'
import { usePluginManager } from '@/composables/usePluginManager'

// Node type definitions
interface NodeType {
  type: string
  label: string
  icon: any
  category: string
  description: string
  color: string
  isPlugin?: boolean
}

const pluginManager = usePluginManager()

const builtInNodeTypes: NodeType[] = [
  {
    type: 'input',
    label: 'Input',
    icon: Download,
    category: 'basic',
    description: 'Receive external input data',
    color: 'bg-blue-500',
  },
  {
    type: 'llm',
    label: 'LLM',
    icon: Brain,
    category: 'ai',
    description: 'Call large language model',
    color: 'bg-purple-500',
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: GitBranch,
    category: 'logic',
    description: 'Conditional branching',
    color: 'bg-yellow-500',
  },
  {
    type: 'transform',
    label: 'Transform',
    icon: Shuffle,
    category: 'data',
    description: 'Transform data',
    color: 'bg-green-500',
  },
  {
    type: 'output',
    label: 'Output',
    icon: Upload,
    category: 'basic',
    description: 'Output result',
    color: 'bg-blue-500',
  },
  {
    type: 'loop',
    label: 'Loop',
    icon: Repeat,
    category: 'logic',
    description: 'Loop processing',
    color: 'bg-orange-500',
  },
  {
    type: 'merge',
    label: 'Merge',
    icon: Merge,
    category: 'data',
    description: 'Merge multiple inputs',
    color: 'bg-teal-500',
  },
]

// Combine built-in and plugin nodes
const nodeTypes = computed(() => {
  const customNodes = pluginManager.getCustomNodeTypes().map((customNode) => ({
    type: customNode.type,
    label: customNode.name,
    icon: Puzzle, // Default icon for plugins
    category: customNode.category,
    description: customNode.defaultConfig?.description || 'Custom plugin node',
    color: 'bg-indigo-500',
    isPlugin: true,
  }))

  return [...builtInNodeTypes, ...customNodes]
})

// Categories - dynamically include plugin categories
const categories = computed(() => {
  const baseCategories = [
    { id: 'all', label: 'All Nodes' },
    { id: 'basic', label: 'Basic' },
    { id: 'ai', label: 'AI' },
    { id: 'logic', label: 'Logic' },
    { id: 'data', label: 'Data' },
  ]

  // Add plugin categories
  const pluginCategories = new Set(pluginManager.getCustomNodeTypes().map((node) => node.category))

  pluginCategories.forEach((category) => {
    if (!baseCategories.some((c) => c.id === category)) {
      baseCategories.push({
        id: category,
        label: category.charAt(0).toUpperCase() + category.slice(1),
      })
    }
  })

  return baseCategories
})

const selectedCategory = ref('all')

// Filter nodes by category
const filteredNodes = computed(() => {
  if (selectedCategory.value === 'all') {
    return nodeTypes.value
  }
  return nodeTypes.value.filter((node) => node.category === selectedCategory.value)
})

onMounted(() => {
  // Ensure plugins are loaded
  if (!pluginManager.isInitialized.value && !pluginManager.isLoading.value) {
    pluginManager.initialize().catch((error) => {
      console.error('Failed to initialize plugins in NodePalette:', error)
    })
  }
})

// Drag start handler
const onDragStart = (event: any, nodeType: NodeType) => {
  // eslint-disable-next-line no-undef
  const dragEvent = event as DragEvent
  if (!dragEvent.dataTransfer) return

  dragEvent.dataTransfer.effectAllowed = 'move'
  dragEvent.dataTransfer.setData(
    'application/vueflow',
    JSON.stringify({
      type: nodeType.type,
      label: nodeType.label,
    })
  )
}
</script>

<template>
  <div class="node-palette">
    <div class="palette-header">
      <h3 class="text-sm font-semibold text-gray-900">Node Palette</h3>
      <p class="text-xs text-gray-500 mt-1">Drag nodes to canvas</p>
    </div>

    <!-- Category tabs -->
    <div class="category-tabs">
      <button
        v-for="category in categories"
        :key="category.id"
        :class="['category-tab', selectedCategory === category.id && 'active']"
        @click="selectedCategory = category.id"
      >
        {{ category.label }}
      </button>
    </div>

    <!-- Node list -->
    <div class="node-list">
      <div
        v-for="node in filteredNodes"
        :key="node.type"
        class="node-item"
        draggable="true"
        @dragstart="onDragStart($event, node)"
      >
        <div class="node-item-icon" :class="node.color">
          <component :is="node.icon" :size="20" class="text-white" />
        </div>
        <div class="node-item-content">
          <div class="node-item-label">
            {{ node.label }}
            <span v-if="node.isPlugin" class="plugin-badge">Plugin</span>
          </div>
          <div class="node-item-description">{{ node.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.node-palette {
  width: 280px;
  height: 100%;
  background: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.palette-header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.category-tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
  flex-shrink: 0;
}

.category-tab {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.category-tab:hover {
  background: #f3f4f6;
  color: #374151;
}

.category-tab.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.node-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: grab;
  transition: all 0.2s;
}

.node-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.node-item:active {
  cursor: grabbing;
}

.node-item-icon {
  width: 40px;
  height: 40px;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.node-item-content {
  flex: 1;
  min-width: 0;
}

.node-item-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.125rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.plugin-badge {
  font-size: 0.625rem;
  font-weight: 500;
  padding: 0.125rem 0.375rem;
  background: #818cf8;
  color: white;
  border-radius: 0.25rem;
}

.node-item-description {
  font-size: 0.75rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Scrollbar styling */
.node-list::-webkit-scrollbar {
  width: 6px;
}

.node-list::-webkit-scrollbar-track {
  background: #f3f4f6;
}

.node-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.node-list::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
