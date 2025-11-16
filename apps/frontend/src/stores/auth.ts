import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'

export interface User {
  id: string
  email: string
  name?: string
}

const TOKEN_KEY = 'auth_token'
const TOKEN_EXPIRY_KEY = 'auth_token_expiry'
const REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 minutes before expiry

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const tokenExpiry = ref<number | null>(null)
  const refreshTimer = ref<number | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  function setUser(userData: User | null) {
    user.value = userData
  }

  function setToken(tokenValue: string | null, expiresIn: number = 3600) {
    token.value = tokenValue

    if (tokenValue) {
      // Calculate expiry time (default 1 hour)
      const expiryTime = Date.now() + expiresIn * 1000
      tokenExpiry.value = expiryTime

      localStorage.setItem(TOKEN_KEY, tokenValue)
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())

      // Schedule token refresh
      scheduleTokenRefresh()
    } else {
      tokenExpiry.value = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(TOKEN_EXPIRY_KEY)
      clearRefreshTimer()
    }
  }

  function scheduleTokenRefresh() {
    clearRefreshTimer()

    if (!tokenExpiry.value) return

    const timeUntilRefresh = tokenExpiry.value - Date.now() - REFRESH_THRESHOLD

    if (timeUntilRefresh > 0) {
      refreshTimer.value = window.setTimeout(() => {
        refreshToken()
      }, timeUntilRefresh)
    } else {
      // Token is about to expire or already expired, refresh immediately
      refreshToken()
    }
  }

  function clearRefreshTimer() {
    if (refreshTimer.value) {
      clearTimeout(refreshTimer.value)
      refreshTimer.value = null
    }
  }

  async function refreshToken() {
    try {
      const response = await authApi.refreshToken()
      setToken(response.access_token)
    } catch (error) {
      console.error('Token refresh failed:', error)
      // Auto logout on refresh failure
      logout()
    }
  }

  function login(userData: User, tokenValue: string, expiresIn?: number) {
    setUser(userData)
    setToken(tokenValue, expiresIn)
  }

  function logout() {
    setUser(null)
    setToken(null)
    clearRefreshTimer()
  }

  async function loadFromStorage() {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY)

    if (!storedToken || !storedExpiry) {
      return
    }

    const expiryTime = parseInt(storedExpiry, 10)

    // Check if token is expired
    if (Date.now() >= expiryTime) {
      // Token expired, clear storage
      logout()
      return
    }

    token.value = storedToken
    tokenExpiry.value = expiryTime

    try {
      // Fetch user profile to validate token
      const userData = await authApi.getProfile()
      setUser(userData)

      // Schedule token refresh
      scheduleTokenRefresh()
    } catch (error) {
      console.error('Failed to load user profile:', error)
      // Token is invalid, clear storage
      logout()
    }
  }

  function checkTokenExpiry() {
    if (!tokenExpiry.value) return

    if (Date.now() >= tokenExpiry.value) {
      // Token expired, auto logout
      logout()
    }
  }

  // Check token expiry every minute
  setInterval(checkTokenExpiry, 60 * 1000)

  return {
    user,
    token,
    tokenExpiry,
    isAuthenticated,
    setUser,
    setToken,
    login,
    logout,
    loadFromStorage,
    refreshToken,
    checkTokenExpiry,
  }
})
