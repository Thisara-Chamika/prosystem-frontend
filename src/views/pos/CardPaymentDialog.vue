<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useStripe } from '../../composables/useStripe'
import paymentService from '../../services/paymentService'
import posService from '../../services/posService'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import type { CreateTransactionRequest } from '../../types'

const authStore = useAuthStore()

const props = defineProps<{
  visible: boolean
  totalAmount: number
  transactionRequest: Omit<CreateTransactionRequest, 'paymentMethod' | 'stripePaymentIntentId'>
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: [data: any]
}>()

// ── State ─────────────────────────────────────────
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)

let stripe: any = null
let elements: any = null
let cardElement: any = null

const isTooSmall = computed(() => props.totalAmount < 0.5)

// ── Mount / unmount Stripe Elements with the dialog's lifecycle ──
watch(
  () => props.visible,
  async (val) => {
    if (val) {
      errorMessage.value = null
      isProcessing.value = false
      if (!isTooSmall.value) {
        await nextTick()
        await mountCardElement()
      }
    } else {
      unmountCardElement()
    }
  },
)

async function mountCardElement() {
  if (!stripe) {
    stripe = await useStripe()
  }
  elements = stripe.elements()
  cardElement = elements.create('card', {
    style: {
      base: {
        // Explicit light-on-dark styling — Stripe's default is black text,
        // which would be the exact same invisible-text problem we already
        // fixed once on the Reports summary cards, just in a new component.
        color: '#f1f5f9',
        fontSize: '16px',
        '::placeholder': { color: '#64748b' },
      },
      invalid: { color: '#ef4444' },
    },
  })
  cardElement.mount('#card-element')
}

function unmountCardElement() {
  if (cardElement) {
    cardElement.unmount()
    cardElement = null
  }
}

onUnmounted(() => {
  unmountCardElement()
})

// ── Cancel ────────────────────────────────────────
function handleCancel() {
  if (isProcessing.value) return
  emit('update:visible', false)
}

// ── Charge ────────────────────────────────────────
async function handleCharge() {
  if (!cardElement || isProcessing.value) return
  isProcessing.value = true
  errorMessage.value = null

  try {
    // Step 1 — create the payment intent. If this throws, the card was NEVER charged.
    let intentRes
    try {
      intentRes = await paymentService.createIntent(props.totalAmount)
    } catch (intentError: any) {
      errorMessage.value =
        intentError.response?.data?.message ??
        'Could not reach the server. Please check your connection and try again.'
      return
    }

    // Step 2 — confirm the charge directly with Stripe. Card details never touch our backend.
    const result = await stripe.confirmCardPayment(intentRes.data.clientSecret, {
      payment_method: { card: cardElement },
    })

    if (result.error) {
      // Declined, expired, etc. — card was NOT successfully charged.
      errorMessage.value = result.error.message
      return
    }

    // Step 3 — the card IS charged at this point. A failure from here on needs
    // very different messaging than steps 1-2, because money already moved.
    try {
      const saleRes = await posService.createTransaction({
        ...props.transactionRequest,
        paymentMethod: 'card',
        stripePaymentIntentId: result.paymentIntent.id,
      })
      emit('success', saleRes.data)
    } catch (posError: any) {
      const msg = posError.response?.data?.message ?? ''
      errorMessage.value = msg.includes('automatically refunded')
        ? 'Your card was charged but the sale could not be completed. It has been automatically refunded. Please try the sale again.'
        : `Your card was charged, but completing the sale failed: ${msg}. Please check the Stripe dashboard and contact support if the charge was not refunded.`
    }
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    header="Card Payment"
    :style="{ width: '420px' }"
    modal
    :closable="!isProcessing"
    :closeOnEscape="!isProcessing"
    :dismissableMask="false"
  >
    <div class="card-dialog">
      <div class="top-row">
        <span class="test-badge"><i class="pi pi-flask" /> Test Mode</span>
      </div>

      <div class="total-due">
        <span class="total-label">Amount Due</span>
        <span class="total-amount">{{ authStore.formatCurrency(totalAmount) }}</span>
      </div>

      <div class="demo-note">
        <i class="pi pi-info-circle" />
        <span>
          Demo Note: Stripe test-mode payments process in USD regardless of shop currency — this is
          a portfolio limitation, not a real conversion.
        </span>
      </div>

      <div class="too-small-warning" v-if="isTooSmall">
        <i class="pi pi-exclamation-triangle" />
        <span>This order is too small to process as a card payment in test mode.</span>
      </div>

      <template v-else>
        <div class="field">
          <label>Card Details</label>
          <div id="card-element" class="card-element-mount"></div>
        </div>

        <div class="error-banner" v-if="errorMessage">
          <i class="pi pi-exclamation-circle" />
          <span>{{ errorMessage }}</span>
        </div>
      </template>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" :disabled="isProcessing" @click="handleCancel" />
      <Button
        v-if="!isTooSmall"
        label="Charge Now"
        icon="pi pi-credit-card"
        :loading="isProcessing"
        :disabled="isProcessing"
        @click="handleCharge"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.card-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 0.5rem 0;
}

.top-row {
  display: flex;
  justify-content: flex-end;
}

.test-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
}

.total-due {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #0f172a;
  border-radius: 8px;
  border: 1px solid #334155;
}

.total-label {
  font-size: 0.875rem;
  color: #94a3b8;
}

.total-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
}

.demo-note {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 8px;
  font-size: 0.8rem;
  color: #93c5fd;
  line-height: 1.4;
}

.too-small-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.875rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #94a3b8;
}

.card-element-mount {
  padding: 0.75rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
}

.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.85rem;
  line-height: 1.4;
}
</style>
