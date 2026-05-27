<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import authService from '../../services/authService'
import { useAuthStore } from '../../stores/authStore'

import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const toast = useToast()
const authStore = useAuthStore()

const isManagerOrOwner = computed(
  () => authStore.userRole === 'shop_owner' || authStore.userRole === 'shop_manager',
)

// ── State ─────────────────────────────────────────
const loading = ref(false)

// Personal info form
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const role = ref('')
const lastLogin = ref<string | null>(null)
const createdAt = ref('')
const savingProfile = ref(false)

// Password form
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const savingPassword = ref(false)
const currentPasswordError = ref('')
const passwordMatchError = ref('')

// PIN form
const pinDigits = ref(['', '', '', ''])
const pinInputRefs = ref<HTMLInputElement[]>([])
const savingPin = ref(false)
const pinSaved = ref(false)

// ── Computed ──────────────────────────────────────
const memberSince = computed(() => {
  if (!createdAt.value) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: authStore.shop?.timezone || 'UTC',
  }).format(new Date(createdAt.value))
})

const lastLoginDisplay = computed(() => {
  if (!lastLogin.value) return 'Never'
  const date = new Date(lastLogin.value)
  const today = new Date()
  const isToday =
    date.toLocaleDateString('en-US', { timeZone: authStore.shop?.timezone || 'UTC' }) ===
    today.toLocaleDateString('en-US', { timeZone: authStore.shop?.timezone || 'UTC' })

  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: authStore.shop?.timezone || 'UTC',
  }).format(date)

  if (isToday) return `Today at ${timeStr}`

  const dateStr = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: authStore.shop?.timezone || 'UTC',
  }).format(date)

  return `${dateStr} at ${timeStr}`
})

const roleDisplay = computed(() => {
  switch (role.value) {
    case 'shop_owner':
      return 'Shop Owner'
    case 'shop_manager':
      return 'Shop Manager'
    case 'cashier':
      return 'Cashier'
    default:
      return role.value
  }
})

// ── Methods ───────────────────────────────────────
async function loadProfile() {
  loading.value = true
  try {
    const response = await authService.getMe()
    if (response.success) {
      const user = response.data
      firstName.value = user.firstName
      lastName.value = user.lastName
      email.value = user.email
      phone.value = user.phone || ''
      role.value = user.role
      lastLogin.value = (user as any).lastLogin || null
      createdAt.value = (user as any).createdAt || ''
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load profile',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  savingProfile.value = true
  try {
    const payload: any = {}
    if (firstName.value !== authStore.user?.firstName) payload.firstName = firstName.value
    if (lastName.value !== authStore.user?.lastName) payload.lastName = lastName.value
    if (phone.value !== (authStore.user?.phone || '')) payload.phone = phone.value

    if (Object.keys(payload).length === 0) {
      toast.add({
        severity: 'info',
        summary: 'No Changes',
        detail: 'Nothing to update',
        life: 3000,
      })
      return
    }

    const response = await authService.updateProfile(payload)
    if (response.success) {
      // Update authStore user immediately
      if (authStore.user) {
        authStore.user.firstName = response.data.firstName
        authStore.user.lastName = response.data.lastName
        if (response.data.phone) authStore.user.phone = response.data.phone
      }
      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Profile updated successfully',
        life: 3000,
      })
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to update profile',
      life: 3000,
    })
  } finally {
    savingProfile.value = false
  }
}

async function savePassword() {
  currentPasswordError.value = ''
  passwordMatchError.value = ''

  if (newPassword.value.length < 8) {
    passwordMatchError.value = 'New password must be at least 8 characters'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordMatchError.value = 'Passwords do not match'
    return
  }

  savingPassword.value = true
  try {
    const response = await authService.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    if (response.success) {
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      toast.add({
        severity: 'success',
        summary: 'Password Updated',
        detail: 'Your password has been changed successfully',
        life: 3000,
      })
    }
  } catch (error: any) {
    const message = error.response?.data?.message || ''
    if (message.includes('incorrect')) {
      currentPasswordError.value = 'Current password is incorrect'
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: message || 'Failed to change password',
        life: 3000,
      })
    }
  } finally {
    savingPassword.value = false
  }
}

function onPinInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/\D/g, '')
  pinDigits.value[index] = value.slice(-1)
  if (value && index < 3) {
    pinInputRefs.value[index + 1]?.focus()
  }
}

function onPinKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !pinDigits.value[index] && index > 0) {
    pinInputRefs.value[index - 1]?.focus()
  }
}

