<script setup lang="ts">
import { Save, FolderOpen, Undo, Redo, ZoomIn, ZoomOut, Maximize } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'

interface Props {
  canUndo?: boolean
  canRedo?: boolean
}

withDefaults(defineProps<Props>(), {
  canUndo: false,
  canRedo: false,
})

const emit = defineEmits<{
  save: []
  load: []
  undo: []
  redo: []
  'zoom-in': []
  'zoom-out': []
  'fit-view': []
}>()

const handleSave = () => emit('save')
const handleLoad = () => emit('load')
const handleUndo = () => emit('undo')
const handleRedo = () => emit('redo')
const handleZoomIn = () => emit('zoom-in')
const handleZoomOut = () => emit('zoom-out')
const handleFitView = () => emit('fit-view')
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-group">
      <Button variant="outline" size="sm" @click="handleSave">
        <Save :size="16" />
        <span class="ml-2">Save</span>
      </Button>
      <Button variant="outline" size="sm" @click="handleLoad">
        <FolderOpen :size="16" />
        <span class="ml-2">Load</span>
      </Button>
    </div>

    <div class="toolbar-divider" />

    <div class="toolbar-group">
      <Button variant="outline" size="sm" :disabled="!canUndo" @click="handleUndo">
        <Undo :size="16" />
      </Button>
      <Button variant="outline" size="sm" :disabled="!canRedo" @click="handleRedo">
        <Redo :size="16" />
      </Button>
    </div>

    <div class="toolbar-divider" />

    <div class="toolbar-group">
      <Button variant="outline" size="sm" @click="handleZoomIn">
        <ZoomIn :size="16" />
      </Button>
      <Button variant="outline" size="sm" @click="handleZoomOut">
        <ZoomOut :size="16" />
      </Button>
      <Button variant="outline" size="sm" @click="handleFitView">
        <Maximize :size="16" />
      </Button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
}
</style>
