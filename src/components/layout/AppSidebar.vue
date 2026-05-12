<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const menuItems = computed(() => {
  const items = [
    { label: 'Dashboard', icon: 'pi pi-home', route: '/dashboard' },
    { label: 'Customers', icon: 'pi pi-users', route: '/customers' },
    { label: 'POS', icon: 'pi pi-shopping-cart', route: '/pos' },
    { label: 'Products', icon: 'pi pi-box', route: '/products' },
    { label: 'Inventory', icon: 'pi pi-warehouse', route: '/inventory' },
  ]

  if (authStore.userRole === 'shop_owner' || authStore.userRole === 'shop_manager') {
    items.push({ label: 'Transactions', icon: 'pi pi-receipt', route: '/transactions' })
  }

  if (authStore.userRole === 'shop_owner') {
    items.push({ label: 'Staff', icon: 'pi pi-id-card', route: '/staff' })
  }

  return items
})

function navigate(path: string) {
  router.push(path)
}

function isActive(path: string) {
  return route.path === path
}
</script>

<template>
  <div class="sidebar">
    <nav class="sidebar-nav">
      <div
        v-for="item in menuItems"
        :key="item.route"
        class="nav-item"
        :class="{ active: isActive(item.route) }"
        @click="navigate(item.route)"
      >
        <i :class="item.icon" />
        <span>{{ item.label }}</span>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.sidebar {
  width: 220px;
  background: #1e293b;
  border-right: 1px solid #334155;
  position: fixed;
  top: 60px;
  left: 0;
  bottom: 0;
  z-index: 99;
  padding: 1rem 0;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0 0.75rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  color: #94a3b8;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.nav-item:hover {
  background: #334155;
  color: #f1f5f9;
}

.nav-item.active {
  background: #3b82f6;
  color: #ffffff;
}

.nav-item i {
  font-size: 1rem;
  width: 20px;
}
</style>
