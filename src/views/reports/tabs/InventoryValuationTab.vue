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

async function loadData() {
  loading.value = true
  try {
    const res = await reportService.getInventoryValuation()
    if (res.success) data.value = res.data
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load inventory valuation',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

async function exportFile(format: 'csv' | 'pdf') {
  exporting.value = true
  try {
    const blob = await reportService.exportReport({ type: 'inventory-valuation', format })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventory-valuation-${new Date().toISOString().split('T')[0]}.${format}`
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
  <div class="inventory-valuation-tab">
    <Toast />

    <div class="skeleton-grid" v-if="loading">
      <div class="skeleton-card" v-for="i in 3" :key="i" />
    </div>

    <template v-else-if="data">
      <div class="stat-row">
        <div class="stat-card">
          <span class="stat-value">{{ authStore.formatCurrency(data.totalValueAtCost) }}</span>
          <span class="stat-label">Total Value at Cost</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ authStore.formatCurrency(data.totalValueAtRetail) }}</span>
          <span class="stat-label">Total Value at Retail</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ authStore.formatCurrency(data.potentialProfit) }}</span>
          <span class="stat-label">Potential Profit</span>
        </div>
      </div>

      <div class="sub-stats">
        <span
          >Potential Margin: <strong>{{ data.potentialMarginPercent.toFixed(1) }}%</strong></span
        >
        <span
          >Total Units in Stock:
          <strong>{{ data.totalUnitsInStock.toLocaleString() }}</strong></span
        >
      </div>

      <div class="chart-card">
        <h3 class="card-title">By Category</h3>
        <div class="empty-state" v-if="data.byCategory.length === 0">
          <i class="pi pi-box" />
          <p>No data available for this period</p>
        </div>
        <DataTable v-else :value="data.byCategory" stripedRows tableStyle="min-width: 100%">
          <Column field="category" header="Category" />
          <Column header="Units" style="width: 15%">
            <template #body="{ data: row }">{{ row.units.toLocaleString() }}</template>
          </Column>
          <Column header="Value at Cost" style="width: 22%">
            <template #body="{ data: row }">
              <span class="revenue-cell">{{ authStore.formatCurrency(row.valueAtCost) }}</span>
            </template>
          </Column>
          <Column header="Value at Retail" style="width: 22%">
            <template #body="{ data: row }">
              <span class="revenue-cell">{{ authStore.formatCurrency(row.valueAtRetail) }}</span>
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
.inventory-valuation-tab {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

.sub-stats {
  display: flex;
  gap: 2rem;
  color: #6e7884;
  font-size: 0.9rem;
}

.sub-stats strong {
  color: #4f545a;
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
