<template>
  <div class="h-full flex flex-col bg-white border-l">
    <!-- Header -->
    <div class="p-4 border-b flex items-center justify-between">
      <h3 class="font-semibold">版本历史</h3>
      <Button variant="ghost" size="sm" @click="$emit('close')">
        <X class="w-4 h-4" />
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <Loader2 class="w-6 h-6 animate-spin text-primary" />
    </div>

    <!-- Error State -->
    <Alert v-else-if="error" variant="destructive" class="m-4">
      <AlertCircle class="w-4 h-4" />
      <div>
        <h4 class="font-semibold">加载失败</h4>
        <p class="text-sm">{{ error }}</p>
      </div>
    </Alert>

    <!-- Version List -->
    <div v-else class="flex-1 overflow-y-auto p-4 space-y-3">
      <Card
        v-for="version in versions"
        :key="version.id"
        :class="[
          'p-4 cursor-pointer hover:shadow-md transition-shadow',
          selectedVersion?.id === version.id ? 'ring-2 ring-primary' : '',
        ]"
        @click="selectVersion(version)"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="font-semibold">版本 {{ version.version }}</span>
            <span
              v-if="version.version === currentVersion"
              class="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full"
            >
              当前
            </span>
          </div>
          <Button
            v-if="version.version !== currentVersion"
            variant="ghost"
            size="sm"
            :disabled="false"
            @click.stop="handleRollback(version)"
          >
            <RotateCcw class="w-4 h-4" />
          </Button>
        </div>
        <p class="text-sm text-muted-foreground mb-2">
          {{ formatDate(version.createdAt) }}
        </p>
        <div class="flex items-center gap-4 text-xs text-muted-foreground">
          <span class="flex items-center gap-1">
            <Layers class="w-3 h-3" />
            {{ version.definition?.nodes?.length || 0 }} 节点
          </span>
          <span class="flex items-center gap-1">
            <GitBranch class="w-3 h-3" />
            {{ version.definition?.edges?.length || 0 }} 连接
          </span>
        </div>
      </Card>

      <!-- Empty State -->
      <div v-if="versions.length === 0" class="text-center py-8">
        <FileText class="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p class="text-sm text-muted-foreground">暂无版本历史</p>
      </div>
    </div>

    <!-- Actions -->
    <div v-if="selectedVersion && selectedVersion.version !== currentVersion" class="p-4 border-t">
      <div class="flex gap-2">
        <Button variant="outline" class="flex-1" @click="handleCompare">
          <GitCompare class="w-4 h-4 mr-2" />
          对比
        </Button>
        <Button class="flex-1" @click="handleRollback(selectedVersion)">
          <RotateCcw class="w-4 h-4 mr-2" />
          回滚
        </Button>
      </div>
    </div>

    <!-- Rollback Confirmation Dialog -->
    <Dialog v-model:open="showRollbackDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认回滚</DialogTitle>
          <DialogDescription>
            确定要回滚到版本 {{ versionToRollback?.version }} 吗？当前的更改将被保存为新版本。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showRollbackDialog = false">取消</Button>
          <Button :disabled="isRollingBack" @click="confirmRollback">
            <Loader2 v-if="isRollingBack" class="w-4 h-4 mr-2 animate-spin" />
            确认回滚
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Compare Dialog -->
    <Dialog v-model:open="showCompareDialog">
      <DialogContent class="max-w-4xl">
        <DialogHeader>
          <DialogTitle>版本对比</DialogTitle>
          <DialogDescription>
            对比版本 {{ selectedVersion?.version }} 与当前版本 {{ currentVersion }}
          </DialogDescription>
        </DialogHeader>
        <div class="p-6 max-h-[60vh] overflow-y-auto">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <h4 class="font-semibold mb-2">版本 {{ selectedVersion?.version }}</h4>
              <div class="space-y-2 text-sm">
                <div class="flex items-center gap-2">
                  <Layers class="w-4 h-4" />
                  <span>{{ selectedVersion?.definition?.nodes?.length || 0 }} 节点</span>
                </div>
                <div class="flex items-center gap-2">
                  <GitBranch class="w-4 h-4" />
                  <span>{{ selectedVersion?.definition?.edges?.length || 0 }} 连接</span>
                </div>
              </div>
            </div>
            <div>
              <h4 class="font-semibold mb-2">当前版本 {{ currentVersion }}</h4>
              <div class="space-y-2 text-sm">
                <div class="flex items-center gap-2">
                  <Layers class="w-4 h-4" />
                  <span>{{ currentDefinition?.nodes?.length || 0 }} 节点</span>
                </div>
                <div class="flex items-center gap-2">
                  <GitBranch class="w-4 h-4" />
                  <span>{{ currentDefinition?.edges?.length || 0 }} 连接</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button @click="showCompareDialog = false">关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { workflowsApi, type WorkflowVersion } from '@/api/workflows'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import Alert from '@/components/ui/Alert.vue'
import Dialog from '@/components/ui/Dialog.vue'
import DialogContent from '@/components/ui/DialogContent.vue'
import DialogHeader from '@/components/ui/DialogHeader.vue'
import DialogTitle from '@/components/ui/DialogTitle.vue'
import DialogDescription from '@/components/ui/DialogDescription.vue'
import DialogFooter from '@/components/ui/DialogFooter.vue'
import {
  X,
  Loader2,
  AlertCircle,
  FileText,
  Layers,
  GitBranch,
  RotateCcw,
  GitCompare,
} from 'lucide-vue-next'

interface Props {
  workflowId: string
  currentVersion: number
  currentDefinition?: any
}

interface Emits {
  (event: 'close'): void
  (event: 'rollback'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const loading = ref(false)
const error = ref<string | null>(null)
const versions = ref<WorkflowVersion[]>([])
const selectedVersion = ref<WorkflowVersion | null>(null)
const showRollbackDialog = ref(false)
const showCompareDialog = ref(false)
const versionToRollback = ref<WorkflowVersion | null>(null)
const isRollingBack = ref(false)

async function loadVersions() {
  loading.value = true
  error.value = null
  try {
    const data = await workflowsApi.getVersionHistory(props.workflowId)
    versions.value = data.sort((a, b) => b.version - a.version)
  } catch (err: any) {
    error.value = err.message || '加载版本历史失败'
  } finally {
    loading.value = false
  }
}

function selectVersion(version: WorkflowVersion) {
  selectedVersion.value = version
}

function handleRollback(version: WorkflowVersion) {
  versionToRollback.value = version
  showRollbackDialog.value = true
}

async function confirmRollback() {
  if (!versionToRollback.value) return

  isRollingBack.value = true
  try {
    await workflowsApi.rollbackToVersion(props.workflowId, versionToRollback.value.version)
    emit('rollback', versionToRollback.value)
    showRollbackDialog.value = false
    await loadVersions()
  } catch (err: any) {
    error.value = err.message || '回滚失败'
  } finally {
    isRollingBack.value = false
  }
}

function handleCompare() {
  showCompareDialog.value = true
}

function formatDate(date: string | Date) {
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  loadVersions()
})
</script>
