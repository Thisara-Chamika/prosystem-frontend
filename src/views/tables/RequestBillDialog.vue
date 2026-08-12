<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import tableService from '../../services/tableService'
import CashPaymentDialog from '../pos/CashPaymentDialog.vue'
import CardPaymentDialog from '../pos/CardPaymentDialog.vue'

import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const authStore = useAuthStore()
const toast = useToast()

const props = defineProps<{
  visible: boolean
  order: any
  tableNumber: number | string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: [data: any]
}>()

// ── Bill math — matches the confirmed backend formula exactly ──
const billItems = computed(() => (props.order?.items ?? []).filter((i: any) => i.isActive))

const subtotal = computed(() =>
  billItems.value.reduce((sum: number, i: any) => sum + parseFloat(i.unitPrice) * i.quantity, 0),
)

const tax = computed(() =>
  billItems.value.reduce(
    (sum: number, i: any) =>
      sum + parseFloat(i.unitPrice) * i.quantity * (parseFloat(i.taxRate ?? 0) / 100),
    0,
  ),
)

const total = computed(() => subtotal.value + tax.value)

// ── Split bill — display only, never changes what's actually charged ──
const splitEnabled = ref(false)
const splitCount = ref(2)

const amountPerPerson = computed(() => {
  if (!splitEnabled.value || splitCount.value < 1) return 0
  return total.value / splitCount.value
})

// ── Payment method — same pattern as regular POS ──
const paymentMethod = ref<'cash' | 'card' | 'online' | 'mixed'>('cash')

const paymentMethods = computed(() => {
  const methods = [{ label: 'Cash', value: 'cash' }]
  if (authStore.hasPlugin('card-payments')) methods.push({ label: 'Card', value: 'card' })
  if (authStore.hasPlugin('online-payments')) methods.push({ label: 'Online', value: 'online' })
  if (authStore.hasPlugin('card-payments') && authStore.hasPlugin('online-payments')) {
    methods.push({ label: 'Mixed', value: 'mixed' })
  }
  return methods
})

const showCashDialog = ref(false)
const showCardDialog = ref(false)
const submittingDirect = ref(false)

function checkoutBody(overrides: Record<string, any> = {}) {
  return {
    paymentMethod: paymentMethod.value,
    ...(splitEnabled.value && splitCount.value > 1 ? { splitCount: splitCount.value } : {}),
    ...overrides,
  }
}

function proceedToPayment() {
  if (billItems.value.length === 0) return

  if (paymentMethod.value === 'cash') {
    emit('update:visible', false)
    showCashDialog.value = true
  } else if (paymentMethod.value === 'card') {
    emit('update:visible', false)
    showCardDialog.value = true
  } else {
    // online / mixed — no dedicated dialog exists for these in regular POS
    // either; same direct-submit fallback carried over here for consistency.
    submitDirect()
  }
}

async function submitDirect() {
  submittingDirect.value = true
  try {
    const res = await tableService.checkoutOrder(props.order.orderId, checkoutBody())
    if (res.success) {
      emit('update:visible', false)
      emit('success', res.data)
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Checkout Failed',
      detail: error.response?.data?.message || 'Failed to complete checkout',
      life: 5000,
    })
  } finally {
    submittingDirect.value = false
  }
}

async function onCashConfirm() {
  try {
    const res = await tableService.checkoutOrder(props.order.orderId, checkoutBody())
    if (res.success) emit('success', res.data)
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Checkout Failed',
      detail: error.response?.data?.message || 'Failed to complete checkout',
      life: 5000,
    })
  }
}

// Handed to CardPaymentDialog — it calls this once Stripe confirms the charge.
function submitCardPayment(stripePaymentIntentId: string) {
  return tableService
    .checkoutOrder(props.order.orderId, checkoutBody({ stripePaymentIntentId }))
    .then((r) => r.data)
}

