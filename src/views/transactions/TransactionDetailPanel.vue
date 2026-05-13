<script setup lang="ts">
import { ref, onMounted } from 'vue'
import posService from '../../services/posService'
import { useAuthStore } from '../../stores/authStore'
import type { Transaction } from '../../types'
import customerService from '../../services/customerService'

import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import ReturnModal from './ReturnModal.vue'

const toast = useToast()
const authStore = useAuthStore()

const props = defineProps<{
  transactionId: string
}>()

const emit = defineEmits<{
  close: []
  returnProcessed: []
}>()

// ── State ─────────────────────────────────────────
const transaction = ref<Transaction | null>(null)
const loading = ref(false)
const showReturnModal = ref(false)
const customerName = ref<string | null>(null)

// ── Computed helpers ──────────────────────────────
function canReturn(status: string): boolean {
  return status === 'completed' || status === 'partial_refund'
}

function isOwnerOrManager(): boolean {
  return authStore.userRole === 'shop_owner' || authStore.userRole === 'shop_manager'
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

// ── Methods ───────────────────────────────────────
async function loadTransaction() {
  loading.value = true
  try {
    const response = await posService.getTransaction(props.transactionId)
    if (response.success) {
      transaction.value = response.data
      if (response.data.customerId) {
        await loadCustomerName(response.data.customerId)
      }
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load transaction details',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

async function loadCustomerName(customerId: string) {
  try {
    const response = await customerService.getCustomer(customerId)
    if (response.success) {
      customerName.value = `${response.data.firstName} ${response.data.lastName}`
    }
  } catch {
    customerName.value = null
  }
}

function onReturnProcessed() {
  showReturnModal.value = false
  loadTransaction()
  emit('returnProcessed')
}

function getProductName(transactionItemId: string): string {
  const item = transaction.value?.items?.find(
    i => i.itemId === transactionItemId
  )
  return item?.productName || 'Unknown Product'
}

onMounted(() => {
  loadTransaction()
})
</script>

<template>
  <div class="detail-overlay" @click.self="emit('close')">
    <div class="detail-panel">
      <Toast />

      <!-- Panel Header -->
      <div class="panel-header">
        <div class="panel-title">
          <h2>Transaction Detail</h2>
          <Tag
            v-if="transaction"
            :value="getStatusLabel(transaction.status)"
            :severity="getStatusSeverity(transaction.status)"
          />
        </div>
        <Button icon="pi pi-times" severity="secondary" text @click="emit('close')" />
      </div>

      <!-- Loading -->
      <div class="panel-loading" v-if="loading">
        <i class="pi pi-spin pi-spinner" />
        <p>Loading transaction...</p>
      </div>

      <template v-else-if="transaction">
        <!-- Transaction Info -->
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Transaction #</span>
            <span class="info-value">{{ transaction.transactionNumber }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Date</span>
            <span class="info-value">{{ authStore.formatDate(transaction.createdAt) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Payment Method</span>
            <span class="info-value payment-method">
              <i :class="getPaymentIcon(transaction.paymentMethod)" />
              {{ transaction.paymentMethod.toUpperCase() }}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Customer</span>
            <span class="info-value">
              {{ transaction.customerId ? customerName || 'Loading...' : 'Walk-in Customer' }}
            </span>
          </div>
        </div>

        <!-- Items Table -->
        <div class="items-section">
          <h3 class="section-title">Items</h3>
          <div class="items-table">
            <div class="items-header">
              <span>Product</span>
              <span>SKU</span>
              <span>Qty</span>
              <span>Returned</span>
              <span>Unit Price</span>
              <span>Total</span>
            </div>
            <div
              v-for="item in transaction.items"
              :key="item.itemId"
              class="items-row"
              :class="{ 'fully-returned': item.availableToReturn === 0 }"
            >
              <span class="item-name">
                {{ item.productName }}
                <span
                  class="returned-badge"
                  v-if="item.returnedQuantity > 0 && item.availableToReturn === 0"
                >
                  Returned
                </span>
                <span class="partial-badge" v-else-if="item.returnedQuantity > 0"> Partial </span>
              </span>
              <span class="item-sku">{{ item.productSku }}</span>
              <span>{{ item.quantity }}</span>
              <span :class="item.returnedQuantity > 0 ? 'returned-qty' : 'no-return'">
                {{ item.returnedQuantity > 0 ? item.returnedQuantity : '—' }}
              </span>
              <span>{{ authStore.formatCurrency(parseFloat(item.unitPrice)) }}</span>
              <span class="item-total">{{ authStore.formatCurrency(parseFloat(item.total)) }}</span>
            </div>
          </div>
        </div>

        <!-- Totals -->
        <div class="totals-section">
          <div class="total-row">
            <span>Subtotal</span>
            <span>{{ authStore.formatCurrency(parseFloat(transaction.subtotal)) }}</span>
          </div>
          <div class="total-row">
            <span>Tax</span>
            <span>{{ authStore.formatCurrency(parseFloat(transaction.tax)) }}</span>
          </div>
          <div class="total-row">
            <span>Discount</span>
            <span>-{{ authStore.formatCurrency(parseFloat(transaction.discount)) }}</span>
          </div>
          <div class="total-row grand">
            <span>Total</span>
            <span>{{ authStore.formatCurrency(parseFloat(transaction.total)) }}</span>
          </div>
        </div>

        <!-- Returns History -->
        <div class="returns-section" v-if="transaction.returns && transaction.returns.length > 0">
          <h3 class="section-title">Return History</h3>
          <div v-for="ret in transaction.returns" :key="ret.returnId" class="return-record">
            <div class="return-record-header">
              <div class="return-record-left">
                <span class="return-id">{{ ret.returnId.slice(0, 8) }}...</span>
                <span class="return-date">{{ authStore.formatDate(ret.createdAt) }}</span>
              </div>
              <span class="return-amount">
                -{{ authStore.formatCurrency(parseFloat(ret.totalRefund)) }}
              </span>
            </div>
            <div class="return-record-details">
              <span class="return-method">{{
                ret.refundMethod.replace('_', ' ').toUpperCase()
              }}</span>
              <span class="return-reason" v-if="ret.reason">{{ ret.reason }}</span>
            </div>
            <div class="return-items">
              <div v-for="(rItem, index) in ret.items" :key="index" class="return-item-row">
                <span>{{ getProductName(rItem.transactionItemId) }} x{{ rItem.quantity }}</span>
                <span>{{ authStore.formatCurrency(parseFloat(rItem.total)) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="panel-actions">
          <Button label="Print Receipt" icon="pi pi-print" severity="secondary" outlined />
          <Button
            v-if="canReturn(transaction.status) && isOwnerOrManager()"
            label="Process Return"
            icon="pi pi-replay"
            severity="warning"
            @click="showReturnModal = true"
          />
        </div>
      </template>

      <!-- Return Modal -->
      <ReturnModal
        v-if="showReturnModal && transaction"
        :transaction="transaction"
        @close="showReturnModal = false"
        @success="onReturnProcessed"
      />
    </div>
  </div>
</template>

<style scoped>
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

.detail-panel {
  width: 520px;
  background: #1e293b;
  border-left: 1px solid #334155;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.panel-title h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
}

.panel-loading {
  text-align: center;
  padding: 3rem;
  color: #475569;
}

.panel-loading i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  display: block;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.info-item {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f1f5f9;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.75rem;
}

.items-table {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  overflow: hidden;
}

.items-header {
  display: grid;
  grid-template-columns: 2fr 1fr 0.5fr 0.5fr 1fr 1fr;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.items-row {
  display: grid;
  grid-template-columns: 2fr 1fr 0.5fr 0.5fr 1fr 1fr;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #1e293b;
  font-size: 0.875rem;
  color: #cbd5e1;
  align-items: center;
}

.items-row:last-child {
  border-bottom: none;
}

.item-name {
  font-weight: 500;
  color: #f1f5f9;
}

.item-sku {
  color: #64748b;
  font-size: 0.75rem;
}

.item-total {
  font-weight: 600;
  color: #22c55e;
}

.totals-section {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.total-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #94a3b8;
}

.total-row.grand {
  font-size: 1rem;
  font-weight: 700;
  color: #f1f5f9;
  padding-top: 0.5rem;
  border-top: 1px solid #334155;
  margin-top: 0.25rem;
}

.panel-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid #334155;
}

.items-section {
  display: flex;
  flex-direction: column;
}

.fully-returned {
  opacity: 0.5;
}

.returned-badge {
  display: inline-block;
  font-size: 0.65rem;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  margin-left: 0.4rem;
  font-weight: 600;
  text-transform: uppercase;
}

.partial-badge {
  display: inline-block;
  font-size: 0.65rem;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  margin-left: 0.4rem;
  font-weight: 600;
  text-transform: uppercase;
}

.returned-qty {
  color: #ef4444;
  font-weight: 600;
}

.no-return {
  color: #475569;
}

.returns-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.return-record {
  background: #0f172a;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.return-record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.return-record-left {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.return-id {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  font-family: monospace;
}

.return-date {
  font-size: 0.75rem;
  color: #64748b;
}

.return-amount {
  font-size: 1rem;
  font-weight: 700;
  color: #ef4444;
}

.return-record-details {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.return-method {
  font-size: 0.75rem;
  background: #1e293b;
  color: #94a3b8;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
}

.return-reason {
  font-size: 0.8rem;
  color: #64748b;
  font-style: italic;
}

.return-items {
  border-top: 1px solid #1e293b;
  padding-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.return-item-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #94a3b8;
}
</style>
