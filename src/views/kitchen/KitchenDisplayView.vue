<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import kitchenService from '../../services/kitchenService'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const toast = useToast()

const queue = ref<any[]>([])
const loading = ref(false)
let pollHandle: number | undefined

async function loadQueue() {
  try {
    const res = await kitchenService.getQueue()
    if (res.success) queue.value = res.data
  } catch {
    // Deliberately silent on poll failures — a toast firing every 8-10s on a
    // flaky connection would be worse than just quietly retrying next tick.
  }
}

async function initialLoad() {
  loading.value = true
  await loadQueue()
  loading.value = false
}

function elapsedMinutes(sentAt: string | null): number | null {
  if (!sentAt) return null
  return Math.max(0, Math.floor((Date.now() - new Date(sentAt).getTime()) / 60000))
}

function elapsedClass(minutes: number | null): string {
  if (minutes === null) return ''
  if (minutes >= 20) return 'elapsed-critical'
  if (minutes >= 10) return 'elapsed-warning'
  return 'elapsed-ok'
}

async function updateStatus(orderItemId: string, newStatus: 'ready' | 'served') {
  try {
    const res = await kitchenService.updateItemStatus(orderItemId, newStatus)
    if (res.success) await loadQueue()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to update item',
      life: 3000,
    })
  }
}

onMounted(() => {
  initialLoad()
  pollHandle = window.setInterval(loadQueue, 9000)
})

onUnmounted(() => {
  if (pollHandle) clearInterval(pollHandle)
})
</script>

<template>
  <div class="kitchen-page">
    <Toast />

    <div class="page-header">
      <h1 class="page-title">👨‍🍳 Kitchen Display</h1>
      <span class="refresh-indicator"><i class="pi pi-sync pi-spin" /> Auto-refreshing</span>
    </div>

    <div class="skeleton-grid" v-if="loading">
      <div class="skeleton-card" v-for="i in 3" :key="i" />
    </div>

    <div class="empty-queue" v-else-if="queue.length === 0">
      <i class="pi pi-check-circle" />
      <p>Kitchen's clear — no active orders</p>
    </div>

    <div class="queue-grid" v-else>
      <div v-for="order in queue" :key="order.orderId" class="order-card">
        <div class="order-card-header">
          <span class="table-label">TABLE {{ order.tableNumber }}</span>
          <span class="elapsed-label" :class="elapsedClass(elapsedMinutes(order.oldestSentAt))">
            {{
              elapsedMinutes(order.oldestSentAt) === null
                ? '—'
                : `${elapsedMinutes(order.oldestSentAt)} min ago`
            }}
          </span>
        </div>

        <div class="order-card-items">
          <div v-for="item in order.items" :key="item.orderItemId" class="kitchen-item">
            <div class="kitchen-item-info">
              <span class="kitchen-item-name">{{ item.productName }} x{{ item.quantity }}</span>
              <span class="kitchen-item-special" v-if="item.specialRequests">
                "{{ item.specialRequests }}"
              </span>
            </div>
            <Button
              v-if="item.kitchenStatus === 'preparing'"
              label="Mark Ready"
              size="small"
              severity="warning"
              @click="updateStatus(item.orderItemId, 'ready')"
            />
            <Button
              v-else-if="item.kitchenStatus === 'ready'"
              label="Mark Served"
              size="small"
              severity="success"
              @click="updateStatus(item.orderItemId, 'served')"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kitchen-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
}

.refresh-indicator {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #64748b;
}

.skeleton-grid,
.queue-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.skeleton-card {
  height: 180px;
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

.empty-queue {
  text-align: center;
  padding: 4rem 2rem;
  color: #475569;
}

.empty-queue i {
  font-size: 2.5rem;
  color: #22c55e;
  display: block;
  margin-bottom: 0.75rem;
}

.order-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.order-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid #334155;
}

.table-label {
  font-size: 1rem;
  font-weight: 700;
  color: #f1f5f9;
}

.elapsed-label {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
}

.elapsed-ok {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}
.elapsed-warning {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}
.elapsed-critical {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
}

.order-card-items {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.kitchen-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem;
  background: #0f172a;
  border-radius: 8px;
  flex-wrap: wrap;
}

.kitchen-item-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 120px;
}

.kitchen-item-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #f1f5f9;
}

.kitchen-item-special {
  font-size: 0.75rem;
  color: #94a3b8;
  font-style: italic;
}
</style>
