<script setup lang="ts">
import { ref, computed } from 'vue'
import posService from '../../services/posService'
import { useAuthStore } from '../../stores/authStore'
import type { Transaction } from '../../types'

import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import ReturnModal from '../transactions/ReturnModal.vue'
import ReturnSuccessDialog from '../transactions/ReturnSuccessDialog.vue'

const authStore = useAuthStore()
const toast = useToast()

const emit = defineEmits<{
  close: []
}>()

// ── State ─────────────────────────────────────────
const searchQuery = ref('')
const searching = ref(false)
const searchResults = ref<Transaction[]>([])
const searchType = ref<string | null>(null)
const hasSearched = ref(false)

const selectedTransaction = ref<Transaction | null>(null)
const loadingDetail = ref(false)
const showReturnModal = ref(false)
const showSuccessDialog = ref(false)
const returnResult = ref<any>(null)

// ── Computed ──────────────────────────────────────
const searchHint = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return 'Enter TXN number, phone, or customer name'
  if (q.toUpperCase().startsWith('TXN-')) return '🔍 Searching by transaction number...'
  if (/^\d{10,}$/.test(q)) return '🔍 Searching by phone number...'
  return '🔍 Searching by customer name...'
})

const returnableResults = computed(() =>
  searchResults.value.filter((t) => t.status === 'completed' || t.status === 'partial_refund'),
)

const nonReturnableResults = computed(() =>
  searchResults.value.filter((t) => t.status !== 'completed' && t.status !== 'partial_refund'),
)

// ── Methods ───────────────────────────────────────
let searchTimeout: ReturnType<typeof setTimeout>

function onSearchInput() {
  clearTimeout(searchTimeout)
  if (searchQuery.value.trim().length < 2) {
    searchResults.value = []
    hasSearched.value = false
    return
  }
  searchTimeout = setTimeout(() => {
    performSearch()
  }, 500)
}

async function performSearch() {
  if (searchQuery.value.trim().length < 2) return
  searching.value = true
  hasSearched.value = true
  try {
    const response = await posService.returnLookup(searchQuery.value.trim())
    if (response.success) {
      searchResults.value = response.data.results
      searchType.value = response.data.searchType
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Search Failed',
      detail: error.response?.data?.message || 'Failed to search transactions',
      life: 3000,
    })
    searchResults.value = []
  } finally {
    searching.value = false
  }
}

async function selectTransaction(txn: Transaction) {
  loadingDetail.value = true
  try {
    const response = await posService.getTransaction(txn.transactionId)
    if (response.success) {
      selectedTransaction.value = response.data
      showReturnModal.value = true
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load transaction details',
      life: 3000,
    })
  } finally {
    loadingDetail.value = false
  }
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

function onReturnSuccess(result: any) {
  returnResult.value = result
  showReturnModal.value = false
  showSuccessDialog.value = true
}

function onSuccessDone() {
  showSuccessDialog.value = false
  emit('close')
}
</script>

