<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import productService from '../services/productService'
import posService from '../services/posService'
import inventoryService from '../services/inventoryService'
import { useAuthStore } from '../stores/authStore'
import { useRouter } from 'vue-router'

import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'

const toast = useToast()
const authStore = useAuthStore()
const router = useRouter()

const isCashier = computed(() => authStore.userRole === 'cashier')

// ── Shared State ──────────────────────────────────
const loading = ref(true)

// ── Owner/Manager State ───────────────────────────
const totalProducts = ref(0)
const outOfStockCount = ref(0)
const lowStockCount = ref(0)
const todayTransactions = ref(0)
const todayRevenue = ref(0)
const totalTransactions = ref(0)
const recentTransactions = ref<any[]>([])

// ── Cashier State ─────────────────────────────────
const cashierTodayTransactions = ref(0)
const cashierTodayRevenue = ref(0)
const cashierAveragePerSale = ref(0)
const cashierRecentTransactions = ref<any[]>([])
const cashierError = ref(false)

// ── Today's date display ──────────────────────────
const todayDisplay = computed(() => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: authStore.shop?.timezone || 'UTC',
  }).format(new Date())
})

// ── Methods ───────────────────────────────────────
function getStatusSeverity(status: string) {
  switch (status) {
    case 'completed':
      return 'success'
    case 'cancelled':
      return 'danger'
    case 'refunded':
      return 'warn'
    case 'partial_refund':
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

async function loadOwnerDashboard() {
  loading.value = true
  try {
    const productsResponse = await productService.getProducts(1, 100)
    if (productsResponse.success) {
      const activeProducts = productsResponse.data.filter((p: any) => p.isActive)
      totalProducts.value = activeProducts.length

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

    const txnResponse = await posService.getTransactions(1, 50)
    if (txnResponse.success) {
      const transactions = txnResponse.data
      totalTransactions.value = transactions.length

      const today = new Date().toDateString()
      const todayTxns = transactions.filter(
        (t: any) => new Date(t.createdAt).toDateString() === today,
      )
      todayTransactions.value = todayTxns.length
      todayRevenue.value = todayTxns
        .filter((t: any) => t.status === 'completed')
        .reduce((sum: number, t: any) => sum + parseFloat(t.total), 0)

      recentTransactions.value = transactions.slice(0, 5)
    }
  } catch {
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

async function loadCashierDashboard() {
  loading.value = true
  cashierError.value = false
  try {
    const response = await posService.getCashierSummary()
    if (response.success) {
      cashierTodayTransactions.value = response.data.todayTransactions
      cashierTodayRevenue.value = response.data.todayRevenue
      cashierAveragePerSale.value = response.data.averagePerSale
      cashierRecentTransactions.value = response.data.recentTransactions
    }
  } catch {
    cashierError.value = true
  } finally {
    loading.value = false
  }
}

function loadDashboard() {
  if (isCashier.value) {
    loadCashierDashboard()
  } else {
    loadOwnerDashboard()
  }
}

onMounted(() => {
  loadDashboard()
})
</script>

<template>
  <div class="dashboard">
    <Toast />

    <!-- ═══════════════════════════════════════════ -->
    <!-- CASHIER DASHBOARD                           -->
    <!-- ═══════════════════════════════════════════ -->
    <template v-if="isCashier">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Welcome back, {{ authStore.userFullName }}! 👋</p>
          <p class="today-date">{{ todayDisplay }}</p>
        </div>
        <button class="refresh-btn" @click="loadCashierDashboard" :disabled="loading">
          <i :class="['pi', loading ? 'pi-spin pi-spinner' : 'pi-refresh']" />
          Refresh
        </button>
      </div>

      <!-- Loading -->
      <div class="loading-state" v-if="loading">
        <i class="pi pi-spin pi-spinner" />
        <p>Loading your summary...</p>
      </div>

      <template v-else-if="cashierError">
        <!-- Error state -->
        <div class="cashier-error">
          <i class="pi pi-exclamation-circle" />
          <p>Could not load your summary. Please refresh.</p>
          <Button
            label="Retry"
            icon="pi pi-refresh"
            severity="secondary"
            size="small"
            @click="loadCashierDashboard"
          />
        </div>
      </template>

      <template v-else>
        <!-- Shift Stats -->
        <div class="section-label">My Shift Today</div>

        <div v-if="cashierTodayTransactions === 0" class="no-sales-state">
          <i class="pi pi-shopping-cart" />
          <p>No sales yet today.</p>
          <span>Head to POS to start selling! 🛒</span>
          <Button
            label="Go to POS"
            icon="pi pi-shopping-cart"
            class="mt-1"
            @click="router.push('/pos')"
          />
        </div>

        <div class="stats-grid" v-else>
          <div class="stat-card purple">
            <div class="stat-icon">
              <i class="pi pi-receipt" />
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ cashierTodayTransactions }}</span>
              <span class="stat-label">My Sales</span>
            </div>
          </div>

          <div class="stat-card blue">
            <div class="stat-icon">
              <i class="pi pi-dollar" />
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ authStore.formatCurrency(cashierTodayRevenue) }}</span>
              <span class="stat-label">My Revenue</span>
            </div>
          </div>

          <div class="stat-card teal">
            <div class="stat-icon">
              <i class="pi pi-chart-bar" />
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ authStore.formatCurrency(cashierAveragePerSale) }}</span>
              <span class="stat-label">Avg Per Sale</span>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="section-label">Quick Actions</div>
        <div class="quick-actions">
          <div class="action-card" @click="router.push('/pos')">
            <i class="pi pi-shopping-cart action-icon green" />
            <div>
              <span class="action-title">New Sale</span>
              <span class="action-desc">Go to POS terminal</span>
            </div>
          </div>
          <div class="action-card" @click="router.push('/pos?return=true')">
            <i class="pi pi-replay action-icon red" />
            <div>
              <span class="action-title">Process Return</span>
              <span class="action-desc">Look up transaction</span>
            </div>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="section-label">My Recent Transactions</div>
        <div class="table-card">
          <DataTable :value="cashierRecentTransactions" stripedRows tableStyle="min-width: 30rem">
            <template #empty>
              <div class="empty-state">
                <i class="pi pi-receipt" />
                <p>No transactions yet today</p>
              </div>
            </template>

            <Column field="transactionNumber" header="Transaction #" />

            <Column header="Time" style="width: 18%">
              <template #body="{ data }">
                {{ authStore.formatDate(data.createdAt) }}
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

            <Column header="Total" style="width: 15%">
              <template #body="{ data }">
                <span class="amount">
                  {{ authStore.formatCurrency(data.total) }}
                </span>
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
    </template>

    <!-- ═══════════════════════════════════════════ -->
    <!-- OWNER / MANAGER DASHBOARD (unchanged)      -->
    <!-- ═══════════════════════════════════════════ -->
    <template v-else>
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Welcome back, {{ authStore.userFullName }}!</p>
        </div>
        <button class="refresh-btn" @click="loadOwnerDashboard" :disabled="loading">
          <i :class="['pi', loading ? 'pi-spin pi-spinner' : 'pi-refresh']" />
          Refresh
        </button>
      </div>

      <div class="loading-state" v-if="loading">
        <i class="pi pi-spin pi-spinner" />
        <p>Loading dashboard...</p>
      </div>

      <template v-else>
        <div class="section-label">Today's Overview</div>
        <div class="stats-grid">
          <div class="stat-card blue">
            <div class="stat-icon"><i class="pi pi-dollar" /></div>
            <div class="stat-info">
              <span class="stat-value">{{ authStore.formatCurrency(todayRevenue) }}</span>
              <span class="stat-label">Today's Revenue</span>
            </div>
          </div>
          <div class="stat-card purple">
            <div class="stat-icon"><i class="pi pi-receipt" /></div>
            <div class="stat-info">
              <span class="stat-value">{{ todayTransactions }}</span>
              <span class="stat-label">Today's Transactions</span>
            </div>
          </div>
          <div class="stat-card teal">
            <div class="stat-icon"><i class="pi pi-shopping-cart" /></div>
            <div class="stat-info">
              <span class="stat-value">{{ totalTransactions }}</span>
              <span class="stat-label">Total Transactions</span>
            </div>
          </div>
        </div>

        <div class="section-label">Inventory Status</div>
        <div class="stats-grid">
          <div class="stat-card green">
            <div class="stat-icon"><i class="pi pi-box" /></div>
            <div class="stat-info">
              <span class="stat-value">{{ totalProducts }}</span>
              <span class="stat-label">Total Products</span>
            </div>
          </div>
          <div class="stat-card orange">
            <div class="stat-icon"><i class="pi pi-exclamation-triangle" /></div>
            <div class="stat-info">
              <span class="stat-value">{{ lowStockCount }}</span>
              <span class="stat-label">Low Stock Items</span>
            </div>
          </div>
          <div class="stat-card red">
            <div class="stat-icon"><i class="pi pi-times-circle" /></div>
            <div class="stat-info">
              <span class="stat-value">{{ outOfStockCount }}</span>
              <span class="stat-label">Out of Stock</span>
            </div>
          </div>
        </div>

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
                {{ authStore.formatDate(data.createdAt) }}
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
                <span class="amount">
                  {{ authStore.formatCurrency(parseFloat(data.total)) }}
                </span>
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
  align-items: flex-start;
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

.today-date {
  color: #64748b;
  font-size: 0.8rem;
  margin: 0.15rem 0 0;
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

.cashier-error {
  text-align: center;
  padding: 2rem;
  color: #64748b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.cashier-error i {
  font-size: 2rem;
  color: #f59e0b;
}

.no-sales-state {
  text-align: center;
  padding: 2rem;
  color: #475569;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.no-sales-state i {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.no-sales-state p {
  font-weight: 600;
  color: #64748b;
  margin: 0;
}

.no-sales-state span {
  font-size: 0.875rem;
}

.mt-1 {
  margin-top: 0.5rem;
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

/* ── Quick Actions ── */
.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.action-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-card:hover {
  border-color: #3b82f6;
  background: #1e3a5f;
}

.action-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.action-icon.green {
  color: #22c55e;
}
.action-icon.red {
  color: #ef4444;
}

.action-title {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: #f1f5f9;
}

.action-desc {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.15rem;
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
