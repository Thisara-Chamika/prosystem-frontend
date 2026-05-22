<script setup lang="ts">
import { useAuthStore } from '../../stores/authStore'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'

const authStore = useAuthStore()
const router = useRouter()
</script>

<template>
  <div class="topbar">
    <!-- Left side - Brand -->
    <div class="topbar-left">
      <i class="pi pi-shopping-cart brand-icon" />
      <span class="brand-name">ProSystem</span>
    </div>

    <!-- Right side - User info + Logout -->
    <div class="topbar-right">
      <div class="user-info" @click="router.push('/profile')" title="My Profile">
        <i class="pi pi-user" />
        <span class="user-name">{{ authStore.userFullName }}</span>
        <span class="user-role">{{ authStore.userRole }}</span>
      </div>
      <Button
        icon="pi pi-sign-out"
        label="Logout"
        severity="secondary"
        size="small"
        @click="authStore.logout()"
      />
    </div>
  </div>
</template>

<style scoped>
.topbar {
  height: 60px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon {
  font-size: 1.25rem;
  color: #3b82f6;
}

.brand-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f1f5f9;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #94a3b8;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.user-info:hover {
  background: #334155;
  color: #f1f5f9;
}

.user-name {
  color: #f1f5f9;
  font-weight: 500;
}

.user-role {
  background: #334155;
  color: #94a3b8;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  text-transform: capitalize;
}
</style>
