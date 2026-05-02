import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '../types'
import authService from '../services/authService'
import router from '../router'
import shopService from '../services/shopService'

export const useAuthStore = defineStore('auth', () => {
  // STATE
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  // GETTERS - computed values derived from state
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userFullName = computed(() =>
    user.value ? `${user.value.firstName} ${user.value.lastName}` : '',
  )
  const userRole = computed(() => user.value?.role ?? null)

  // ACTIONS
  async function login(email: string, password: string) {
    loading.value = true
    error.value = null

    try {
      const response = await authService.login({ email, password })

      if (response.success) {
        // Save token to localStorage AND store
        token.value = response.data.token
        user.value = response.data.user
        localStorage.setItem('token', response.data.token)

        // Redirect to dashboard after login
        router.push('/')
      } else {
        error.value = response.message
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed. Please try again.'
    } finally {
      loading.value = false
    }
  }

  async function fetchCurrentUser() {
    if (!token.value) return

    try {
      const response = await authService.getMe()
      if (response.success) {
        user.value = response.data
      }
    } catch {
      // Token invalid - clear everything
      logout()
    }
  }

  function logout() {
    user.value = null
    token.value = null
    authService.logout()
    router.push('/login')
  }

  return {
    // State
    user,
    token,
    loading,
    error,
    // Getters
    isAuthenticated,
    userFullName,
    userRole,
    // Actions
    login,
    register,
    fetchCurrentUser,
    logout,
  }

  async function register(data: {
    shopName: string
    shopSlug: string
    firstName: string
    lastName: string
    email: string
    password: string
    currency: string
    timezone: string
  }) {
    loading.value = true
  error.value = null
  try {
    const response = await authService.register(data)
    if (response.success) {
      token.value = response.data.token
      user.value = response.data.user
      localStorage.setItem('token', response.data.token)
      const shopResponse = await shopService.getShop()
      if (shopResponse.success && !shopResponse.data.isOnboarded) {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }
    } else {
      error.value = response.message
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Registration failed.'
  } finally {
    loading.value = false
  }
}
})
