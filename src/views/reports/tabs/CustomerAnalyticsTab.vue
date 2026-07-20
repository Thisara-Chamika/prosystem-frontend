<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../../stores/authStore'
import reportService from '../../../services/reportService'

import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const authStore = useAuthStore()
const toast = useToast()

const loading = ref(false)
const exporting = ref(false)
const data = ref<any>(null)

const fromDate = ref('')
const toDate = ref('')

const TIER_ICONS: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
}

function formatDate(d: Date): string {
  const tz = authStore.shop?.timezone || 'UTC'
  return d.toLocaleDateString('en-CA', { timeZone: tz })
}

function setDefaultRange() {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 6) // last 7 days, inclusive of today
  fromDate.value = formatDate(start)
  toDate.value = formatDate(today)
}

function formatLastVisit(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: authStore.shop?.timezone || 'UTC',
  }).format(new Date(dateStr))
}

async function loadData() {
  if (!fromDate.value || !toDate.value) {
    toast.add({
      severity: 'warn',
      summary: 'Required',
      detail: 'Please select both from and to dates',
      life: 3000,
    })
    return
  }
  loading.value = true
  try {
    const res = await reportService.getCustomerAnalytics({
      fromDate: fromDate.value,
      toDate: toDate.value,
    })
    if (res.success) data.value = res.data
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load customer analytics',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

async function exportFile(format: 'csv' | 'pdf') {
  exporting.value = true
  try {
    const blob = await reportService.exportReport({
      type: 'customer-analytics',
      format,
      fromDate: fromDate.value,
      toDate: toDate.value,
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `customer-analytics-${toDate.value}.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: 'Could not export report',
      life: 3000,
    })
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  setDefaultRange()
  loadData()
})
</script>

<template>
  <div class="customer-analytics-tab">
    <Toast />

    <div class="filter-row">
      <input type="date" v-model="fromDate" class="date-input" />
      <span class="date-sep">to</span>
      <input type="date" v-model="toDate" class="date-input" />
      <Button label="Apply" icon="pi pi-check" size="small" @click="loadData" />
    </div>

    <div class="skeleton-grid" v-if="loading">
      <div class="skeleton-card" v-for="i in 3" :key="i" />
    </div>

    <template v-else-if="data">
      <div class="stat-row">
        <div class="stat-card">
          <span class="stat-value">{{ data.newCustomers }}</span>
          <span class="stat-label">New Customers</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ data.returningCustomers }}</span>
          <span class="stat-label">Returning Customers</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ data.totalActiveCustomers }}</span>
          <span class="stat-label">Total Active Customers</span>
        </div>
      </div>

      <div class="chart-card">
        <h3 class="card-title">Top Customers <span class="all-time-tag">(all-time)</span></h3>
        <div class="empty-state" v-if="data.topCustomers.length === 0">
          <i class="pi pi-users" />
          <p>No data available for this period</p>
        </div>
        <DataTable v-else :value="data.topCustomers" stripedRows tableStyle="min-width: 100%">
          <Column header="Customer">
            <template #body="{ data: row }">
              <span class="tier-icon">{{ TIER_ICONS[row.loyaltyTier] ?? '' }}</span>
              {{ row.name }}
            </template>
          </Column>
          <Column header="Total Spent" style="width: 20%">
            <template #body="{ data: row }">
              <span class="revenue-cell">{{ authStore.formatCurrency(row.totalSpent) }}</span>
            </template>
          </Column>
          <Column field="totalVisits" header="Visits" style="width: 15%" />
        </DataTable>
      </div>

      <div class="chart-card">
        <h3 class="card-title">
          At-Risk Customers
          <i
            class="pi pi-info-circle info-icon"
            title="These customers were active before but haven't visited recently. Consider reaching out."
          />
        </h3>
        <div class="empty-state" v-if="data.atRiskCustomers.length === 0">
          <i class="pi pi-check-circle" />
          <p>No data available for this period</p>
        </div>
        <DataTable v-else :value="data.atRiskCustomers" stripedRows tableStyle="min-width: 100%">
          <Column field="name" header="Customer" />
          <Column header="Last Visit" style="width: 25%">
            <template #body="{ data: row }">
              {{ formatLastVisit(row.lastVisit) }} ({{ row.daysSinceVisit }} days ago)
            </template>
          </Column>
          <Column header="Total Spent" style="width: 20%">
            <template #body="{ data: row }">
              <span class="revenue-cell">{{ authStore.formatCurrency(row.totalSpent) }}</span>
            </template>
          </Column>
        </DataTable>
      </div>

      <div class="export-row">
        <Button
          label="Export PDF"
          icon="pi pi-print"
          severity="secondary"
          size="small"
          :loading="exporting"
          @click="exportFile('pdf')"
        />
        <Button
          label="Export CSV"
          icon="pi pi-download"
          severity="secondary"
          size="small"
          :loading="exporting"
          @click="exportFile('csv')"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.customer-analytics-tab {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.skeleton-card {
  height: 90px;
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

.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
}

.stat-label {
  font-size: 0.8rem;
  color: #94a3b8;
}

.chart-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #334155;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.all-time-tag {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
}

.info-icon {
  font-size: 0.8rem;
  color: #64748b;
  cursor: help;
}

.tier-icon {
  margin-right: 0.35rem;
}

.revenue-cell {
  font-weight: 600;
  color: #22c55e;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #475569;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-state i {
  font-size: 2rem;
}
.empty-state p {
  font-size: 0.875rem;
  margin: 0;
}

.export-row {
  display: flex;
  gap: 0.5rem;
}
</style>
