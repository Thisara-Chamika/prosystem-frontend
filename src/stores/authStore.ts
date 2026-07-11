import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '../types'
import authService from '../services/authService'
import router from '../router'
import shopService from '../services/shopService'

export const useAuthStore = defineStore('auth', () => {
  // ─── STATE ───────────────────────────────────────────
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const shop = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loyaltySettings = ref<any>(null)

  // ─── GETTERS ──────────────────────────────────────────
  const isAuthenticated = computed(() => !!token.value && !!user.value)

  const userFullName = computed(() =>
    user.value ? `${user.value.firstName} ${user.value.lastName}` : '',
  )

  const userRole = computed(() => user.value?.role ?? null)

  const formatCurrency = computed(() => {
    const currency = shop.value?.currency || 'USD'
    return (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
      }).format(amount)
    }
  })

  const formatDate = computed(() => {
    const timezone = shop.value?.timezone || 'UTC'
    return (dateStr: string) => {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
      }).format(new Date(dateStr))
    }
  })

  // ─── ACTIONS ──────────────────────────────────────────
  async function login(email: string, password: string) {
    loading.value = true
    error.value = null

    try {
      const response = await authService.login({ email, password })

      if (response.success) {
        token.value = response.data.token
        user.value = response.data.user
        localStorage.setItem('token', response.data.token)

        // Load shop data after login
        const shopResponse = await shopService.getShop()
        if (shopResponse.success) {
          shop.value = shopResponse.data
          await loadLoyaltySettings()
        }

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
        if (shopResponse.success) {
          shop.value = shopResponse.data
          if (!shopResponse.data.isOnboarded) {
            router.push('/onboarding')
          } else {
            router.push('/dashboard')
          }
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

  async function fetchCurrentUser() {
    if (!token.value) return

    try {
      const response = await authService.getMe()
      if (response.success) {
        user.value = response.data

        // Also load shop data
        const shopResponse = await shopService.getShop()
        if (shopResponse.success) {
          shop.value = shopResponse.data
          await loadLoyaltySettings()
        }
      }
    } catch {
      logout()
    }
  }

  async function loadLoyaltySettings() {
    try {
      const { default: loyaltyService } = await import('../services/loyaltyService')
      const response = await loyaltyService.getLoyaltySettings()
      if (response.success) loyaltySettings.value = response.data
    } catch {
      // silent fail
    }
  }

  function logout() {
    user.value = null
    token.value = null
    shop.value = null
    authService.logout()
    router.push('/login')
  }

  function hasPlugin(pluginId: string): boolean {
    return shop.value?.activePlugins?.includes(pluginId) ?? false
  }

  function isBusinessType(type: string): boolean {
    return shop.value?.businessType === type
  }

  // ─── RETURN ───────────────────────────────────────────
  return {
    user,
    token,
    shop,
    loading,
    error,
    isAuthenticated,
    userFullName,
    userRole,
    formatCurrency,
    formatDate,
    hasPlugin,
    isBusinessType,
    login,
    register,
    fetchCurrentUser,
    logout,
    loyaltySettings,
    loadLoyaltySettings,
  }
})
