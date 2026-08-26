import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import AppLayout from '../components/layout/AppLayout.vue'
import AdminLayout from '../components/layout/AdminLayout.vue'

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
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/auth/ForgotPasswordView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('../views/auth/ResetPasswordView.vue'),
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
        {
          path: 'tables',
          name: 'tables',
          component: () => import('../views/tables/TablesView.vue'),
        },
        {
          path: 'tables/:tableId/order',
          name: 'table-order',
          component: () => import('../views/tables/OrderBuildingView.vue'),
        },
        {
          path: 'kitchen',
          name: 'kitchen',
          component: () => import('../views/kitchen/KitchenDisplayView.vue'),
        },
      ],
    },

    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/admin/dashboard' },
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: () => import('../views/admin/AdminDashboardView.vue'),
        },
        {
          path: 'shops',
          name: 'admin-shops',
          component: () => import('../views/admin/AdminShopsView.vue'),
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
    return { name: authStore.userRole === 'super_admin' ? 'admin-dashboard' : 'dashboard' }
  }

  // Redirect based on role and route
  if (to.name === 'dashboard' && authStore.userRole === 'super_admin') {
    return { name: 'admin-dashboard' }
  }

  if (to.path.startsWith('/admin') && authStore.userRole !== 'super_admin') {
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

  if (to.name === 'tables' || to.name === 'table-order') {
    const hasPlugin = authStore.shop?.activePlugins?.includes('table-management') ?? false
    if (!hasPlugin) {
      return { name: 'dashboard' }
    }
    // No role check here, deliberately — all roles can use table management
  }

  if (to.name === 'kitchen') {
    const hasPlugin = authStore.shop?.activePlugins?.includes('kitchen-display') ?? false
    if (!hasPlugin) {
      return { name: 'dashboard' }
    }
    // No role check — same reasoning as table-management
  }
})

export default router
