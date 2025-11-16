import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import './types'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/workflows',
    name: 'workflows',
    component: () => import('@/views/WorkflowsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/workflows/:id',
    name: 'workflow-editor',
    component: () => import('@/views/WorkflowEditorView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/executions',
    name: 'executions',
    component: () => import('@/views/ExecutionsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/plugins',
    name: 'plugins',
    component: () => import('@/views/PluginsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guest: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Navigation guard for authentication
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated

  // Check if route requires authentication
  if (to.meta.requiresAuth && !isAuthenticated) {
    // Redirect to login with return URL
    next({
      name: 'login',
      query: { redirect: to.fullPath },
    })
    return
  }

  // Check if route is for guests only (login/register)
  if (to.meta.guest && isAuthenticated) {
    // Redirect authenticated users to home
    next({ name: 'home' })
    return
  }

  // Allow navigation
  next()
})

export default router
