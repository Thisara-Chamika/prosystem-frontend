<script setup lang="ts">
import { ref, computed } from 'vue'
import posService from '../../services/posService'
import { useAuthStore } from '../../stores/authStore'
import type { Transaction, ProcessReturnRequest } from '../../types'

import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import ManagerApprovalDialog from './ManagerApprovalDialog.vue'
import ReturnSuccessDialog from './ReturnSuccessDialog.vue'

const toast = useToast()
const authStore = useAuthStore()

const props = defineProps<{
  transaction: Transaction
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

// ── Types ─────────────────────────────────────────
interface ReturnItem {
  itemId: string
  productId: string
  productName: string
  productSku: string
  originalQuantity: number
  returnQuantity: number
  unitPrice: string
  selected: boolean
  reason: string
}

// ── State ─────────────────────────────────────────
const returnItems = ref<ReturnItem[]>(
  (props.transaction.items || []).map((item) => ({
    itemId: item.itemId,
    productId: item.productId,
    productName: item.productName,
    productSku: item.productSku,
    originalQuantity: item.quantity,
    returnQuantity: 1,
    unitPrice: item.unitPrice,
    selected: false,
    reason: '',
  })),
)

const overallReason = ref('')
const refundMethod = ref<'cash' | 'card' | 'store_credit'>('cash')
const processing = ref(false)
const showApprovalDialog = ref(false)
const showSuccessDialog = ref(false)
const returnResult = ref<any>(null)

const reasonOptions = [
  { label: 'Wrong Size', value: 'Wrong Size' },
  { label: 'Defective Item', value: 'Defective Item' },
  { label: 'Wrong Item', value: 'Wrong Item' },
  { label: 'Changed Mind', value: 'Changed Mind' },
  { label: 'Other', value: 'Other' },
]

const refundMethodOptions = [
  { label: 'Cash', value: 'cash' },
  { label: 'Card', value: 'card' },
  { label: 'Store Credit', value: 'store_credit' },
]

// ── Computed ──────────────────────────────────────
const selectedItems = computed(() => returnItems.value.filter((item) => item.selected))

const totalRefund = computed(() =>
  selectedItems.value.reduce((sum, item) => {
    return sum + parseFloat(item.unitPrice) * item.returnQuantity
  }, 0),
)

const canSubmit = computed(() => selectedItems.value.length > 0)

const isCashier = computed(() => authStore.userRole === 'cashier')

// ── Methods ───────────────────────────────────────
function onItemToggle(item: ReturnItem) {
  if (!item.selected) {
    item.returnQuantity = 1
  }
}

function buildReturnPayload(approvedBy: string | null = null): ProcessReturnRequest {
  return {
    reason: overallReason.value || undefined,
    refundMethod: refundMethod.value,
    approvedBy: approvedBy,
    items: selectedItems.value.map((item) => ({
      productId: item.productId,
      transactionItemId: item.itemId,
      quantity: item.returnQuantity,
      reason: item.reason || undefined,
    })),
  }
}

async function submitReturn(approvedBy: string | null = null) {
  processing.value = true
  try {
    const payload = buildReturnPayload(approvedBy)
    const response = await posService.processReturn(props.transaction.transactionId, payload)
    if (response.success) {
      returnResult.value = response.data
      showApprovalDialog.value = false
      showSuccessDialog.value = true
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Return Failed',
      detail: error.response?.data?.message || 'Failed to process return',
      life: 5000,
    })
  } finally {
    processing.value = false
  }
}

function onContinue() {
  if (!canSubmit.value) {
    toast.add({
      severity: 'warn',
      summary: 'No Items Selected',
      detail: 'Please select at least one item to return',
      life: 3000,
    })
    return
  }

  if (isCashier.value) {
    // Cashier must go through manager approval
    showApprovalDialog.value = true
  } else {
    // Owner/Manager submits directly
    submitReturn(null)
  }
}

function onApprovalSuccess(managerId: string) {
  submitReturn(managerId)
}

function onReturnSuccessDone() {
  showSuccessDialog.value = false
  emit('success')
}
</script>

