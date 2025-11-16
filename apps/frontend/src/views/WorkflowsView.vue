<template>
  <div class="container mx-auto p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">工作流</h1>
      <Button @click="handleCreate">
        <Plus class="w-4 h-4 mr-2" />
        创建工作流
      </Button>
    </div>

    <!-- Search and Filters -->
    <div class="flex gap-4 mb-6">
      <div class="flex-1">
        <Input
          v-model="searchQuery"
          placeholder="搜索工作流..."
          class="w-full"
          @input="handleSearch"
        >
          <template #prefix>
            <Search class="w-4 h-4 text-muted-foreground" />
          </template>
        </Input>
      </div>
      <Button variant="outline" @click="handleRefresh">
        <RefreshCw class="w-4 h-4 mr-2" />
        刷新
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <Loader2 class="w-8 h-8 animate-spin text-primary" />
    </div>

    <!-- Error State -->
    <Alert v-else-if="error" variant="destructive" class="mb-6">
      <AlertCircle class="w-4 h-4" />
      <div>
        <h3 class="font-semibold">加载失败</h3>
        <p class="text-sm">{{ error }}</p>
      </div>
    </Alert>

    <!-- Empty State -->
    <Card v-else-if="filteredWorkflows.length === 0" class="p-12">
      <div class="flex flex-col items-center justify-center text-center">
        <FileText class="w-16 h-16 text-muted-foreground mb-4" />
        <h3 class="text-lg font-semibold mb-2">
          {{ searchQuery ? '未找到工作流' : '还没有工作流' }}
        </h3>
        <p class="text-muted-foreground mb-4">
          {{ searchQuery ? '尝试调整搜索条件' : '创建您的第一个AI工作流' }}
        </p>
        <Button v-if="!searchQuery" @click="handleCreate">
          <Plus class="w-4 h-4 mr-2" />
          创建工作流
        </Button>
      </div>
    </Card>

    <!-- Workflow List -->
    <div v-else class="space-y-4">
      <Card
        v-for="workflow in paginatedWorkflows"
        :key="workflow.id"
        class="p-6 hover:shadow-md transition-shadow cursor-pointer"
        @click="handleEdit(workflow.id)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="text-lg font-semibold">{{ workflow.name }}</h3>
              <span
                v-if="workflow.isActive"
                class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full"
              >
                活跃
              </span>
              <span
                v-else
                class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full"
              >
                未激活
              </span>
            </div>
            <p v-if="workflow.description" class="text-sm text-muted-foreground mb-3">
              {{ workflow.description }}
            </p>
            <div class="flex items-center gap-4 text-sm text-muted-foreground">
              <span class="flex items-center gap-1">
                <Layers class="w-4 h-4" />
                {{ workflow.definition?.nodes?.length || 0 }} 节点
              </span>
              <span class="flex items-center gap-1">
                <GitBranch class="w-4 h-4" />
                版本 {{ workflow.version }}
              </span>
              <span class="flex items-center gap-1">
                <Clock class="w-4 h-4" />
                {{ formatDate(workflow.updatedAt) }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2" @click.stop>
            <Button variant="ghost" size="sm" @click="handleExecute(workflow.id)">
              <Play class="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" @click="handleClone(workflow.id)">
              <Copy class="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" @click="handleDelete(workflow.id)">
              <Trash2 class="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </Card>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between pt-4">
        <p class="text-sm text-muted-foreground">
          显示 {{ (currentPage - 1) * pageSize + 1 }} -
          {{ Math.min(currentPage * pageSize, filteredWorkflows.length) }} / 共
          {{ filteredWorkflows.length }} 个工作流
        </p>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" :disabled="currentPage === 1" @click="currentPage--">
            <ChevronLeft class="w-4 h-4" />
            上一页
          </Button>
          <div class="flex items-center gap-1">
            <Button
              v-for="page in visiblePages"
              :key="page"
              :variant="page === currentPage ? 'default' : 'outline'"
              size="sm"
              @click="currentPage = page"
            >
              {{ page }}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >
            下一页
            <ChevronRight class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <Dialog v-model:open="showDeleteDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            确定要删除工作流 "{{ workflowToDelete?.name }}" 吗？此操作无法撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteDialog = false">取消</Button>
          <Button variant="destructive" @click="confirmDelete">删除</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkflowStore } from '@/stores/workflow'
import { workflowsApi } from '@/api/workflows'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Card from '@/components/ui/Card.vue'
import Alert from '@/components/ui/Alert.vue'
import Dialog from '@/components/ui/Dialog.vue'
import DialogContent from '@/components/ui/DialogContent.vue'
import DialogDescription from '@/components/ui/DialogDescription.vue'
import DialogFooter from '@/components/ui/DialogFooter.vue'
import DialogHeader from '@/components/ui/DialogHeader.vue'
import DialogTitle from '@/components/ui/DialogTitle.vue'
import {
  Plus,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileText,
  Play,
  Copy,
  Trash2,
  Layers,
  GitBranch,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'
import type { Workflow } from '@workflow/shared-types'

const router = useRouter()
const workflowStore = useWorkflowStore()

// State
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const showDeleteDialog = ref(false)
const workflowToDelete = ref<Workflow | null>(null)

// Computed
const filteredWorkflows = computed(() => {
  if (!searchQuery.value) {
    return workflowStore.workflows
  }
  const query = searchQuery.value.toLowerCase()
  return workflowStore.workflows.filter(
    (w) => w.name.toLowerCase().includes(query) || w.description?.toLowerCase().includes(query)
  )
})

const totalPages = computed(() => Math.ceil(filteredWorkflows.value.length / pageSize.value))

const paginatedWorkflows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredWorkflows.value.slice(start, end)
})

const visiblePages = computed(() => {
  const pages: number[] = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

// Methods
async function loadWorkflows() {
  loading.value = true
  error.value = null
  try {
    const workflows = await workflowsApi.getAll()
    workflowStore.setWorkflows(workflows)
  } catch (err: any) {
    error.value = err.message || '加载工作流失败'
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
}

function handleRefresh() {
  loadWorkflows()
}

function handleCreate() {
  router.push('/workflows/new')
}

function handleEdit(id: string) {
  router.push(`/workflows/${id}`)
}

async function handleExecute(id: string) {
  router.push(`/workflows/${id}/execute`)
}

async function handleClone(id: string) {
  try {
    const cloned = await workflowsApi.clone(id)
    await loadWorkflows()
    router.push(`/workflows/${cloned.id}`)
  } catch (err: any) {
    error.value = err.message || '克隆工作流失败'
  }
}

function handleDelete(id: string) {
  const workflow = workflowStore.workflows.find((w) => w.id === id)
  if (workflow) {
    workflowToDelete.value = workflow
    showDeleteDialog.value = true
  }
}

async function confirmDelete() {
  if (!workflowToDelete.value) return

  try {
    await workflowsApi.delete(workflowToDelete.value.id)
    await loadWorkflows()
    showDeleteDialog.value = false
    workflowToDelete.value = null
  } catch (err: any) {
    error.value = err.message || '删除工作流失败'
  }
}

function formatDate(date: string | Date) {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`
  if (days < 365) return `${Math.floor(days / 30)} 月前`
  return `${Math.floor(days / 365)} 年前`
}

// Lifecycle
onMounted(() => {
  loadWorkflows()
})
</script>