function onCardSuccess(data: any) {
  emit('success', data)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    :header="`Request Bill — Table ${tableNumber}`"
    :style="{ width: '420px' }"
    modal
  >
    <Toast />
    <div class="bill-dialog">
      <div class="bill-items">
        <div v-for="item in billItems" :key="item.orderItemId" class="bill-item-row">
          <span>{{ item.productName }} x{{ item.quantity }}</span>
          <span>{{ authStore.formatCurrency(parseFloat(item.unitPrice) * item.quantity) }}</span>
        </div>
      </div>

      <div class="bill-totals">
        <div class="bill-total-row">
          <span>Subtotal</span>
          <span>{{ authStore.formatCurrency(subtotal) }}</span>
        </div>
        <div class="bill-total-row">
          <span>Tax</span>
          <span>{{ authStore.formatCurrency(tax) }}</span>
        </div>
        <div class="bill-total-row grand">
          <span>Total</span>
          <span>{{ authStore.formatCurrency(total) }}</span>
        </div>
      </div>

      <div class="split-section">
        <div class="split-toggle">
          <Checkbox v-model="splitEnabled" binary inputId="split" />
          <label for="split">Split bill?</label>
        </div>
        <div class="split-detail" v-if="splitEnabled">
          <span>Split between</span>
          <div class="qty-controls">
            <Button
              icon="pi pi-minus"
              size="small"
              severity="secondary"
              :disabled="splitCount <= 2"
              @click="splitCount = Math.max(2, splitCount - 1)"
            />
            <span class="qty-value">{{ splitCount }}</span>
            <Button
              icon="pi pi-plus"
              size="small"
              severity="secondary"
              :disabled="splitCount >= 20"
              @click="splitCount = Math.min(20, splitCount + 1)"
            />
          </div>
          <span>people</span>
        </div>
        <p class="split-note" v-if="splitEnabled">
          {{ authStore.formatCurrency(amountPerPerson) }} per person — for reference only, one
          payment covers the full total
        </p>
      </div>

      <div class="payment-method-section">
        <label class="section-label">Payment Method</label>
        <div class="payment-buttons">
          <button
            v-for="method in paymentMethods"
            :key="method.value"
            class="payment-btn"
            :class="{ active: paymentMethod === method.value }"
            @click="paymentMethod = method.value as any"
          >
            {{ method.label }}
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" @click="emit('update:visible', false)" />
      <Button
        label="Proceed to Payment"
        icon="pi pi-arrow-right"
        iconPos="right"
        :loading="submittingDirect"
        :disabled="billItems.length === 0"
        @click="proceedToPayment"
      />
    </template>
  </Dialog>

  <CashPaymentDialog
    v-model:visible="showCashDialog"
    :totalAmount="total"
    @confirm="onCashConfirm"
  />

  <CardPaymentDialog
    v-model:visible="showCardDialog"
    :totalAmount="total"
    :submitPayment="submitCardPayment"
    @success="onCardSuccess"
  />
</template>

<style scoped>
.bill-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 0.5rem 0;
}
.bill-items {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #334155;
}
.bill-item-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #4b5665;
}
.bill-totals {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.bill-total-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #94a3b8;
}
.bill-total-row.grand {
  font-size: 1.1rem;
  font-weight: 700;
  color: #4b5665;
  padding-top: 0.4rem;
  border-top: 1px solid #334155;
}
.split-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem;
  background: #0f172a;
  border-radius: 8px;
  border: 1px solid #334155;
}
.split-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.split-toggle label {
  font-size: 0.875rem;
  color: #cbd5e1;
  cursor: pointer;
}

.split-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem;
  background: #22293b;
  border-radius: 8px;
  border: 1px solid #c7ccd4;
  overflow: hidden;
}

.split-detail {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #cbd5e1;
}

.qty-controls {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.qty-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: #f1f5f9;
  min-width: 20px;
  text-align: center;
}

.split-note {
  font-size: 0.8rem;
  color: #c4c9d0;
  margin: 0;
}
.payment-method-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.section-label {
  font-size: 0.8rem;
  color: #737d8c;
}
.payment-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 0.5rem;
}
.payment-btn {
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #0f172a;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}
.payment-btn:hover {
  border-color: #3b82f6;
  color: #f1f5f9;
}
.payment-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}
</style>
