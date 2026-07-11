import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import AppLayout from '../components/layout/AppLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public route - no layout
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('../views/onboarding/OnboardingView.vue'),
      meta: { requiresAuth: true },
    },
    // Protected routes - with AppLayout
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          redirect: '/dashboard',
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('../views/DashboardView.vue'),
        },
        {
          path: 'products',
          name: 'products',
          component: () => import('../views/products/ProductsView.vue'),
        },
        {
          path: 'inventory',
          name: 'inventory',
          component: () => import('../views/inventory/InventoryView.vue'),
        },
        {
          path: 'pos',
          name: 'pos',
          component: () => import('../views/pos/POSView.vue'),
        },
        {
          path: 'customers',
          name: 'customers',
          component: () => import('../views/customers/CustomersView.vue'),
        },
        {
          path: 'staff',
          name: 'staff',
          component: () => import('../views/staff/StaffView.vue'),
        },
        {
          path: 'transactions',
          name: 'transactions',
          component: () => import('../views/transactions/TransactionsView.vue'),
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('../views/profile/ProfileView.vue'),
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('../views/settings/SettingsView.vue'),
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('../views/reports/ReportsView.vue'),
        },
        {
          path: 'variants',
          name: 'variants',
          component: () => import('../views/variants/VariantManagerView.vue'),
        },
        {
          path: 'customers/:customerId',
          name: 'customer-profile',
          component: () => import('../views/customers/profile/CustomerProfileView.vue'),
        },
      ],
    },

    // Catch all
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to, _from) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !authStore.token) {
    return { name: 'login' }
  }

  if (authStore.token && !authStore.user) {
    await authStore.fetchCurrentUser()
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  // Plugin route guard
  if (to.name === 'variants') {
    const hasPlugin = authStore.shop?.activePlugins?.includes('product-variants') ?? false
    if (!hasPlugin) {
      return { name: 'dashboard' }
    }
    const role = authStore.userRole
    if (role !== 'shop_owner' && role !== 'shop_manager') {
      return { name: 'dashboard' }
    }
  }
})

export default router
