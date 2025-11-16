import ky from 'ky'

let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token))
  refreshSubscribers = []
}

const apiClient = ky.create({
  prefixUrl: import.meta.env.VITE_BFF_URL || '/api',
  timeout: 30000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = localStorage.getItem('auth_token')
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`)
        }
      },
    ],
    afterResponse: [
      async (request, _options, response) => {
        // Handle 401 Unauthorized
        if (response.status === 401) {
          const originalRequest = request.clone()

          // Don't retry refresh or login endpoints
          if (
            originalRequest.url.includes('/auth/refresh') ||
            originalRequest.url.includes('/auth/login')
          ) {
            // Clear auth and redirect to login
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_token_expiry')
            window.location.href = '/login'
            return response
          }

          // Try to refresh token
          if (!isRefreshing) {
            isRefreshing = true

            try {
              const refreshResponse = await ky
                .post(`${import.meta.env.VITE_BFF_URL || '/api'}/auth/refresh`, {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                  },
                })
                .json<{ access_token: string }>()

              const newToken = refreshResponse.access_token
              localStorage.setItem('auth_token', newToken)

              isRefreshing = false
              onTokenRefreshed(newToken)

              // Retry original request with new token
              const retryRequest = originalRequest.clone()
              retryRequest.headers.set('Authorization', `Bearer ${newToken}`)
              return ky(retryRequest)
            } catch (error) {
              isRefreshing = false
              refreshSubscribers = []

              // Refresh failed, clear auth and redirect
              localStorage.removeItem('auth_token')
              localStorage.removeItem('auth_token_expiry')
              window.location.href = '/login'

              return response
            }
          } else {
            // Wait for token refresh to complete
            return new Promise((resolve) => {
              subscribeTokenRefresh((token: string) => {
                const retryRequest = originalRequest.clone()
                retryRequest.headers.set('Authorization', `Bearer ${token}`)
                resolve(ky(retryRequest))
              })
            })
          }
        }

        return response
      },
    ],
    beforeError: [
      async (error) => {
        const { response } = error
        if (response) {
          try {
            const errorData = (await response.json()) as { message?: string }
            error.message = errorData.message || error.message
          } catch {
            // Response is not JSON, use default message
          }
        }
        return error
      },
    ],
  },
})

export default apiClient
