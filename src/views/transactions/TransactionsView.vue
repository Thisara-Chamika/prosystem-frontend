<script setup lang="ts">
import { ref, onMounted } from 'vue'
import posService from '../../services/posService'
import { useAuthStore } from '../../stores/authStore'
import type { Transaction } from '../../types'
import customerService from '../../services/customerService'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import TransactionDetailPanel from './TransactionDetailPanel.vue'

const toast = useToast()
const authStore = useAuthStore()

// ── State ─────────────────────────────────────────
const transactions = ref<Transaction[]>([])
const loading = ref(false)
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const customerNames = ref<Record<string, string>>({})

// Filters
const searchQuery = ref('')
const filterStatus = ref<string | null>(null)
const filterPaymentMethod = ref<string | null>(null)
const fromDate = ref('')
const toDate = ref('')
let searchTimeout: ReturnType<typeof setTimeout>

// Detail panel
const showDetailPanel = ref(false)
const selectedTransactionId = ref<string | null>(null)

// ── Options ───────────────────────────────────────
const statusOptions = [
  { label: 'All Status', value: null },
  { label: 'Completed', value: 'completed' },
  { label: 'Partial Refund', value: 'partial_refund' },
  { label: 'Refunded', value: 'refunded' },
  { label: 'Cancelled', value: 'cancelled' },
]

const paymentOptions = [
  { label: 'All Methods', value: null },
  { label: 'Cash', value: 'cash' },
  { label: 'Card', value: 'card' },
  { label: 'Online', value: 'online' },
  { label: 'Mixed', value: 'mixed' },
]

// ── Methods ───────────────────────────────────────
async function loadTransactions() {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      limit: pageSize.value,
    }
    if (filterStatus.value) params.status = filterStatus.value
    if (filterPaymentMethod.value) params.paymentMethod = filterPaymentMethod.value
    if (fromDate.value) params.fromDate = fromDate.value
    if (toDate.value) params.toDate = toDate.value

    const response = await posService.getTransactionsFiltered(params)
    if (response.success) {
      let data = response.data

      // Client-side search by transaction number
      if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase()
        data = data.filter((t: Transaction) => t.transactionNumber.toLowerCase().includes(query))
      }

      transactions.value = data
      totalRecords.value = response.pagination?.total ?? data.length
      await loadCustomerNames(data)
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load transactions',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

async function loadCustomerNames(txns: Transaction[]) {
  const uniqueIds = [
    ...new Set(txns.filter((t) => t.customerId).map((t) => t.customerId as string)),
  ]

  await Promise.all(
    uniqueIds.map(async (id) => {
      if (customerNames.value[id]) return // already fetched
      try {
        const response = await customerService.getCustomer(id)
        if (response.success) {
          const c = response.data
          customerNames.value[id] = `${c.firstName} ${c.lastName}`
        }
      } catch {
        customerNames.value[id] = 'Unknown'
      }
    }),
  )
}

function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadTransactions()
  }, 400)
}

function onFilterChange() {
  currentPage.value = 1
  loadTransactions()
}

function onPageChange(event: any) {
  currentPage.value = event.page + 1
  pageSize.value = event.rows
  loadTransactions()
}

function openDetail(transaction: Transaction) {
  selectedTransactionId.value = transaction.transactionId
  showDetailPanel.value = true
}

function onDetailClose() {
  showDetailPanel.value = false
  selectedTransactionId.value = null
  loadTransactions()
}

function getStatusSeverity(status: string) {
  switch (status) {
    case 'completed':
      return 'success'
    case 'partial_refund':
      return 'warn'
    case 'refunded':
      return 'secondary'
    case 'cancelled':
      return 'danger'
    default:
      return 'info'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'partial_refund':
      return 'Partial Refund'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
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

onMounted(() => {
  loadTransactions()
})
</script>

<template>
  <div class="transactions-page">
    <Toast />

    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Transactions</h1>
        <p class="page-subtitle">View and manage all transactions</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <IconField class="search-field">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="searchQuery"
          placeholder="Search by transaction number..."
          @input="onSearch"
        />
      </IconField>

      <Select
        v-model="filterStatus"
        :options="statusOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Status"
        class="filter-select"
        @change="onFilterChange"
      />

      <Select
        v-model="filterPaymentMethod"
        :options="paymentOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Methods"
        class="filter-select"
        @change="onFilterChange"
      />

      <div class="date-filters">
        <InputText v-model="fromDate" type="date" class="date-input" @change="onFilterChange" />
        <span class="date-separator">to</span>
        <InputText v-model="toDate" type="date" class="date-input" @change="onFilterChange" />
      </div>
    </div>

    <!-- Transactions Table -->
    <div class="table-card">
      <DataTable
        :value="transactions"
        :loading="loading"
        lazy
        paginator
        :rows="pageSize"
        :totalRecords="totalRecords"
        :rowsPerPageOptions="[10, 25, 50]"
        @page="onPageChange"
        stripedRows
        tableStyle="min-width: 50rem"
        rowHover
        @row-click="openDetail($event.data)"
        class="clickable-rows"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-receipt" />
            <p>No transactions found</p>
          </div>
        </template>

        <Column field="transactionNumber" header="Transaction #" style="width: 20%" />

        <Column header="Customer" style="width: 18%">
          <template #body="{ data }">
            <span class="customer-cell">
              {{ data.customerId ? customerNames[data.customerId] || 'Loading...' : 'Walk-in' }}
            </span>
          </template>
        </Column>

        <Column header="Date" style="width: 18%">
          <template #body="{ data }">
            {{ authStore.formatDate(data.createdAt) }}
          </template>
        </Column>

        <Column header="Total" style="width: 13%">
          <template #body="{ data }">
            <span class="amount">
              {{ authStore.formatCurrency(parseFloat(data.total)) }}
            </span>
          </template>
        </Column>

        <Column header="Payment" style="width: 13%">
          <template #body="{ data }">
            <span class="payment-method">
              <i :class="getPaymentIcon(data.paymentMethod)" />
              {{ data.paymentMethod }}
            </span>
          </template>
        </Column>

        <Column header="Status" style="width: 13%">
          <template #body="{ data }">
            <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>

        <Column header="" style="width: 5%">
          <template #body>
            <i class="pi pi-chevron-right row-arrow" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Transaction Detail Panel -->
    <TransactionDetailPanel
      v-if="showDetailPanel && selectedTransactionId"
      :transactionId="selectedTransactionId"
      @close="onDetailClose"
      @returnProcessed="onDetailClose"
    />
  </div>
</template>

<style scoped>
.transactions-page {
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

.filters-bar {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-field {
  flex: 1;
  min-width: 200px;
}

.filter-select {
  width: 160px;
}

.date-filters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-input {
  width: 140px;
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

.date-separator {
  color: #64748b;
  font-size: 0.875rem;
}

.table-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #475569;
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
  display: block;
}

.amount {
  font-weight: 600;
  color: #22c55e;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #94a3b8;
  font-size: 0.875rem;
  text-transform: capitalize;
}

.customer-cell {
  color: #94a3b8;
  font-size: 0.875rem;
}

.row-arrow {
  color: #475569;
  font-size: 0.75rem;
}

:deep(.clickable-rows .p-datatable-tbody > tr) {
  cursor: pointer;
}

:deep(.clickable-rows .p-datatable-tbody > tr:hover) {
  background: #1e3a5f !important;
}
</style>
