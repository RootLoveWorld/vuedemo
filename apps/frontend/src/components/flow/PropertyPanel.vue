<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Node } from '@vue-flow/core'
import { X } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'

interface Props {
  selectedNode: Node | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:node': [node: Node]
  close: []
}>()

// Local state for form data
const formData = ref<Record<string, any>>({})

// Watch for selected node changes
watch(
  () => props.selectedNode,
  (node) => {
    if (node) {
      formData.value = {
        label: node.data.label || '',
        ...(node.data.config || {}),
      }
    } else {
      formData.value = {}
    }
  },
  { immediate: true }
)

// Get form fields based on node type
const formFields = computed(() => {
  if (!props.selectedNode) return []

  const nodeType = props.selectedNode.type

  switch (nodeType) {
    case 'input':
      return [
        { name: 'label', label: 'Label', type: 'text', required: true },
        {
          name: 'inputType',
          label: 'Input Type',
          type: 'select',
          options: ['text', 'number', 'json'],
        },
        { name: 'defaultValue', label: 'Default Value', type: 'text' },
      ]
    case 'llm':
      return [
        { name: 'label', label: 'Label', type: 'text', required: true },
        {
          name: 'model',
          label: 'Model',
          type: 'select',
          options: ['llama2', 'mistral', 'codellama'],
        },
        { name: 'temperature', label: 'Temperature', type: 'number', min: 0, max: 2, step: 0.1 },
        { name: 'maxTokens', label: 'Max Tokens', type: 'number', min: 1, max: 4096 },
        { name: 'prompt', label: 'Prompt Template', type: 'textarea' },
      ]
    case 'condition':
      return [
        { name: 'label', label: 'Label', type: 'text', required: true },
        { name: 'condition', label: 'Condition', type: 'text', required: true },
        {
          name: 'operator',
          label: 'Operator',
          type: 'select',
          options: ['==', '!=', '>', '<', '>=', '<=', 'contains'],
        },
      ]
    case 'transform':
      return [
        { name: 'label', label: 'Label', type: 'text', required: true },
        {
          name: 'transformType',
          label: 'Transform Type',
          type: 'select',
          options: ['map', 'filter', 'reduce', 'custom'],
        },
        { name: 'expression', label: 'Expression', type: 'textarea', required: true },
      ]
    case 'output':
      return [
        { name: 'label', label: 'Label', type: 'text', required: true },
        {
          name: 'outputFormat',
          label: 'Output Format',
          type: 'select',
          options: ['json', 'text', 'xml'],
        },
        { name: 'destination', label: 'Destination', type: 'text' },
      ]
    default:
      return [{ name: 'label', label: 'Label', type: 'text', required: true }]
  }
})

// Handle form submission
const handleSave = () => {
  if (!props.selectedNode) return

  const { label, ...config } = formData.value

  const updatedNode: Node = {
    ...props.selectedNode,
    data: {
      ...props.selectedNode.data,
      label,
      config,
    },
  }

  emit('update:node', updatedNode)
}

// Handle close
const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div v-if="selectedNode" class="property-panel">
    <div class="panel-header">
      <div>
        <h3 class="panel-title">Node Properties</h3>
        <p class="panel-subtitle">{{ selectedNode.type }} node</p>
      </div>
      <button class="close-button" @click="handleClose">
        <X :size="20" />
      </button>
    </div>

    <div class="panel-content">
      <form @submit.prevent="handleSave">
        <div v-for="field in formFields" :key="field.name" class="form-field">
          <Label :for="field.name">
            {{ field.label }}
            <span v-if="field.required" class="text-red-500">*</span>
          </Label>

          <!-- Text input -->
          <Input
            v-if="field.type === 'text'"
            :id="field.name"
            v-model="formData[field.name]"
            type="text"
            :required="field.required"
          />

          <!-- Number input -->
          <Input
            v-else-if="field.type === 'number'"
            :id="field.name"
            v-model.number="formData[field.name]"
            type="number"
            :min="field.min"
            :max="field.max"
            :step="field.step"
          />

          <!-- Select input -->
          <select
            v-else-if="field.type === 'select'"
            :id="field.name"
            v-model="formData[field.name]"
            class="select-input"
          >
            <option value="">Select...</option>
            <option v-for="option in field.options" :key="option" :value="option">
              {{ option }}
            </option>
          </select>

          <!-- Textarea -->
          <textarea
            v-else-if="field.type === 'textarea'"
            :id="field.name"
            v-model="formData[field.name]"
            class="textarea-input"
            rows="4"
            :required="field.required"
          />
        </div>

        <div class="form-actions">
          <Button type="submit" class="w-full"> Save Changes </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.property-panel {
  width: 320px;
  height: 100%;
  background: white;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.panel-title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.panel-subtitle {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.close-button {
  padding: 0.25rem;
  color: #6b7280;
  background: transparent;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.close-button:hover {
  color: #111827;
  background: #f3f4f6;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.form-field {
  margin-bottom: 1rem;
}

.select-input,
.textarea-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  transition: all 0.2s;
}

.select-input:focus,
.textarea-input:focus {
  outline: none;
  border-color: #3b82f6;
  ring: 2px;
  ring-color: rgba(59, 130, 246, 0.1);
}

.textarea-input {
  resize: vertical;
  font-family: monospace;
}

.form-actions {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

/* Scrollbar styling */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: #f3f4f6;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
