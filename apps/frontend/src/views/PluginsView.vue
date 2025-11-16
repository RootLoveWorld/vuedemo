<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { usePluginStore } from '@/stores/plugin'
import { Button } from '@/components/ui/Button.vue'
import { Input } from '@/components/ui/Input.vue'
import { Card } from '@/components/ui/Card.vue'
import { Alert } from '@/components/ui/Alert.vue'
import PluginCard from '@/components/plugin/PluginCard.vue'
import PluginDetailDialog from '@/components/plugin/PluginDetailDialog.vue'
import PluginUploadDialog from '@/components/plugin/PluginUploadDialog.vue'

const pluginStore = usePluginStore()

const categories = [
  { value: null, label: 'All Categories' },
  { value: 'integration', label: 'Integration' },
  { value: 'ai', label: 'AI' },
  { value: 'data', label: 'Data' },
  { value: 'utility', label: 'Utility' },
  { value: 'custom', label: 'Custom' },
]

onMounted(() => {
  pluginStore.fetchPlugins()
})

// Watch for filter changes
watch(
  [
    () => pluginStore.searchQuery,
    () => pluginStore.selectedCategory,
    () => pluginStore.showInstalledOnly,
    () => pluginStore.currentPage,
  ],
  () => {
    pluginStore.fetchPlugins()
  }
)

function handleSearch(event: Event) {
  const target = event.target as HTMLInputElement
  pluginStore.setSearchQuery(target.value)
}

function handleCategoryChange(category: string | null) {
  pluginStore.setCategory(category)
}

function handlePageChange(page: number) {
  pluginStore.setPage(page)
}
</script>

<template>
  <div class="plugins-view">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <h1 class="title">Plugin Marketplace</h1>
        <p class="subtitle">Extend your workflows with powerful plugins</p>
      </div>
      <div class="header-actions">
        <PluginUploadDialog />
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <div class="search-box">
        <Input
          type="search"
          placeholder="Search plugins..."
          :value="pluginStore.searchQuery"
          class="search-input"
          @input="handleSearch"
        />
      </div>

      <div class="filter-group">
        <div class="category-filters">
          <button
            v-for="cat in categories"
            :key="cat.value || 'all'"
            :class="['category-btn', { active: pluginStore.selectedCategory === cat.value }]"
            @click="handleCategoryChange(cat.value)"
          >
            {{ cat.label }}
          </button>
        </div>

        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="pluginStore.showInstalledOnly"
            @change="
              (e) => pluginStore.setShowInstalledOnly((e.target as HTMLInputElement).checked)
            "
          />
          <span>Show installed only</span>
        </label>
      </div>
    </div>

    <!-- Error Alert -->
    <Alert v-if="pluginStore.error" variant="destructive" class="error-alert">
      {{ pluginStore.error }}
      <button class="close-btn" @click="pluginStore.clearError()">×</button>
    </Alert>

    <!-- Loading State -->
    <div v-if="pluginStore.loading && pluginStore.plugins.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>Loading plugins...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="!pluginStore.loading && pluginStore.plugins.length === 0" class="empty-state">
      <div class="empty-icon">📦</div>
      <h3>No plugins found</h3>
      <p>Try adjusting your search or filters</p>
    </div>

    <!-- Plugins Grid -->
    <div v-else class="plugins-grid">
      <PluginCard v-for="plugin in pluginStore.plugins" :key="plugin.id" :plugin="plugin" />
    </div>

    <!-- Pagination -->
    <div v-if="pluginStore.totalPages > 1" class="pagination">
      <Button
        variant="outline"
        :disabled="pluginStore.currentPage === 1"
        @click="handlePageChange(pluginStore.currentPage - 1)"
      >
        Previous
      </Button>

      <div class="page-numbers">
        <button
          v-for="page in pluginStore.totalPages"
          :key="page"
          :class="['page-btn', { active: page === pluginStore.currentPage }]"
          @click="handlePageChange(page)"
        >
          {{ page }}
        </button>
      </div>

      <Button
        variant="outline"
        :disabled="pluginStore.currentPage === pluginStore.totalPages"
        @click="handlePageChange(pluginStore.currentPage + 1)"
      >
        Next
      </Button>
    </div>
  </div>
</template>

<style scoped>
.plugins-view {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.header-content {
  flex: 1;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: hsl(var(--foreground));
}

.subtitle {
  font-size: 1rem;
  color: hsl(var(--muted-foreground));
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.filters {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.search-box {
  width: 100%;
  max-width: 400px;
}

.search-input {
  width: 100%;
}

.filter-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.category-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.category-btn {
  padding: 0.5rem 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  cursor: pointer;
  transition: all 0.2s;
}

.category-btn:hover {
  background: hsl(var(--accent));
}

.category-btn.active {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-color: hsl(var(--primary));
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.error-alert {
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid hsl(var(--border));
  border-top-color: hsl(var(--primary));
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: hsl(var(--muted-foreground));
}

.plugins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.page-numbers {
  display: flex;
  gap: 0.5rem;
}

.page-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  cursor: pointer;
  transition: all 0.2s;
  min-width: 2.5rem;
}

.page-btn:hover {
  background: hsl(var(--accent));
}

.page-btn.active {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-color: hsl(var(--primary));
}
</style>
