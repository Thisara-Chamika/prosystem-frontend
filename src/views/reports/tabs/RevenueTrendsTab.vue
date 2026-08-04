<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../../stores/authStore'
import reportService from '../../../services/reportService'

import Button from 'primevue/button'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  Title,
  Tooltip,
  Legend,
  Filler,
)

const authStore = useAuthStore()
const toast = useToast()

// ── State ─────────────────────────────────────────
const period = ref<'week' | 'month' | 'quarter'>('week')
const loading = ref(false)
const hasLoaded = ref(false)
const data = ref<any>(null)
const exporting = ref(false)

const periodOptions = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
]

// ── Chart ─────────────────────────────────────────
function formatChartDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: authStore.shop?.timezone || 'UTC',
  }).format(new Date(dateStr))
}

const lineChartData = computed(() => ({
  labels: (data.value?.trend ?? []).map((d: any) => formatChartDate(d.date)),
  datasets: [
    {
      label: 'Revenue',
      data: (data.value?.trend ?? []).map((d: any) => d.revenue),
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
    x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
    y: {
      grid: { color: '#334155' },
      ticks: { color: '#94a3b8', callback: (value: any) => authStore.formatCurrency(value) },
    },
  },
}))

// ── Growth indicator ──────────────────────────────
function getGrowthIcon(pct: number) {
  if (pct > 0) return 'pi pi-arrow-up'
  if (pct < 0) return 'pi pi-arrow-down'
  return 'pi pi-minus'
}
function getGrowthClass(pct: number) {
  if (pct > 0) return 'growth-up'
  if (pct < 0) return 'growth-down'
  return 'growth-neutral'
}

// ── Load data ─────────────────────────────────────
async function loadData() {
  loading.value = true
  try {
    const res = await reportService.getRevenueTrends(period.value)
    if (res.success) {
      data.value = res.data
      hasLoaded.value = true
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load revenue trends',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

// ── Export ────────────────────────────────────────
async function exportFile(format: 'csv' | 'pdf') {
  exporting.value = true
  try {
    const blob = await reportService.exportReport({
      type: 'revenue-trends',
      format,
      period: period.value,
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `revenue-trends-${new Date().toISOString().split('T')[0]}.${format}`
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
  loadData()
})
</script>

<template>
  <div class="revenue-trends-tab">
    <Toast />

    <div class="filter-row">
      <Select
        v-model="period"
        :options="periodOptions"
        optionLabel="label"
        optionValue="value"
        class="period-select"
        @change="loadData"
      />
    </div>

    <div class="skeleton-grid" v-if="loading">
      <div class="skeleton-card" v-for="i in 2" :key="i" />
      <div class="skeleton-card skeleton-chart" />
    </div>

    <template v-else-if="data">
      <div class="stat-row">
        <div class="stat-card">
          <span class="stat-value">{{ authStore.formatCurrency(data.current.revenue) }}</span>
          <span class="stat-label">{{ data.current.label }}</span>
        </div>
        <div class="stat-card">
          <div class="growth-badge" :class="getGrowthClass(data.growthPercent)">
            <i :class="getGrowthIcon(data.growthPercent)" />
            <span>{{ Math.abs(data.growthPercent).toFixed(1) }}%</span>
          </div>
          <span class="stat-sub">vs {{ authStore.formatCurrency(data.previous.revenue) }}</span>
          <span class="stat-label">{{ data.previous.label }}</span>
        </div>
      </div>

      <div class="chart-card">
        <h3 class="card-title">Revenue Trend</h3>
        <div class="empty-state" v-if="data.trend.length === 0">
          <i class="pi pi-chart-line" />
          <p>No data available for this period</p>
        </div>
        <div class="chart-wrapper" v-else style="height: 280px">
          <Line :data="lineChartData" :options="lineChartOptions" />
        </div>
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
.revenue-trends-tab {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filter-row {
  display: flex;
}

.period-select {
  width: 160px;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.skeleton-card {
  height: 90px;
  background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 12px;
}

.skeleton-chart {
  grid-column: span 2;
  height: 280px;
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
  grid-template-columns: 1fr 1fr;
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

.stat-sub {
  font-size: 0.9rem;
  color: #cbd5e1;
}

.growth-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 1.25rem;
  font-weight: 700;
  width: fit-content;
}

.growth-up {
  color: #22c55e;
}
.growth-down {
  color: #ef4444;
}
.growth-neutral {
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
