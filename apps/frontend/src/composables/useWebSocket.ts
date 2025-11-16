import { ref, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'

export function useWebSocket(namespace: string = '') {
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)
  const isReconnecting = ref(false)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5

  function connect() {
    const token = localStorage.getItem('auth_token')
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001'

    socket.value = io(`${wsUrl}${namespace}`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
    })

    socket.value.on('connect', () => {
      isConnected.value = true
      isReconnecting.value = false
      reconnectAttempts.value = 0
      console.log('WebSocket connected')
    })

    socket.value.on('disconnect', (reason) => {
      isConnected.value = false
      console.log('WebSocket disconnected:', reason)

      // Auto-reconnect for certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        socket.value?.connect()
      }
    })

    socket.value.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      isReconnecting.value = true
      reconnectAttempts.value++

      if (reconnectAttempts.value >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached')
        isReconnecting.value = false
      }
    })

    socket.value.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts')
      isReconnecting.value = false
      reconnectAttempts.value = 0
    })

    socket.value.on('reconnect_attempt', (attemptNumber) => {
      console.log('WebSocket reconnection attempt', attemptNumber)
      isReconnecting.value = true
    })

    socket.value.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error)
    })

    socket.value.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed')
      isReconnecting.value = false
    })

    socket.value.on('error', (error) => {
      console.error('WebSocket error:', error)
    })
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
      isReconnecting.value = false
      reconnectAttempts.value = 0
    }
  }

  function emit(event: string, data: any) {
    if (socket.value && isConnected.value) {
      socket.value.emit(event, data)
    } else {
      console.warn('Cannot emit event: WebSocket not connected')
    }
  }

  function on(event: string, callback: (...args: any[]) => void) {
    if (socket.value) {
      socket.value.on(event, callback)
    }
  }

  function off(event: string, callback?: (...args: any[]) => void) {
    if (socket.value) {
      socket.value.off(event, callback)
    }
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    socket,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    connect,
    disconnect,
    emit,
    on,
    off,
  }
}