<template>
  <Dialog
    :visible="true"
    @update:visible="emit('close')"
    header="Process Return"
    :style="{ width: '620px' }"
    modal
    :closable="true"
  >
    <Toast />
    <div class="return-modal">
      <!-- Items Selection -->
      <div class="section">
        <h3 class="section-title">Select Items to Return</h3>
        <div class="items-list">
          <div
            v-for="item in returnItems"
            :key="item.itemId"
            class="return-item"
            :class="{ selected: item.selected }"
          >
            <div class="item-checkbox">
              <input
                type="checkbox"
                v-model="item.selected"
                @change="onItemToggle(item)"
                class="checkbox"
              />
            </div>

            <div class="item-info">
              <span class="item-name">{{ item.productName }}</span>
              <span class="item-sku">{{ item.productSku }}</span>
            </div>

            <div class="item-qty-section" v-if="item.selected">
              <label class="qty-label">Return Qty</label>
              <InputNumber
                v-model="item.returnQuantity"
                :min="1"
                :max="item.originalQuantity"
                showButtons
                class="qty-input"
              />
              <span class="qty-max">of {{ item.originalQuantity }}</span>
            </div>

            <div class="item-original-qty" v-else>
              <span class="qty-badge">Qty: {{ item.originalQuantity }}</span>
            </div>

            <div class="item-price">
              {{ authStore.formatCurrency(parseFloat(item.unitPrice)) }}
            </div>

            <!-- Per item reason -->
            <div class="item-reason" v-if="item.selected">
              <InputText
                v-model="item.reason"
                placeholder="Item reason (optional)"
                class="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Overall Reason -->
      <div class="section">
        <h3 class="section-title">Return Details</h3>
        <div class="form-row">
          <div class="field">
            <label>Overall Reason</label>
            <Select
              v-model="overallReason"
              :options="reasonOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select reason (optional)"
              class="w-full"
            />
          </div>
          <div class="field">
            <label>Refund Method *</label>
            <Select
              v-model="refundMethod"
              :options="refundMethodOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <!-- Refund Summary -->
      <div class="refund-summary" v-if="selectedItems.length > 0">
        <div class="summary-row">
          <span>Items Selected</span>
          <span>{{ selectedItems.length }}</span>
        </div>
        <div class="summary-row total">
          <span>Total Refund</span>
          <span>{{ authStore.formatCurrency(totalRefund) }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" @click="emit('close')" />
      <Button
        :label="isCashier ? 'Continue to Approval →' : 'Process Return'"
        icon="pi pi-replay"
        severity="warning"
        :disabled="!canSubmit"
        :loading="processing"
        @click="onContinue"
      />
    </template>
  </Dialog>

  <!-- Manager Approval Dialog -->
  <ManagerApprovalDialog
    v-if="showApprovalDialog"
    @close="showApprovalDialog = false"
    @approved="onApprovalSuccess"
  />

  <!-- Return Success Dialog -->
  <ReturnSuccessDialog
    v-if="showSuccessDialog && returnResult"
    :returnData="returnResult"
    @done="onReturnSuccessDone"
  />
</template>

<style scoped>
.return-modal {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.5rem 0;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.75rem;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.return-item {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  transition: border-color 0.2s;
}

.return-item.selected {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.05);
  grid-template-columns: auto 1fr auto auto;
  grid-template-rows: auto auto;
}

.return-item.selected .item-reason {
  grid-column: 1 / -1;
}

.item-checkbox {
  display: flex;
  align-items: center;
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #f59e0b;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.item-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f1f5f9;
}

.item-sku {
  font-size: 0.75rem;
  color: #64748b;
}

.item-qty-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.qty-label {
  font-size: 0.75rem;
  color: #94a3b8;
}

.qty-input {
  width: 100px;
}

.qty-max {
  font-size: 0.75rem;
  color: #64748b;
}

.item-original-qty {
  display: flex;
  align-items: center;
}

.qty-badge {
  font-size: 0.75rem;
  color: #64748b;
  background: #1e293b;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.item-price {
  font-size: 0.875rem;
  font-weight: 600;
  color: #94a3b8;
  text-align: right;
}

.item-reason {
  margin-top: 0.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #cbd5e1;
}

.refund-summary {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #94a3b8;
}

.summary-row.total {
  font-size: 1rem;
  font-weight: 700;
  color: #f59e0b;
  padding-top: 0.5rem;
  border-top: 1px solid #334155;
  margin-top: 0.25rem;
}

.w-full {
  width: 100% !important;
}
</style>
