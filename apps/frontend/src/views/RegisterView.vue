<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-4">
    <Card class="w-full max-w-md p-8">
      <div class="mb-6 text-center">
        <h1 class="text-3xl font-bold mb-2">Create Account</h1>
        <p class="text-muted-foreground">Sign up to get started with AI Workflow Platform</p>
      </div>

      <Alert v-if="error" variant="destructive" class="mb-4">
        <AlertCircle class="h-4 w-4" />
        <div class="ml-2">{{ error }}</div>
      </Alert>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-2">
          <Label for="name">Name (Optional)</Label>
          <Input
            id="name"
            v-model="formData.name"
            type="text"
            placeholder="John Doe"
            :disabled="loading"
          />
        </div>

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

          <!-- Password strength indicator -->
          <div v-if="formData.password" class="space-y-1">
            <div class="flex gap-1">
              <div
                v-for="i in 4"
                :key="i"
                class="h-1 flex-1 rounded-full transition-colors"
                :class="i <= passwordStrength ? getStrengthColor() : 'bg-muted'"
              />
            </div>
            <p class="text-xs" :class="getStrengthTextColor()">
              Password strength: {{ getStrengthLabel() }}
            </p>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            v-model="formData.confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            :disabled="loading"
            @blur="validateConfirmPassword"
          />
          <p v-if="errors.confirmPassword" class="text-sm text-destructive">
            {{ errors.confirmPassword }}
          </p>
        </div>

        <Button type="submit" class="w-full" :disabled="loading">
          <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          {{ loading ? 'Creating account...' : 'Create Account' }}
        </Button>
      </form>

      <div class="mt-6 text-center text-sm">
        <span class="text-muted-foreground">Already have an account? </span>
        <router-link to="/login" class="text-primary hover:underline font-medium">
          Sign in
        </router-link>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
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
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const errors = reactive({
  email: '',
  password: '',
  confirmPassword: '',
})

const error = ref('')
const loading = ref(false)

// Validation schemas
const emailSchema = z.string().email('Please enter a valid email address')
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// Password strength calculation
const passwordStrength = computed(() => {
  const password = formData.password
  if (!password) return 0

  let strength = 0

  // Length check
  if (password.length >= 8) strength++
  if (password.length >= 12) strength++

  // Character variety checks
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[^A-Za-z0-9]/.test(password)) strength++

  return Math.min(strength, 4)
})

function getStrengthLabel(): string {
  switch (passwordStrength.value) {
    case 0:
    case 1:
      return 'Weak'
    case 2:
      return 'Fair'
    case 3:
      return 'Good'
    case 4:
      return 'Strong'
    default:
      return 'Weak'
  }
}

function getStrengthColor(): string {
  switch (passwordStrength.value) {
    case 0:
    case 1:
      return 'bg-destructive'
    case 2:
      return 'bg-yellow-500'
    case 3:
      return 'bg-blue-500'
    case 4:
      return 'bg-green-500'
    default:
      return 'bg-muted'
  }
}

function getStrengthTextColor(): string {
  switch (passwordStrength.value) {
    case 0:
    case 1:
      return 'text-destructive'
    case 2:
      return 'text-yellow-600'
    case 3:
      return 'text-blue-600'
    case 4:
      return 'text-green-600'
    default:
      return 'text-muted-foreground'
  }
}

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

function validateConfirmPassword() {
  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  } else {
    errors.confirmPassword = ''
  }
}

function validateForm(): boolean {
  validateEmail()
  validatePassword()
  validateConfirmPassword()
  return !errors.email && !errors.password && !errors.confirmPassword
}

async function handleSubmit() {
  error.value = ''

  if (!validateForm()) {
    return
  }

  loading.value = true

  try {
    const response = await authApi.register({
      email: formData.email,
      password: formData.password,
      name: formData.name || undefined,
    })

    authStore.login(response.user, response.access_token)

    // Redirect to home
    router.push('/')
  } catch (err: any) {
    error.value = err.message || 'Failed to create account. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>
