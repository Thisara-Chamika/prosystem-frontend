<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'

const authStore = useAuthStore()

const props = defineProps<{
  visible: boolean
  totalAmount: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: []
}>()

// ── Types ─────────────────────────────────────────
type SupportedCurrency = 'LKR' | 'USD' | 'EUR' | 'GBP' | 'INR' | 'AUD'

const denomMap: Record<SupportedCurrency, number[]> = {
  LKR: [5000, 2000, 1000, 500, 100, 50, 20, 10, 5, 2, 1],
  USD: [100, 50, 20, 10, 5, 1],
  EUR: [500, 200, 100, 50, 20, 10, 5, 2, 1],
  GBP: [50, 20, 10, 5, 2, 1],
  INR: [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1],
  AUD: [100, 50, 20, 10, 5, 2, 1],
}

// ── State ─────────────────────────────────────────
const cashGiven = ref<number>(0)

// ── Computed ──────────────────────────────────────
const change = computed(() => {
  const c = cashGiven.value - props.totalAmount
  return c > 0 ? c : 0
})

const isEnoughCash = computed(() => cashGiven.value >= props.totalAmount)

const denominations = computed(() => {
  const currency = authStore.shop?.currency || 'USD'
  const supportedCurrencies = Object.keys(denomMap) as SupportedCurrency[]
  const safeCurrency: SupportedCurrency = supportedCurrencies.includes(
    currency as SupportedCurrency,
  )
    ? (currency as SupportedCurrency)
    : 'USD'

  const notes: number[] = denomMap[safeCurrency]
  let remaining = Math.round(change.value * 100) / 100
  const breakdown: { note: number; count: number }[] = []

  for (const note of notes) {
    if (remaining <= 0) break
    const count = Math.floor(remaining / note)
    if (count > 0) {
      breakdown.push({ note, count })
      remaining = Math.round((remaining - note * count) * 100) / 100
    }
  }

  return breakdown
})

// ── Watchers ──────────────────────────────────────
watch(
  () => props.visible,
  (val) => {
    if (val) cashGiven.value = 0
  },
)

// ── Methods ───────────────────────────────────────
function onConfirm() {
  emit('confirm')
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    header="Cash Payment"
    :style="{ width: '400px' }"
    modal
  >
    <div class="cash-dialog">
      <!-- Total Due -->
      <div class="total-due">
        <span class="total-label">Total Due</span>
        <span class="total-amount">{{ authStore.formatCurrency(totalAmount) }}</span>
      </div>

      <!-- Cash Given Input -->
      <div class="field">
        <label>Cash Given</label>
        <InputNumber
          v-model="cashGiven"
          :min="0"
          :minFractionDigits="2"
          :maxFractionDigits="2"
          class="w-full"
          autofocus
        />
      </div>

      <!-- Change Section -->
      <div
        class="change-section"
        :class="{
          enough: isEnoughCash,
          'not-enough': !isEnoughCash && cashGiven > 0,
        }"
      >
        <div class="change-row">
          <span>Change</span>
          <span class="change-amount">{{ authStore.formatCurrency(change) }}</span>
        </div>

        <!-- Denomination Breakdown -->
        <div class="denominations" v-if="change > 0 && denominations.length > 0">
          <div class="denom-title">Change Breakdown</div>
          <div v-for="item in denominations" :key="item.note" class="denom-row">
            <span>{{ item.count }}x</span>
            <span>{{ authStore.formatCurrency(item.note) }}</span>
          </div>
        </div>
      </div>

      <!-- Insufficient Cash Warning -->
      <div class="warning" v-if="cashGiven > 0 && !isEnoughCash">
        <i class="pi pi-exclamation-triangle" />
        <span>Cash given is less than total due</span>
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" @click="emit('update:visible', false)" />
      <Button
        label="Confirm Payment"
        icon="pi pi-check"
        :disabled="!isEnoughCash || cashGiven === 0"
        @click="onConfirm"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.cash-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.5rem 0;
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

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #334155;
}

.change-section {
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #0f172a;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.change-section.enough {
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.08);
}

.change-section.not-enough {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.08);
}

.change-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.change-row span:first-child {
  font-size: 0.875rem;
  color: #334155;
}

.change-amount {
  font-size: 1.25rem;
  font-weight: 700;
  color: #22c55e;
}

.denominations {
  border-top: 1px solid #334155;
  padding-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.denom-title {
  font-size: 0.75rem;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.denom-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #1e293b;
}

.warning {
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

.w-full {
  width: 100% !important;
}
</style>
