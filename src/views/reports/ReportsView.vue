<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useRouter } from 'vue-router'
import reportService from '../../services/reportService'

import Button from 'primevue/button'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import RevenueTrendsTab from './tabs/RevenueTrendsTab.vue'
import CustomerAnalyticsTab from './tabs/CustomerAnalyticsTab.vue'
import InventoryValuationTab from './tabs/InventoryValuationTab.vue'
import ReturnsAnalysisTab from './tabs/ReturnsAnalysisTab.vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'

import { Line, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()

// ── Role Guard ────────────────────────────────────
if (authStore.userRole === 'cashier') {
  router.push('/dashboard')
}

// ── State ─────────────────────────────────────────
const loading = ref(false)
const activeTab = ref('overview')

const selectedPeriod = ref('today')
const fromDate = ref('')
const toDate = ref('')

const periodOptions = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Custom', value: 'custom' },
]

const summary = ref<any>(null)
const dailySales = ref<any[]>([])
const topProducts = ref<any[]>([])
const paymentMethods = ref<any[]>([])
const cashierSummary = ref<any[]>([])

// ── Chart colors ──────────────────────────────────
const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6']

// ── Chart data computed ───────────────────────────
const lineChartData = computed(() => ({
  labels: dailySales.value.map((d) => formatChartDate(d.date)),
  datasets: [
    {
      label: 'Revenue',
      data: dailySales.value.map((d) => d.revenue),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      pointBackgroundColor: '#3b82f6',
      pointRadius: 4,
      fill: true,
      tension: 0.4,
    },
  ],
}))

const lineChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: any) => authStore.formatCurrency(context.raw),
      },
    },
  },
  scales: {
    x: {
      grid: { color: '#334155' },
      ticks: { color: '#94a3b8' },
    },
    y: {
      grid: { color: '#334155' },
      ticks: {
        color: '#94a3b8',
        callback: (value: any) => authStore.formatCurrency(value),
      },
    },
  },
}))

const doughnutChartData = computed(() => ({
  labels: paymentMethods.value.map((p) => p.method.toUpperCase()),
  datasets: [
    {
      data: paymentMethods.value.map((p) => p.total),
      backgroundColor: PIE_COLORS,
      borderWidth: 0,
    },
  ],
}))

const doughnutChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: '#94a3b8', padding: 16 },
    },
    tooltip: {
      callbacks: {
        label: (context: any) => `${context.label}: ${authStore.formatCurrency(context.raw)}`,
      },
    },
  },
}))

// ── Date helpers ──────────────────────────────────
function getDateRange(): { fromDate: string; toDate: string } {
  const today = new Date()
  const tz = authStore.shop?.timezone || 'UTC'

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-CA', { timeZone: tz })
  }

  switch (selectedPeriod.value) {
    case 'today': {
      const todayStr = formatDate(today)
      return { fromDate: todayStr, toDate: todayStr }
    }
    case 'week': {
      const monday = new Date(today)
      monday.setDate(today.getDate() - today.getDay() + 1)
      return { fromDate: formatDate(monday), toDate: formatDate(today) }
    }
    case 'month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      return { fromDate: formatDate(firstDay), toDate: formatDate(today) }
    }
    case 'custom':
      return { fromDate: fromDate.value, toDate: toDate.value }
    default:
      return { fromDate: formatDate(today), toDate: formatDate(today) }
  }
}

function formatChartDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: authStore.shop?.timezone || 'UTC',
  }).format(new Date(dateStr))
}

