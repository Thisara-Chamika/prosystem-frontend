<script setup lang="ts">
import { useAuthStore } from '../../stores/authStore'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

const authStore = useAuthStore()

const props = defineProps<{
  returnData: {
    return: {
      returnId: string
      refundMethod: string
      totalRefund: string
      createdAt: string
    }
    totalRefund: string
    refundMethod: string
    approvedBy: string | null
    transactionStatus: string
  }
}>()

const emit = defineEmits<{
  done: []
}>()

function formatRefundMethod(method: string): string {
  switch (method) {
    case 'cash': return 'Cash'
    case 'card': return 'Card'
    case 'store_credit': return 'Store Credit'
    default: return method
  }
}
</script>

<template>
  <Dialog
    :visible="true"
    @update:visible="emit('done')"
    header="Return Processed"
    :style="{ width: '420px' }"
    modal
    :closable="false"
  >
    <div class="success-dialog">

      <!-- Success Icon -->
      <div class="success-header">
        <i class="pi pi-check-circle success-icon" />
        <h3>Return Successful!</h3>
        <p class="return-id">Return ID: {{ returnData.return.returnId }}</p>
      </div>

      <!-- Return Details -->
      <div class="return-details">
        <div class="detail-row">
          <span class="detail-label">Refund Amount</span>
          <span class="detail-value refund-amount">
            {{ authStore.formatCurrency(parseFloat(returnData.totalRefund)) }}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Refund Method</span>
          <span class="detail-value">
            {{ formatRefundMethod(returnData.refundMethod) }}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Transaction Status</span>
          <span class="detail-value status-value">
            {{ returnData.transactionStatus === 'partial_refund' ? 'Partial Refund' : 'Fully Refunded' }}
          </span>
        </div>
        <div class="detail-row" v-if="returnData.approvedBy">
          <span class="detail-label">Approved By</span>
          <span class="detail-value">{{ returnData.approvedBy }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">
            {{ authStore.formatDate(returnData.return.createdAt) }}
          </span>
        </div>
      </div>

      <!-- Inventory Notice -->
      <div class="inventory-notice">
        <i class="pi pi-box" />
        <span>Inventory has been automatically restocked.</span>
      </div>

    </div>

    <template #footer>
      <Button
        label="Print Return Receipt"
        icon="pi pi-print"
        severity="secondary"
        outlined
      />
      <Button
        label="Back to Transactions"
        icon="pi pi-arrow-left"
        @click="emit('done')"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.success-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.5rem 0;
}

.success-header {
  text-align: center;
  padding: 1rem 0;
}

.success-icon {
  font-size: 3.5rem;
  color: #22c55e;
  display: block;
  margin-bottom: 0.75rem;
}

.success-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.5rem;
}

.return-id {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0;
  font-family: monospace;
}

.return-details {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 0.8rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f1f5f9;
}

.refund-amount {
  font-size: 1.1rem;
  color: #22c55e;
}

.status-value {
  color: #f59e0b;
}

.inventory-notice {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  font-size: 0.875rem;
  color: #22c55e;
}

.inventory-notice .pi {
  font-size: 1rem;
  flex-shrink: 0;
}
</style>