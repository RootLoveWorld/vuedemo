<template>
  <div class="container mx-auto p-6">
    <h1 class="text-4xl font-bold mb-4">AI Workflow Platform</h1>
    <p class="text-muted-foreground mb-8">
      Welcome to the AI Workflow Platform. Create and execute AI-powered workflows with ease.
    </p>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <router-link to="/workflows" class="p-6 border rounded-lg hover:bg-accent transition-colors">
        <h2 class="text-2xl font-semibold mb-2">Workflows</h2>
        <p class="text-muted-foreground">Create and manage your AI workflows</p>
      </router-link>
      <router-link to="/executions" class="p-6 border rounded-lg hover:bg-accent transition-colors">
        <h2 class="text-2xl font-semibold mb-2">Executions</h2>
        <p class="text-muted-foreground">View execution history and results</p>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// Home view component
</script>
