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
})

export default router