async function savePin() {
  const pin = pinDigits.value.join('')
  if (pin.length < 4) {
    toast.add({
      severity: 'warn',
      summary: 'Incomplete PIN',
      detail: 'Please enter all 4 digits',
      life: 3000,
    })
    return
  }

  savingPin.value = true
  try {
    const response = await authService.setManagerPin(pin)
    if (response.success) {
      pinSaved.value = true
      pinDigits.value = ['', '', '', '']
      toast.add({
        severity: 'success',
        summary: 'PIN Saved',
        detail: 'Cashiers can now use this PIN for return approvals',
        life: 4000,
      })
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to save PIN',
      life: 3000,
    })
  } finally {
    savingPin.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <div class="profile-page">
    <Toast />

    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">My Profile</h1>
        <p class="page-subtitle">Manage your personal information and security</p>
      </div>
    </div>

    <!-- Loading -->
    <div class="loading-state" v-if="loading">
      <i class="pi pi-spin pi-spinner" />
      <p>Loading profile...</p>
    </div>

    <template v-else>
      <!-- ── Personal Information ── -->
      <div class="profile-card">
        <h2 class="card-title">Personal Information</h2>

        <div class="form-grid">
          <div class="field">
            <label>First Name</label>
            <InputText v-model="firstName" placeholder="First name" class="w-full" />
          </div>
          <div class="field">
            <label>Last Name</label>
            <InputText v-model="lastName" placeholder="Last name" class="w-full" />
          </div>
        </div>

        <div class="field">
          <label>Email</label>
          <div class="email-field">
            <InputText v-model="email" disabled class="w-full email-input" />
            <span class="email-lock"> <i class="pi pi-lock" /> Email cannot be changed </span>
          </div>
        </div>

        <div class="field">
          <label>Phone</label>
          <InputText v-model="phone" placeholder="+94771234567" class="w-full" />
        </div>

        <!-- Read-only info -->
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Role</span>
            <span class="info-value">{{ roleDisplay }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Member Since</span>
            <span class="info-value">{{ memberSince }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Last Login</span>
            <span class="info-value">{{ lastLoginDisplay }}</span>
          </div>
        </div>

        <div class="card-footer">
          <Button
            label="Save Changes"
            icon="pi pi-check"
            :loading="savingProfile"
            @click="saveProfile"
          />
        </div>
      </div>

      <!-- ── Change Password ── -->
      <div class="profile-card">
        <h2 class="card-title">Change Password</h2>

        <div class="field">
          <label>Current Password</label>
          <InputText
            v-model="currentPassword"
            type="password"
            placeholder="Enter current password"
            class="w-full"
            autocomplete="current-password"
          />
          <span class="field-error" v-if="currentPasswordError">
            {{ currentPasswordError }}
          </span>
        </div>

        <div class="field">
          <label>New Password</label>
          <InputText
            v-model="newPassword"
            type="password"
            placeholder="Min 8 characters"
            class="w-full"
            autocomplete="new-password"
          />
        </div>

        <div class="field">
          <label>Confirm New Password</label>
          <InputText
            v-model="confirmPassword"
            type="password"
            placeholder="Repeat new password"
            class="w-full"
            autocomplete="new-password"
          />
          <span class="field-error" v-if="passwordMatchError">
            {{ passwordMatchError }}
          </span>
        </div>

        <div class="card-footer">
          <Button
            label="Update Password"
            icon="pi pi-lock"
            severity="secondary"
            :loading="savingPassword"
            @click="savePassword"
          />
        </div>
      </div>

      <!-- ── Manager PIN ── -->
      <div class="profile-card" v-if="isManagerOrOwner">
        <h2 class="card-title">Manager PIN</h2>
        <p class="card-desc">
          Set a 4-digit PIN for approving returns at the POS terminal. Cashiers will enter this PIN
          when processing customer returns.
        </p>

        <div class="pin-section">
          <label class="pin-label">
            {{ pinSaved ? 'Update PIN' : 'Set PIN' }}
          </label>
          <div class="pin-inputs">
            <input
              v-for="(digit, index) in pinDigits"
              :key="index"
              :ref="
                (el) => {
                  if (el) pinInputRefs[index] = el as HTMLInputElement
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

        <div class="pin-success" v-if="pinSaved">
          <i class="pi pi-check-circle" />
          <span>PIN saved. Cashiers can now use this for return approvals.</span>
        </div>

        <div class="pin-tip">
          <i class="pi pi-info-circle" />
          <span>Never share your PIN with others. It authorizes financial transactions.</span>
        </div>

        <div class="card-footer">
          <Button
            :label="pinSaved ? 'Update PIN' : 'Save PIN'"
            icon="pi pi-shield"
            severity="warning"
            :loading="savingPin"
            @click="savePin"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 680px;
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

.loading-state {
  text-align: center;
  padding: 4rem;
  color: #475569;
}

.loading-state i {
  font-size: 2rem;
  margin-bottom: 1rem;
  display: block;
}

/* ── Cards ── */
.profile-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #334155;
}

.card-desc {
  font-size: 0.875rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid #334155;
}

/* ── Form ── */
.form-grid {
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

.field-error {
  font-size: 0.8rem;
  color: #ef4444;
}

.email-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.email-input {
  opacity: 0.6;
}

.email-lock {
  font-size: 0.75rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

/* ── Info Grid ── */
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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

/* ── PIN ── */
.pin-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pin-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #cbd5e1;
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

.pin-success {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  font-size: 0.875rem;
  color: #22c55e;
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
