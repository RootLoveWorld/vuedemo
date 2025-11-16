import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'
import { useAuthStore } from './stores/auth'
import { usePluginManager } from './composables/usePluginManager'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize auth state from storage and plugin system
const authStore = useAuthStore()
const pluginManager = usePluginManager()

authStore.loadFromStorage().then(async () => {
  // Initialize plugin system if user is authenticated
  if (authStore.isAuthenticated) {
    try {
      await pluginManager.initialize()
      console.log('Plugin system initialized')
    } catch (error) {
      console.error('Failed to initialize plugin system:', error)
      // Continue mounting even if plugin initialization fails
    }
  }

  app.mount('#app')
})
