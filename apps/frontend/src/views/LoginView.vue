<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-4">
    <Card class="w-full max-w-md p-8">
      <div class="mb-6 text-center">
        <h1 class="text-3xl font-bold mb-2">Welcome Back</h1>
        <p class="text-muted-foreground">Sign in to your account to continue</p>
      </div>

      <Alert v-if="error" variant="destructive" class="mb-4">
        <AlertCircle class="h-4 w-4" />
        <div class="ml-2">{{ error }}</div>
      </Alert>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-2">
          <Label for="email">Email</Label>
          <Input
            id="email"
            v-model="formData.email"
            type="email"
            placeholder="you@example.com"
            required
            :disabled="loading"
            @blur="validateEmail"
          />
          <p v-if="errors.email" class="text-sm text-destructive">{{ errors.email }}</p>
        </div>

        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            v-model="formData.password"
            type="password"
            placeholder="••••••••"
            required
            :disabled="loading"
            @blur="validatePassword"
          />
          <p v-if="errors.password" class="text-sm text-destructive">{{ errors.password }}</p>
        </div>

        <Button type="submit" class="w-full" :disabled="loading">
          <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </Button>
      </form>

      <div class="mt-6 text-center text-sm">
        <span class="text-muted-foreground">Don't have an account? </span>
        <router-link to="/register" class="text-primary hover:underline font-medium">
          Sign up
        </router-link>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { AlertCircle, Loader2 } from 'lucide-vue-next'
import { z } from 'zod'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Alert from '@/components/ui/Alert.vue'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const formData = reactive({
  email: '',
  password: '',
})

const errors = reactive({
  email: '',
  password: '',
})

const error = ref('')
const loading = ref(false)

// Validation schemas
const emailSchema = z.string().email('Please enter a valid email address')
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters')

function validateEmail() {
  try {
    emailSchema.parse(formData.email)
    errors.email = ''
  } catch (err) {
    if (err instanceof z.ZodError) {
      errors.email = err.errors[0]?.message || 'Invalid email'
    }
  }
}

function validatePassword() {
  try {
    passwordSchema.parse(formData.password)
    errors.password = ''
  } catch (err) {
    if (err instanceof z.ZodError) {
      errors.password = err.errors[0]?.message || 'Invalid password'
    }
  }
}

function validateForm(): boolean {
  validateEmail()
  validatePassword()
  return !errors.email && !errors.password
}

async function handleSubmit() {
  error.value = ''

  if (!validateForm()) {
    return
  }

  loading.value = true

  try {
    const response = await authApi.login({
      email: formData.email,
      password: formData.password,
    })

    authStore.login(response.user, response.access_token)

    // Redirect to home or intended page
    const redirect = router.currentRoute.value.query.redirect as string
    router.push(redirect || '/')
  } catch (err: any) {
    error.value = err.message || 'Invalid email or password. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>
