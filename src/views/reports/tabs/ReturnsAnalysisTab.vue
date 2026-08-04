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

// Guarded against divide-by-zero: if totalReturns is 0, bars just render at 0%
// instead of throwing NaN into a CSS width.
function barWidth(count: number): number {
  if (!data.value || !data.value.totalReturns) return 0
  return (count / data.value.totalReturns) * 100
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
    const res = await reportService.getReturnsAnalysis({
      fromDate: fromDate.value,
      toDate: toDate.value,
    })
    if (res.success) data.value = res.data
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load returns analysis',
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
      type: 'returns-analysis',
      format,
      fromDate: fromDate.value,
      toDate: toDate.value,
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `returns-analysis-${toDate.value}.${format}`
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
  <div class="returns-analysis-tab">
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
          <span class="stat-value">{{ data.totalReturns }}</span>
          <span class="stat-label">Total Returns</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ authStore.formatCurrency(data.totalRefundAmount) }}</span>
          <span class="stat-label">Total Refund Amount</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ data.returnRate.toFixed(1) }}%</span>
          <span class="stat-label">Return Rate</span>
        </div>
      </div>

      <div class="chart-card">
        <h3 class="card-title">Return Reasons</h3>
        <div class="empty-state" v-if="data.reasonBreakdown.length === 0">
          <i class="pi pi-inbox" />
          <p>No data available for this period</p>
        </div>
        <div v-else class="reason-list">
          <div v-for="item in data.reasonBreakdown" :key="item.reason" class="reason-row">
            <span class="reason-label">{{ item.reason }}</span>
            <div class="reason-track">
              <div class="reason-fill" :style="{ width: barWidth(item.count) + '%' }" />
            </div>
            <span class="reason-count">{{ item.count }}</span>
          </div>
        </div>
      </div>

      <div class="chart-card">
        <h3 class="card-title">Most Returned Products</h3>
        <div class="empty-state" v-if="data.mostReturnedProducts.length === 0">
          <i class="pi pi-box" />
          <p>No data available for this period</p>
        </div>
        <DataTable
          v-else
          :value="data.mostReturnedProducts"
          stripedRows
          tableStyle="min-width: 100%"
        >
          <Column field="productName" header="Product" />
          <Column field="returnCount" header="Returns" style="width: 20%" />
          <Column header="Return Value" style="width: 25%">
            <template #body="{ data: row }">
              <span class="revenue-cell">{{ authStore.formatCurrency(row.returnValue) }}</span>
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
.returns-analysis-tab {
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
  font-size: 1.3rem;
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
}

.reason-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reason-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.reason-label {
  width: 140px;
  flex-shrink: 0;
  font-size: 0.875rem;
  color: #cbd5e1;
}

.reason-track {
  flex: 1;
  height: 10px;
  background: #334155;
  border-radius: 5px;
  overflow: hidden;
}

.reason-fill {
  height: 100%;
  background: #f59e0b;
  border-radius: 5px;
}

.reason-count {
  width: 30px;
  text-align: right;
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #f1f5f9;
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
