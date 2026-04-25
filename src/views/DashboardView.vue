<script setup lang="ts">
import { ref, onMounted } from 'vue'
import productService from '../services/productService'
import posService from '../services/posService'
import inventoryService from '../services/inventoryService'
import { useAuthStore } from '../stores/authStore'

import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'

const toast = useToast()
const authStore = useAuthStore()

// ── State ─────────────────────────────────────────
const loading = ref(true)

// Summary stats
const totalProducts = ref(0)
const outOfStockCount = ref(0)
const lowStockCount = ref(0)
const todayTransactions = ref(0)
const todayRevenue = ref(0)
const totalTransactions = ref(0)

// Recent transactions
const recentTransactions = ref<any[]>([])

// ── Methods ───────────────────────────────────────
function getStatusSeverity(status: string) {
  switch (status) {
    case 'completed':
      return 'success'
    case 'cancelled':
      return 'danger'
    case 'refunded':
      return 'warn'
    default:
      return 'secondary'
  }
}

function getPaymentIcon(method: string) {
  switch (method) {
    case 'cash':
      return 'pi pi-wallet'
    case 'card':
      return 'pi pi-credit-card'
    case 'online':
      return 'pi pi-globe'
    default:
      return 'pi pi-arrows-h'
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadDashboard() {
  loading.value = true
  try {
    // Load products
    const productsResponse = await productService.getProducts(1, 100)
    if (productsResponse.success) {
      const activeProducts = productsResponse.data.filter((p: any) => p.isActive)
      totalProducts.value = activeProducts.length

      // Load inventory for each product to get stock status
      const withInventory = await Promise.all(
        activeProducts.map(async (product: any) => {
          try {
            const invResponse = await inventoryService.getInventory(product.productId)
            return invResponse.success ? invResponse.data : { ...product, inventory: null }
          } catch {
            return { ...product, inventory: null }
          }
        }),
      )

      outOfStockCount.value = withInventory.filter(
        (p: any) => (p.inventory?.quantity ?? 0) === 0,
      ).length

      lowStockCount.value = withInventory.filter((p: any) => {
        const qty = p.inventory?.quantity ?? 0
        return qty > 0 && qty <= 10
      }).length
    }

    // Load transactions
    const txnResponse = await posService.getTransactions(1, 50)
    if (txnResponse.success) {
      const transactions = txnResponse.data
      totalTransactions.value = transactions.length

      // Filter today's transactions
      const today = new Date().toDateString()
      const todayTxns = transactions.filter(
        (t: any) => new Date(t.createdAt).toDateString() === today,
      )
      todayTransactions.value = todayTxns.length
      todayRevenue.value = todayTxns
        .filter((t: any) => t.status === 'completed')
        .reduce((sum: number, t: any) => sum + parseFloat(t.total), 0)

      // Recent 5 transactions
      recentTransactions.value = transactions
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load dashboard data',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDashboard()
})
</script>

<template>
  <div class="dashboard">
    <Toast />

    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Welcome back, {{ authStore.userFullName }}!</p>
      </div>
      <button class="refresh-btn" @click="loadDashboard" :disabled="loading">
        <i :class="['pi', loading ? 'pi-spin pi-spinner' : 'pi-refresh']" />
        Refresh
      </button>
    </div>

    <!-- Loading State -->
    <div class="loading-state" v-if="loading">
      <i class="pi pi-spin pi-spinner" />
      <p>Loading dashboard...</p>
    </div>

    <template v-else>
      <!-- Summary Cards Row 1 — Sales -->
      <div class="section-label">Today's Overview</div>
      <div class="stats-grid">
        <div class="stat-card blue">
          <div class="stat-icon">
            <i class="pi pi-dollar" />
          </div>
          <div class="stat-info">
            <span class="stat-value">${{ todayRevenue.toFixed(2) }}</span>
            <span class="stat-label">Today's Revenue</span>
          </div>
        </div>

        <div class="stat-card purple">
          <div class="stat-icon">
            <i class="pi pi-receipt" />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ todayTransactions }}</span>
            <span class="stat-label">Today's Transactions</span>
          </div>
        </div>

        <div class="stat-card teal">
          <div class="stat-icon">
            <i class="pi pi-shopping-cart" />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalTransactions }}</span>
            <span class="stat-label">Total Transactions</span>
          </div>
        </div>
      </div>

      <!-- Summary Cards Row 2 — Inventory -->
      <div class="section-label">Inventory Status</div>
      <div class="stats-grid">
        <div class="stat-card green">
          <div class="stat-icon">
            <i class="pi pi-box" />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalProducts }}</span>
            <span class="stat-label">Total Products</span>
          </div>
        </div>

        <div class="stat-card orange">
          <div class="stat-icon">
            <i class="pi pi-exclamation-triangle" />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ lowStockCount }}</span>
            <span class="stat-label">Low Stock Items</span>
          </div>
        </div>

        <div class="stat-card red">
          <div class="stat-icon">
            <i class="pi pi-times-circle" />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ outOfStockCount }}</span>
            <span class="stat-label">Out of Stock</span>
          </div>
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="section-label">Recent Transactions</div>
      <div class="table-card">
        <DataTable :value="recentTransactions" stripedRows tableStyle="min-width: 40rem">
          <template #empty>
            <div class="empty-state">
              <i class="pi pi-receipt" />
              <p>No transactions yet</p>
            </div>
          </template>

          <Column field="transactionNumber" header="Transaction #" />

          <Column header="Date" style="width: 20%">
            <template #body="{ data }">
              {{ formatDate(data.createdAt) }}
            </template>
          </Column>

          <Column header="Payment" style="width: 12%">
            <template #body="{ data }">
              <span class="payment-method">
                <i :class="getPaymentIcon(data.paymentMethod)" />
                {{ data.paymentMethod }}
              </span>
            </template>
          </Column>

          <Column header="Total" style="width: 12%">
            <template #body="{ data }">
              <span class="amount"> ${{ parseFloat(data.total).toFixed(2) }} </span>
            </template>
          </Column>

          <Column header="Status" style="width: 12%">
            <template #body="{ data }">
              <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
            </template>
          </Column>
        </DataTable>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.page-subtitle {
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0.25rem 0 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.refresh-btn:hover {
  border-color: #3b82f6;
  color: #f1f5f9;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.section-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.5rem;
}

.loading-state {
  text-align: center;
  padding: 4rem;
  color: #475569;
}

.loading-state i {
  font-size: 2rem;
  margin-bottom: 1rem;
  display: block;
}

/* ── Stat Cards ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-card {
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid transparent;
}

.stat-card.blue {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.2);
}
.stat-card.purple {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.2);
}
.stat-card.teal {
  background: rgba(20, 184, 166, 0.1);
  border-color: rgba(20, 184, 166, 0.2);
}
.stat-card.green {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.2);
}
.stat-card.orange {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.2);
}
.stat-card.red {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.blue .stat-icon {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}
.purple .stat-icon {
  background: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
}
.teal .stat-icon {
  background: rgba(20, 184, 166, 0.2);
  color: #14b8a6;
}
.green .stat-icon {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}
.orange .stat-icon {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}
.red .stat-icon {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1;
}

.stat-label {
  font-size: 0.8rem;
  color: #94a3b8;
}

/* ── Table ── */
.table-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #475569;
}

.empty-state i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  display: block;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #94a3b8;
  font-size: 0.875rem;
  text-transform: capitalize;
}

.amount {
  font-weight: 600;
  color: #22c55e;
}
</style>