<template>
  <div class="lookup-overlay" @click.self="emit('close')">
    <div class="lookup-panel">
      <Toast />

      <!-- Header -->
      <div class="panel-header">
        <div class="header-title">
          <i class="pi pi-replay" />
          <h2>Process Return</h2>
        </div>
        <Button icon="pi pi-times" severity="secondary" text @click="emit('close')" />
      </div>

      <!-- Search -->
      <div class="search-section">
        <IconField class="w-full">
          <InputIcon :class="searching ? 'pi pi-spin pi-spinner' : 'pi pi-search'" />
          <InputText
            v-model="searchQuery"
            placeholder="TXN number, phone, or customer name..."
            class="w-full"
            @input="onSearchInput"
            autofocus
          />
        </IconField>
        <span class="search-hint">{{ searchHint }}</span>
      </div>

      <!-- Results -->
      <div class="results-section" v-if="hasSearched">
        <!-- No results -->
        <div class="empty-state" v-if="searchResults.length === 0 && !searching">
          <i class="pi pi-search" />
          <p>No transactions found</p>
          <span>Try a different search term</span>
        </div>

        <template v-else>
          <!-- Returnable transactions -->
          <div v-if="returnableResults.length > 0">
            <div class="results-label">Select transaction to return</div>
            <div class="transaction-cards">
              <div
                v-for="txn in returnableResults"
                :key="txn.transactionId"
                class="txn-card returnable"
                @click="selectTransaction(txn)"
              >
                <div class="txn-card-left">
                  <span class="txn-number">{{ txn.transactionNumber }}</span>
                  <span class="txn-date">{{ authStore.formatDate(txn.createdAt) }}</span>
                </div>
                <div class="txn-card-right">
                  <span class="txn-total">
                    {{ authStore.formatCurrency(parseFloat(txn.total)) }}
                  </span>
                  <Tag
                    :value="getStatusLabel(txn.status)"
                    :severity="getStatusSeverity(txn.status)"
                  />
                </div>
                <i class="pi pi-chevron-right txn-arrow" />
              </div>
            </div>
          </div>

          <!-- Non-returnable transactions -->
          <div v-if="nonReturnableResults.length > 0">
            <div class="results-label muted">Cannot be returned</div>
            <div class="transaction-cards">
              <div
                v-for="txn in nonReturnableResults"
                :key="txn.transactionId"
                class="txn-card non-returnable"
              >
                <div class="txn-card-left">
                  <span class="txn-number muted">{{ txn.transactionNumber }}</span>
                  <span class="txn-date">{{ authStore.formatDate(txn.createdAt) }}</span>
                </div>
                <div class="txn-card-right">
                  <span class="txn-total muted">
                    {{ authStore.formatCurrency(parseFloat(txn.total)) }}
                  </span>
                  <Tag
                    :value="getStatusLabel(txn.status)"
                    :severity="getStatusSeverity(txn.status)"
                  />
                </div>
                <i class="pi pi-ban non-return-icon" />
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Initial state -->
      <div class="initial-state" v-else>
        <i class="pi pi-receipt" />
        <p>Search for a transaction to process a return</p>
        <div class="search-tips">
          <div class="tip"><span class="tip-code">TXN-...</span> receipt number</div>
          <div class="tip"><span class="tip-code">077...</span> phone number</div>
          <div class="tip"><span class="tip-code">Sarah</span> customer name</div>
        </div>
      </div>

      <!-- Loading detail -->
      <div class="loading-overlay" v-if="loadingDetail">
        <i class="pi pi-spin pi-spinner" />
        <span>Loading transaction...</span>
      </div>
    </div>
  </div>

  <!-- Return Modal -->
  <ReturnModal
    v-if="showReturnModal && selectedTransaction"
    :transaction="selectedTransaction"
    @close="showReturnModal = false"
    @success="onReturnSuccess"
  />

  <!-- Success Dialog -->
  <ReturnSuccessDialog
    v-if="showSuccessDialog && returnResult"
    :returnData="returnResult"
    @done="onSuccessDone"
  />
</template>

<style scoped>
.lookup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

.lookup-panel {
  width: 480px;
  background: #1e293b;
  border-left: 1px solid #334155;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  position: relative;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #f1f5f9;
}

.header-title i {
  font-size: 1.25rem;
  color: #ef4444;
}

.header-title h2 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.search-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.search-hint {
  font-size: 0.75rem;
  color: #64748b;
  padding-left: 0.25rem;
}

.results-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

.results-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.results-label.muted {
  color: #475569;
}

.transaction-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.txn-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  transition: all 0.2s;
}

.txn-card.returnable {
  cursor: pointer;
}

.txn-card.returnable:hover {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.txn-card.non-returnable {
  opacity: 0.5;
  cursor: not-allowed;
}

.txn-card-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.txn-number {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f1f5f9;
}

.txn-number.muted {
  color: #64748b;
}

.txn-date {
  font-size: 0.75rem;
  color: #64748b;
}

.txn-card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
}

.txn-total {
  font-size: 0.875rem;
  font-weight: 700;
  color: #22c55e;
}

.txn-total.muted {
  color: #475569;
}

.txn-arrow {
  color: #ef4444;
  font-size: 0.75rem;
}

.non-return-icon {
  color: #475569;
  font-size: 0.875rem;
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
  font-size: 2.5rem;
}

.empty-state p {
  font-weight: 600;
  color: #64748b;
  margin: 0;
}

.empty-state span {
  font-size: 0.8rem;
}

.initial-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #475569;
  text-align: center;
  padding: 2rem;
}

.initial-state i {
  font-size: 3rem;
}

.initial-state p {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

.search-tips {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.tip {
  font-size: 0.8rem;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
}

.tip-code {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 4px;
  padding: 0.1rem 0.4rem;
  font-family: monospace;
  font-size: 0.75rem;
  color: #94a3b8;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #94a3b8;
  font-size: 0.875rem;
  border-radius: 0;
}

.loading-overlay i {
  font-size: 2rem;
}

.w-full {
  width: 100% !important;
}

:deep(.w-full input) {
  width: 100%;
}
</style>
