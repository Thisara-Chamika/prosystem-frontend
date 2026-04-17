import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public route - no login required
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
      meta: { requiresAuth: false },
    },

    // Protected routes - login required
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/products',
      name: 'products',
      component: () => import('../views/products/ProductsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: () => import('../views/inventory/InventoryView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/pos',
      name: 'pos',
      component: () => import('../views/pos/POSView.vue'),
      meta: { requiresAuth: true },
    },

    // Catch all - redirect unknown URLs to home
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// THE ROUTE GUARD - runs before every single route change
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
