<script setup lang="ts">
import { ref, onMounted } from 'vue'
import adminService from '../../services/adminService'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const toast = useToast()
const loading = ref(false)
const metrics = ref<any>(null)

async function loadMetrics() {
  loading.value = true
  try {
    const res = await adminService.getMetrics()
    if (res.success) metrics.value = res.data
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load platform metrics',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadMetrics()
})
</script>

<template>
  <div class="overview-page">
    <Toast />
    <h1 class="page-title">Platform Overview</h1>

    <div class="skeleton-grid" v-if="loading">
      <div class="skeleton-card" v-for="i in 4" :key="i" />
    </div>

    <div class="stat-grid" v-else-if="metrics">
      <div class="stat-card">
        <span class="stat-value">{{ metrics.totalShops.toLocaleString() }}</span>
        <span class="stat-label">Total Shops</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ metrics.totalUsers.toLocaleString() }}</span>
        <span class="stat-label">Total Users</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ metrics.totalCustomers.toLocaleString() }}</span>
        <span class="stat-label">Customers</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ metrics.totalTransactions.toLocaleString() }}</span>
        <span class="stat-label">Transactions</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overview-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
}

.skeleton-grid,
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.skeleton-card {
  height: 100px;
  background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 12px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.stat-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #f1f5f9;
}

.stat-label {
  font-size: 0.85rem;
  color: #94a3b8;
}
</style>
