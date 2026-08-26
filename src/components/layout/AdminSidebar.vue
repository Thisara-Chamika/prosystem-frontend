<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const menuItems = [
  { label: 'Overview', icon: 'pi pi-chart-bar', path: '/admin/dashboard' },
  { label: 'Shops', icon: 'pi pi-building', path: '/admin/shops' },
  { label: 'Support Tickets', icon: 'pi pi-ticket', path: '/admin/support' },
]

function navigate(path: string) {
  router.push(path)
}

function isActive(path: string) {
  return route.path.startsWith(path)
}
</script>

<template>
  <div class="admin-sidebar">
    <div class="admin-brand">
      <i class="pi pi-shield" />
      <span>ProSystem Admin</span>
    </div>

    <nav class="admin-nav">
      <div
        v-for="item in menuItems"
        :key="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        @click="navigate(item.path)"
      >
        <i :class="item.icon" />
        <span>{{ item.label }}</span>
      </div>
    </nav>

    <div class="admin-logout" @click="authStore.logout()">
      <i class="pi pi-sign-out" />
      <span>Logout</span>
    </div>
  </div>
</template>

<style scoped>
.admin-sidebar {
  width: 220px;
  background: #1e293b;
  border-right: 1px solid #334155;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 99;
  display: flex;
  flex-direction: column;
  padding: 1.25rem 0;
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 1.25rem 1.25rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid #334155;
  color: #f1f5f9;
  font-weight: 700;
  font-size: 0.95rem;
}

.admin-brand .pi {
  color: #3b82f6;
  font-size: 1.1rem;
}

.admin-nav {
  flex: 1;
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

.admin-logout {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  margin: 0 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  color: #ef4444;
  font-size: 0.9rem;
}

.admin-logout:hover {
  background: rgba(239, 68, 68, 0.1);
}
</style>