// ── Load reports ──────────────────────────────────
async function loadReports() {
  if (selectedPeriod.value === 'custom' && (!fromDate.value || !toDate.value)) {
    toast.add({
      severity: 'warn',
      summary: 'Required',
      detail: 'Please select both from and to dates',
      life: 3000,
    })
    return
  }

  loading.value = true
  const params = getDateRange()

  try {
    const [summaryRes, dailyRes, productsRes, paymentRes, cashierRes] = await Promise.all([
      reportService.getSummary(params),
      reportService.getDailySales(params),
      reportService.getTopProducts({ ...params, limit: 10 }),
      reportService.getPaymentMethods(params),
      reportService.getCashierSummary(params),
    ])

    if (summaryRes.success) summary.value = summaryRes.data
    if (dailyRes.success) dailySales.value = dailyRes.data
    if (productsRes.success) topProducts.value = productsRes.data
    if (paymentRes.success) paymentMethods.value = paymentRes.data
    if (cashierRes.success) cashierSummary.value = cashierRes.data
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load reports',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

function onPeriodChange() {
  if (selectedPeriod.value !== 'custom') {
    loadReports()
  }
}

function getChangeIcon(change: number) {
  if (change > 0) return 'pi pi-arrow-up'
  if (change < 0) return 'pi pi-arrow-down'
  return 'pi pi-minus'
}

function getChangeClass(change: number) {
  if (change > 0) return 'change-up'
  if (change < 0) return 'change-down'
  return 'change-neutral'
}

function exportCSV() {
  if (dailySales.value.length === 0) {
    toast.add({ severity: 'warn', summary: 'No Data', detail: 'No data to export', life: 3000 })
    return
  }
  const headers = ['Date', 'Revenue', 'Transactions']
  const rows = dailySales.value.map((d) => [d.date, d.revenue, d.transactions])
  const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `prosystem-report-${getDateRange().fromDate}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportPDF() {
  window.print()
}

onMounted(() => {
  loadReports()
})
</script>

<template>
  <div class="reports-page">
    <Toast />

    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Reports</h1>
        <p class="page-subtitle">Analyse your shop performance</p>
      </div>
      <div class="export-buttons" v-if="activeTab === 'overview'">
        <Button
          label="Export CSV"
          icon="pi pi-download"
          severity="secondary"
          size="small"
          @click="exportCSV"
        />
        <Button
          label="Export PDF"
          icon="pi pi-print"
          severity="secondary"
          size="small"
          @click="exportPDF"
        />
      </div>
    </div>

    <Tabs v-model:value="activeTab" lazy>
      <TabList>
        <Tab value="overview">Overview</Tab>
        <Tab value="revenue-trends">Revenue Trends</Tab>
        <Tab value="customers">Customers</Tab>
        <Tab value="inventory">Inventory</Tab>
        <Tab value="returns">Returns</Tab>
      </TabList>

      <TabPanels>
        <!-- ══════════════ OVERVIEW (existing, unchanged) ══════════════ -->
        <TabPanel value="overview">
          <!-- Period Selector -->
          <div class="period-selector">
            <Select
              v-model="selectedPeriod"
              :options="periodOptions"
              optionLabel="label"
              optionValue="value"
              class="period-select"
              @change="onPeriodChange"
            />
            <template v-if="selectedPeriod === 'custom'">
              <input type="date" v-model="fromDate" class="date-input" />
              <span class="date-sep">to</span>
              <input type="date" v-model="toDate" class="date-input" />
              <Button label="Apply" icon="pi pi-check" size="small" @click="loadReports" />
            </template>
            <Button
              icon="pi pi-refresh"
              severity="secondary"
              size="small"
              :loading="loading"
              @click="loadReports"
            />
          </div>

          <!-- Loading skeleton -->
          <div class="skeleton-grid" v-if="loading">
            <div class="skeleton-card" v-for="i in 5" :key="i" />
          </div>

          <template v-else>
            <!-- ── Section 1: Summary Cards ── -->
            <div class="summary-grid">
              <div class="summary-card blue">
                <div class="summary-icon"><i class="pi pi-dollar" /></div>
                <div class="summary-info">
                  <span class="summary-value">{{
                    authStore.formatCurrency(summary?.todayRevenue ?? 0)
                  }}</span>
                  <span class="summary-label">Total Revenue</span>
                  <div class="summary-change" :class="getChangeClass(summary?.revenueChange ?? 0)">
                    <i :class="getChangeIcon(summary?.revenueChange ?? 0)" />
                    <span>{{ Math.abs(summary?.revenueChange ?? 0).toFixed(1) }}%</span>
                  </div>
                </div>
              </div>

              <div class="summary-card purple">
                <div class="summary-icon"><i class="pi pi-receipt" /></div>
                <div class="summary-info">
                  <span class="summary-value">{{ summary?.todayTransactions ?? 0 }}</span>
                  <span class="summary-label">Transactions</span>
                  <div
                    class="summary-change"
                    :class="getChangeClass(summary?.transactionChange ?? 0)"
                  >
                    <i :class="getChangeIcon(summary?.transactionChange ?? 0)" />
                    <span>{{ Math.abs(summary?.transactionChange ?? 0).toFixed(1) }}%</span>
                  </div>
                </div>
              </div>

              <div class="summary-card teal">
                <div class="summary-icon"><i class="pi pi-chart-bar" /></div>
                <div class="summary-info">
                  <span class="summary-value">{{
                    authStore.formatCurrency(summary?.averageTicket ?? 0)
                  }}</span>
                  <span class="summary-label">Avg Ticket</span>
                </div>
              </div>

              <div class="summary-card green">
                <div class="summary-icon"><i class="pi pi-percentage" /></div>
                <div class="summary-info">
                  <span class="summary-value">{{
                    authStore.formatCurrency(summary?.totalTax ?? 0)
                  }}</span>
                  <span class="summary-label">Total Tax</span>
                </div>
              </div>

              <div class="summary-card orange">
                <div class="summary-icon"><i class="pi pi-tag" /></div>
                <div class="summary-info">
                  <span class="summary-value">{{
                    authStore.formatCurrency(summary?.totalDiscount ?? 0)
                  }}</span>
                  <span class="summary-label">Total Discount</span>
                </div>
              </div>
            </div>

            <!-- ── Section 2: Revenue Chart ── -->
            <div class="chart-card">
              <h3 class="card-title">Revenue Over Time</h3>
              <div class="empty-chart" v-if="dailySales.length === 0">
                <i class="pi pi-chart-line" />
                <p>No sales data for this period</p>
              </div>
              <div class="chart-wrapper" v-else style="height: 250px">
                <Line :data="lineChartData" :options="lineChartOptions" />
              </div>
            </div>

            <!-- ── Section 3: Two columns ── -->
            <div class="two-col">
              <!-- Top Products -->
              <div class="chart-card">
                <h3 class="card-title">Top Products</h3>
                <div class="empty-chart" v-if="topProducts.length === 0">
                  <i class="pi pi-box" />
                  <p>No products sold in this period</p>
                </div>
                <DataTable v-else :value="topProducts" stripedRows tableStyle="min-width: 100%">
                  <Column field="productName" header="Product" />
                  <Column field="quantitySold" header="Sold" style="width: 15%" />
                  <Column header="Revenue" style="width: 30%">
                    <template #body="{ data }">
                      <span class="revenue-cell">{{ authStore.formatCurrency(data.revenue) }}</span>
                    </template>
                  </Column>
                </DataTable>
              </div>

              <!-- Payment Methods -->
              <div class="chart-card">
                <h3 class="card-title">Payment Methods</h3>
                <div class="empty-chart" v-if="paymentMethods.length === 0">
                  <i class="pi pi-credit-card" />
                  <p>No payment data for this period</p>
                </div>
                <template v-else>
                  <div class="chart-wrapper" style="height: 200px">
                    <Doughnut :data="doughnutChartData" :options="doughnutChartOptions" />
                  </div>
                  <div class="payment-list">
                    <div
                      v-for="(item, index) in paymentMethods"
                      :key="item.method"
                      class="payment-row"
                    >
                      <div
                        class="payment-dot"
                        :style="{ background: PIE_COLORS[index % PIE_COLORS.length] }"
                      />
                      <span class="payment-method-name">{{ item.method.toUpperCase() }}</span>
                      <span class="payment-count">{{ item.count }} txns</span>
                      <span class="payment-total">{{ authStore.formatCurrency(item.total) }}</span>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <!-- ── Section 4: Cashier Performance ── -->
            <div class="chart-card">
              <h3 class="card-title">Cashier Performance</h3>
              <div class="empty-chart" v-if="cashierSummary.length === 0">
                <i class="pi pi-users" />
                <p>No cashier data for this period</p>
              </div>
              <DataTable v-else :value="cashierSummary" stripedRows tableStyle="min-width: 100%">
                <Column field="cashierName" header="Cashier" />
                <Column field="totalTransactions" header="Transactions" style="width: 15%" />
                <Column header="Avg Ticket" style="width: 20%">
                  <template #body="{ data }">
                    {{ authStore.formatCurrency(data.averageTicket) }}
                  </template>
                </Column>
                <Column field="totalReturns" header="Returns" style="width: 12%" />
                <Column header="Revenue" style="width: 22%">
                  <template #body="{ data }">
                    <span class="revenue-cell">{{
                      authStore.formatCurrency(data.totalRevenue)
                    }}</span>
                  </template>
                </Column>
              </DataTable>
            </div>
          </template>
        </TabPanel>
        <!-- ══════════════ REVENUE TRENDS (new tab) ══════════════ -->
        <TabPanel value="revenue-trends">
          <RevenueTrendsTab />
        </TabPanel>

        <TabPanel value="customers">
          <CustomerAnalyticsTab />
        </TabPanel>

        <TabPanel value="inventory">
          <InventoryValuationTab />
        </TabPanel>

        <TabPanel value="returns">
          <ReturnsAnalysisTab />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<style scoped>
.reports-page {
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

.page-subtitle {
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0.25rem 0 0;
}

.export-buttons {
  display: flex;
  gap: 0.5rem;
}

.period-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.date-input {
  padding: 0.5rem 0.75rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f1f5f9;
  font-size: 0.875rem;
}

.date-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.date-sep {
  color: #64748b;
  font-size: 0.875rem;
}

.period-select {
  width: 160px;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid transparent;
}

.summary-card.blue {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.2);
}
.summary-card.purple {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.2);
}
.summary-card.teal {
  background: rgba(20, 184, 166, 0.1);
  border-color: rgba(20, 184, 166, 0.2);
}
.summary-card.green {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.2);
}
.summary-card.orange {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.2);
}

.summary-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.blue .summary-icon {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}
.purple .summary-icon {
  background: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
}
.teal .summary-icon {
  background: rgba(20, 184, 166, 0.2);
  color: #14b8a6;
}
.green .summary-icon {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}
.orange .summary-icon {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.summary-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.summary-value {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.blue .summary-value {
  color: #3b82f6;
}
.purple .summary-value {
  color: #8b5cf6;
}
.teal .summary-value {
  color: #14b8a6;
}
.green .summary-value {
  color: #22c55e;
}
.orange .summary-value {
  color: #f59e0b;
}

.summary-label {
  font-size: 0.75rem;
  color: #94a3b8;
}

.summary-change {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.change-up {
  color: #22c55e;
}
.change-down {
  color: #ef4444;
}
.change-neutral {
  color: #64748b;
}

.chart-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.card-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #334155;
}

.chart-wrapper {
  width: 100%;
  position: relative;
}

.empty-chart {
  text-align: center;
  padding: 2rem;
  color: #475569;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-chart i {
  font-size: 2rem;
}
.empty-chart p {
  font-size: 0.875rem;
  margin: 0;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.payment-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.payment-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #0f172a;
  border-radius: 6px;
  font-size: 0.875rem;
}

.payment-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.payment-method-name {
  flex: 1;
  font-weight: 600;
  color: #f1f5f9;
}

.payment-count {
  color: #64748b;
  font-size: 0.8rem;
}

.payment-total {
  font-weight: 600;
  color: #22c55e;
}

.revenue-cell {
  font-weight: 600;
  color: #22c55e;
}
</style>
