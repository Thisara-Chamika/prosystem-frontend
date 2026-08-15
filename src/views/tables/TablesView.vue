<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import tableService from '../../services/tableService'
import customerService from '../../services/customerService'
import type { Customer } from '../../types'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import AutoComplete from 'primevue/autocomplete'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const tables = ref<any[]>([])
const loading = ref(false)

const STATUS_META: Record<string, { dot: string; label: string; border: string }> = {
  available: { dot: '🟢', label: 'Available', border: '#22c55e' },
  occupied: { dot: '🔴', label: 'Occupied', border: '#ef4444' },
  needs_cleaning: { dot: '🟡', label: 'Cleaning', border: '#f59e0b' },
  reserved: { dot: '🔵', label: 'Reserved', border: '#3b82f6' },
}

async function loadTables() {
  loading.value = true
  try {
    const res = await tableService.getTables()
    if (res.success) {
      // Same soft-delete convention as products: list endpoints return
      // inactive records too, frontend filters them out.
      tables.value = res.data.filter((t: any) => t.isActive)
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load tables', life: 3000 })
  } finally {
    loading.value = false
  }
}

function elapsedMinutes(openedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000))
}

// ── Start Order Dialog ─────────────────────────────
const showStartDialog = ref(false)
const startingTable = ref<any>(null)
const startingOrder = ref(false)
const customerQuery = ref('')
const customerSuggestions = ref<Customer[]>([])
const selectedCustomer = ref<Customer | null>(null)

function openStartDialog(table: any) {
  startingTable.value = table
  selectedCustomer.value = null
  customerQuery.value = ''
  showStartDialog.value = true
}

async function searchCustomers(event: any) {
  const query = event.query?.trim()
  if (!query) {
    customerSuggestions.value = []
    return
  }
  try {
    const res = await customerService.searchCustomers(query)
    if (res.success) customerSuggestions.value = res.data
  } catch {
    customerSuggestions.value = []
  }
}

async function confirmStartOrder() {
  if (!startingTable.value) return
  startingOrder.value = true
  try {
    const res = await tableService.startOrder(
      startingTable.value.tableId,
      selectedCustomer.value?.customerId,
    )
    if (res.success) {
      showStartDialog.value = false
      router.push(`/tables/${startingTable.value.tableId}/order`)
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to start order',
      life: 3000,
    })
  } finally {
    startingOrder.value = false
  }
}

// ── Table click routing ─────────────────────────────
function handleTableClick(table: any) {
  if (table.status === 'available') {
    openStartDialog(table)
  } else if (table.status === 'occupied') {
    router.push(`/tables/${table.tableId}/order`)
  }
  // needs_cleaning / reserved use their own "Mark Available" button, not the card itself
}

async function markAvailable(table: any) {
  try {
    const res = await tableService.updateTableStatus(table.tableId, 'available')
    if (res.success) {
      toast.add({
        severity: 'success',
        summary: 'Updated',
        detail: `Table ${table.tableNumber} is now available`,
        life: 2000,
      })
      loadTables()
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update table', life: 3000 })
  }
}

onMounted(() => {
  loadTables()
})
</script>

<template>
  <div class="tables-page">
    <Toast />

    <div class="page-header">
      <div>
        <h1 class="page-title">🍽️ Tables</h1>
      </div>
      <div class="header-actions">
        <Button
          icon="pi pi-refresh"
          severity="secondary"
          size="small"
          :loading="loading"
          @click="loadTables"
        />
        <Button
          label="Add Table"
          icon="pi pi-plus"
          size="small"
          disabled
          v-tooltip="'Table creation coming soon'"
        />
      </div>
    </div>

    <div class="skeleton-grid" v-if="loading">
      <div class="skeleton-card" v-for="i in 6" :key="i" />
    </div>

    <div class="table-grid" v-else>
      <div
        v-for="table in tables"
        :key="table.tableId"
        class="table-card"
        :style="{ borderColor: STATUS_META[table.status]?.border }"
        :class="{ clickable: table.status === 'available' || table.status === 'occupied' }"
        @click="handleTableClick(table)"
      >
        <div class="table-card-header">
          <span class="table-name">Table {{ table.tableNumber }}</span>
          <span class="status-dot">{{ STATUS_META[table.status]?.dot }}</span>
        </div>
        <span class="table-status-label">{{ STATUS_META[table.status]?.label }}</span>
        <span class="table-capacity">Seats {{ table.capacity }}</span>

        <template v-if="table.status === 'occupied'">
          <span class="table-total">{{ authStore.formatCurrency(table.runningTotal ?? 0) }}</span>
          <span class="table-elapsed">{{ elapsedMinutes(table.openedAt) }} min</span>
        </template>

        <Button
          v-if="table.status === 'needs_cleaning' || table.status === 'reserved'"
          label="Mark Available"
          size="small"
          severity="secondary"
          class="mark-available-btn"
          @click.stop="markAvailable(table)"
        />
      </div>

      <div v-if="tables.length === 0" class="no-tables">
        <i class="pi pi-inbox" />
        <p>No tables yet</p>
      </div>
    </div>

    <!-- Start Order Dialog -->
    <Dialog
      v-model:visible="showStartDialog"
      :header="startingTable ? `Start Order — Table ${startingTable.tableNumber}` : 'Start Order'"
      :style="{ width: '380px' }"
      modal
    >
      <div class="start-dialog">
        <label class="field-label">Customer (optional)</label>
        <AutoComplete
          v-model="customerQuery"
          :suggestions="customerSuggestions"
          @complete="searchCustomers"
          @item-select="(e: any) => (selectedCustomer = e.value)"
          :optionLabel="(c: any) => `${c.firstName} ${c.lastName}`"
          placeholder="Search customer or leave blank..."
          class="w-full"
        />
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showStartDialog = false" />
        <Button
          label="Start Order"
          icon="pi pi-check"
          :loading="startingOrder"
          @click="confirmStartOrder"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.tables-page {
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

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.skeleton-grid,
.table-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

.skeleton-card {
  height: 140px;
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

.table-card {
  background: #1e293b;
  border: 2px solid #334155;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-height: 140px;
}

.table-card.clickable {
  cursor: pointer;
  transition: transform 0.15s;
}

.table-card.clickable:hover {
  transform: translateY(-2px);
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-name {
  font-size: 1rem;
  font-weight: 700;
  color: #f1f5f9;
}

.status-dot {
  font-size: 0.9rem;
}

.table-status-label {
  font-size: 0.8rem;
  color: #94a3b8;
}

.table-capacity {
  font-size: 0.75rem;
  color: #64748b;
}

.table-total {
  font-size: 1.1rem;
  font-weight: 700;
  color: #3b82f6;
  margin-top: 0.4rem;
}

.table-elapsed {
  font-size: 0.75rem;
  color: #64748b;
}

.mark-available-btn {
  margin-top: auto;
}

.no-tables {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
  color: #475569;
}

.no-tables i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  display: block;
}

.start-dialog {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #cbd5e1;
}

.w-full {
  width: 100% !important;
}
</style>
