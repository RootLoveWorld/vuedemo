import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const user = computed(() => authStore.user)
  const token = computed(() => authStore.token)

  async function login(_email: string, _password: string) {
    // Login logic is handled in the LoginView component
    // This is a convenience method for programmatic login
    throw new Error('Use authApi.login() directly')
  }

  function logout() {
    authStore.logout()
    router.push('/login')
  }

  function requireAuth() {
    if (!isAuthenticated.value) {
      router.push({
        name: 'login',
        query: { redirect: router.currentRoute.value.fullPath },
      })
      return false
    }
    return true
  }

  function checkPermission(_permission: string): boolean {
    // Placeholder for future permission system
    // For now, just check if user is authenticated
    return isAuthenticated.value
  }

  function hasRole(_role: string): boolean {
    // Placeholder for future role-based access control
    // For now, just check if user is authenticated
    return isAuthenticated.value
  }

  return {
    isAuthenticated,
    user,
    token,
    login,
    logout,
    requireAuth,
    checkPermission,
    hasRole,
  }
}
