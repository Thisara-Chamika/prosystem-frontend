<script setup lang="ts">
import { ref, onMounted } from 'vue'
import authService from '../../services/authService'
import type { Manager } from '../../types'

import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const toast = useToast()

const emit = defineEmits<{
  close: []
  approved: [managerId: string]
}>()

// ── State ─────────────────────────────────────────
const managers = ref<Manager[]>([])
const loadingManagers = ref(false)
const hasPinManagers = ref(false)

// PIN input state
const pinDigits = ref(['', '', '', ''])
const pinInputs = ref<HTMLInputElement[]>([])
const verifying = ref(false)

// Dropdown state (fallback when no PIN)
const selectedManagerId = ref<string | null>(null)
const submitting = ref(false)

// ── Methods ───────────────────────────────────────
async function loadManagers() {
  loadingManagers.value = true
  try {
    const response = await authService.getManagers()
    if (response.success) {
      managers.value = response.data
      hasPinManagers.value = response.data.some((m: Manager) => m.hasPin)
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load managers',
      life: 3000,
    })
  } finally {
    loadingManagers.value = false
  }
}

function onPinInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/\D/g, '')
  pinDigits.value[index] = value.slice(-1)

  // Auto advance to next input
  if (value && index < 3) {
    pinInputs.value[index + 1]?.focus()
  }
}

function onPinKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !pinDigits.value[index] && index > 0) {
    pinInputs.value[index - 1]?.focus()
  }
}

function getPinValue(): string {
  return pinDigits.value.join('')
}

async function verifyPin() {
  const pin = getPinValue()
  if (pin.length < 4) {
    toast.add({
      severity: 'warn',
      summary: 'Incomplete PIN',
      detail: 'Please enter all 4 digits',
      life: 3000,
    })
    return
  }

  verifying.value = true
  try {
    const response = await authService.verifyManagerPin(pin)
    if (response.success) {
      toast.add({
        severity: 'success',
        summary: 'Approved',
        detail: `Approved by ${response.data.firstName} ${response.data.lastName}`,
        life: 2000,
      })
      emit('approved', response.data.userId)
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Invalid PIN',
      detail: error.response?.data?.message || 'PIN verification failed',
      life: 3000,
    })
    // Clear PIN on failure
    pinDigits.value = ['', '', '', '']
    pinInputs.value[0]?.focus()
  } finally {
    verifying.value = false
  }
}

async function submitWithManager() {
  if (!selectedManagerId.value) {
    toast.add({
      severity: 'warn',
      summary: 'Required',
      detail: 'Please select an approving manager',
      life: 3000,
    })
    return
  }

  submitting.value = true
  emit('approved', selectedManagerId.value)
  submitting.value = false
}

onMounted(() => {
  loadManagers()
})
</script>

<template>
  <Dialog
    :visible="true"
    @update:visible="emit('close')"
    header="Manager Approval Required"
    :style="{ width: '420px' }"
    modal
  >
    <Toast />

    <div class="approval-dialog">
      <!-- Loading -->
      <div class="loading-state" v-if="loadingManagers">
        <i class="pi pi-spin pi-spinner" />
        <p>Loading...</p>
      </div>

      <template v-else>
        <!-- Scenario A — PIN available -->
        <template v-if="hasPinManagers">
          <div class="approval-info">
            <i class="pi pi-shield approval-icon" />
            <p>Ask a manager to enter their 4-digit PIN to approve this return.</p>
          </div>

          <div class="pin-section">
            <label class="pin-label">Manager PIN</label>
            <div class="pin-inputs">
              <input
                v-for="(digit, index) in pinDigits"
                :key="index"
                :ref="
                  (el) => {
                    if (el) pinInputs[index] = el as HTMLInputElement
                  }
                "
                type="password"
                inputmode="numeric"
                maxlength="1"
                class="pin-box"
                :value="digit"
                @input="onPinInput(index, $event)"
                @keydown="onPinKeydown(index, $event)"
              />
            </div>
          </div>
        </template>

        <!-- Scenario B — No PIN, use dropdown -->
        <template v-else>
          <div class="approval-info">
            <i class="pi pi-user approval-icon" />
            <p>Select the manager approving this return.</p>
          </div>

          <div class="field">
            <label>Approving Manager</label>
            <Select
              v-model="selectedManagerId"
              :options="managers"
              optionLabel="firstName"
              optionValue="userId"
              placeholder="Select manager"
              class="w-full"
            >
              <template #option="{ option }">
                {{ option.firstName }} {{ option.lastName }}
                <span class="role-badge">{{ option.role }}</span>
              </template>
              <template #value="{ value }">
                <span v-if="value">
                  {{ managers.find((m) => m.userId === value)?.firstName }}
                  {{ managers.find((m) => m.userId === value)?.lastName }}
                </span>
                <span v-else>Select manager</span>
              </template>
            </Select>
          </div>

          <div class="pin-tip">
            <i class="pi pi-info-circle" />
            <span>Ask manager to set a PIN in profile settings for faster approvals.</span>
          </div>
        </template>
      </template>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" @click="emit('close')" />
      <Button
        v-if="hasPinManagers"
        label="Approve Return"
        icon="pi pi-check"
        severity="warning"
        :loading="verifying"
        @click="verifyPin"
      />
      <Button
        v-else
        label="Approve Return"
        icon="pi pi-check"
        severity="warning"
        :loading="submitting"
        @click="submitWithManager"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.approval-dialog {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.5rem 0;
}

.loading-state {
  text-align: center;
  padding: 2rem;
  color: #475569;
}

.approval-info {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
}

.approval-icon {
  font-size: 1.25rem;
  color: #f59e0b;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.approval-info p {
  font-size: 0.875rem;
  color: #cbd5e1;
  margin: 0;
  line-height: 1.5;
}

.pin-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}

.pin-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #cbd5e1;
  align-self: flex-start;
}

.pin-inputs {
  display: flex;
  gap: 0.75rem;
}

.pin-box {
  width: 56px;
  height: 56px;
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  background: #0f172a;
  border: 2px solid #334155;
  border-radius: 8px;
  color: #f1f5f9;
  outline: none;
  transition: border-color 0.2s;
}

.pin-box:focus {
  border-color: #f59e0b;
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

.role-badge {
  font-size: 0.7rem;
  color: #64748b;
  margin-left: 0.5rem;
}

.pin-tip {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  font-size: 0.8rem;
  color: #64748b;
}

.pin-tip .pi {
  color: #3b82f6;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.w-full {
  width: 100% !important;
}
</style>
