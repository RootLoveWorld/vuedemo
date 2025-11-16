<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePluginStore } from '@/stores/plugin'
import { Button } from '@/components/ui/Button.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog.vue'
import { Alert } from '@/components/ui/Alert.vue'

const pluginStore = usePluginStore()

const open = ref(false)
const selectedFile = ref<File | null>(null)
const dragOver = ref(false)
const uploadError = ref<string | null>(null)
const uploadProgress = ref(0)
const isUploading = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)

const hasFile = computed(() => selectedFile.value !== null)

const fileSize = computed(() => {
  if (!selectedFile.value) return ''
  const bytes = selectedFile.value.size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
})

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    validateAndSetFile(file)
  }
}

function handleDrop(event: DragEvent) {
  dragOver.value = false
  const file = event.dataTransfer?.files[0]
  if (file) {
    validateAndSetFile(file)
  }
}

function validateAndSetFile(file: File) {
  uploadError.value = null

  // Validate file extension
  if (!file.name.endsWith('.wfplugin')) {
    uploadError.value = 'Invalid file type. Please upload a .wfplugin file.'
    return
  }

  // Validate file size (max 50MB)
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    uploadError.value = 'File size exceeds 50MB limit.'
    return
  }

  selectedFile.value = file
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  dragOver.value = true
}

function handleDragLeave() {
  dragOver.value = false
}

function removeFile() {
  selectedFile.value = null
  uploadError.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function handleUpload() {
  if (!selectedFile.value) return

  isUploading.value = true
  uploadError.value = null
  uploadProgress.value = 0

  try {
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 10
      }
    }, 200)

    await pluginStore.uploadPlugin(selectedFile.value)

    clearInterval(progressInterval)
    uploadProgress.value = 100

    // Close dialog after successful upload
    setTimeout(() => {
      open.value = false
      resetDialog()
    }, 500)
  } catch (error: any) {
    uploadError.value = error.message || 'Failed to upload plugin'
    console.error('Upload error:', error)
  } finally {
    isUploading.value = false
  }
}

function resetDialog() {
  selectedFile.value = null
  uploadError.value = null
  uploadProgress.value = 0
  isUploading.value = false
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function handleClose() {
  if (!isUploading.value) {
    open.value = false
    resetDialog()
  }
}
</script>

<template>
  <div>
    <Button @click="open = true">
      <span class="upload-icon">⬆</span>
      Upload Plugin
    </Button>

    <Dialog v-model:open="open" @update:open="(val) => !val && handleClose()">
      <DialogContent class="upload-dialog">
        <DialogHeader>
          <DialogTitle>Upload Custom Plugin</DialogTitle>
          <DialogDescription>
            Upload a .wfplugin file to install a custom plugin
          </DialogDescription>
        </DialogHeader>

        <div class="dialog-body">
          <!-- Error Alert -->
          <Alert v-if="uploadError" variant="destructive" class="error-alert">
            {{ uploadError }}
          </Alert>

          <!-- File Upload Area -->
          <div
            v-if="!hasFile"
            :class="['upload-area', { 'drag-over': dragOver }]"
            @drop.prevent="handleDrop"
            @dragover.prevent="handleDragOver"
            @dragleave="handleDragLeave"
            @click="triggerFileInput"
          >
            <div class="upload-icon-large">📦</div>
            <p class="upload-text"><strong>Click to upload</strong> or drag and drop</p>
            <p class="upload-hint">.wfplugin files only (max 50MB)</p>
            <input
              ref="fileInputRef"
              type="file"
              accept=".wfplugin"
              class="file-input"
              @change="handleFileSelect"
            />
          </div>

          <!-- Selected File Info -->
          <div v-else class="file-info">
            <div class="file-icon">📄</div>
            <div class="file-details">
              <p class="file-name">{{ selectedFile!.name }}</p>
              <p class="file-size">{{ fileSize }}</p>
            </div>
            <button v-if="!isUploading" class="remove-btn" type="button" @click="removeFile">
              ×
            </button>
          </div>

          <!-- Upload Progress -->
          <div v-if="isUploading" class="upload-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${uploadProgress}%` }"></div>
            </div>
            <p class="progress-text">Uploading... {{ uploadProgress }}%</p>
          </div>

          <!-- Instructions -->
          <div class="instructions">
            <h4 class="instructions-title">Plugin Requirements:</h4>
            <ul class="instructions-list">
              <li>File must have .wfplugin extension</li>
              <li>Maximum file size: 50MB</li>
              <li>Must contain valid plugin manifest</li>
              <li>Plugin will be validated before installation</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="isUploading" @click="handleClose"> Cancel </Button>
          <Button :disabled="!hasFile || isUploading" @click="handleUpload">
            {{ isUploading ? 'Uploading...' : 'Upload & Install' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.upload-icon {
  margin-right: 0.5rem;
}

.upload-dialog {
  max-width: 500px;
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.error-alert {
  margin: 0;
}

.upload-area {
  border: 2px dashed hsl(var(--border));
  border-radius: 0.5rem;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: hsl(var(--background));
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: hsl(var(--primary));
  background: hsl(var(--accent));
}

.upload-icon-large {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.upload-text {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  color: hsl(var(--foreground));
}

.upload-text strong {
  color: hsl(var(--primary));
}

.upload-hint {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
}

.file-input {
  display: none;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  background: hsl(var(--accent));
}

.file-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 0.25rem;
}

.file-size {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
}

.remove-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  color: hsl(var(--muted-foreground));
  transition: color 0.2s;
  flex-shrink: 0;
}

.remove-btn:hover {
  color: hsl(var(--destructive));
}

.upload-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 0.5rem;
  background: hsl(var(--muted));
  border-radius: 0.25rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: hsl(var(--primary));
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

.instructions {
  padding: 1rem;
  background: hsl(var(--muted));
  border-radius: 0.5rem;
}

.instructions-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.instructions-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.instructions-list li {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  padding-left: 1.25rem;
  position: relative;
}

.instructions-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: hsl(var(--primary));
}
</style>
