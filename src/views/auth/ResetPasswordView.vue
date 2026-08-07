<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import authService from '../../services/authService'

import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'

const route = useRoute()
const router = useRouter()

const hasToken = ref(false)
const token = ref('')

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const submitted = ref(false)
const successMessage = ref('')
const apiErrorMessage = ref<string | null>(null)
const showRequestNewLink = ref(false)

// Client-side check — only shown once both fields have something typed,
// so we're not nagging the user before they've finished the first field.
const validationError = computed(() => {
  if (!newPassword.value || !confirmPassword.value) return null
  if (newPassword.value.length < 8) return 'Password must be at least 8 characters.'
  if (newPassword.value !== confirmPassword.value) return 'Passwords do not match.'
  return null
})

const canSubmit = computed(
  () => !!newPassword.value && !!confirmPassword.value && !validationError.value,
)

onMounted(() => {
  // Purely a URL check — no API call happens here at all (STATE A).
  const t = route.query.token
  if (typeof t === 'string' && t.length > 0) {
    token.value = t
    hasToken.value = true
    router.replace({ path: '/reset-password' })
  }
})

async function handleSubmit() {
  if (!canSubmit.value) return
  loading.value = true
  apiErrorMessage.value = null
  showRequestNewLink.value = false

  try {
    const response = await authService.resetPassword({
      token: token.value,
      newPassword: newPassword.value,
    })
    successMessage.value = response.message
    submitted.value = true
  } catch (error: any) {
    if (!error.response) {
      apiErrorMessage.value =
        'Could not reach the server. Please check your connection and try again.'
    } else {
      const msg = error.response.data?.message ?? 'Something went wrong. Please try again.'
      apiErrorMessage.value = msg
      // Only the token-related error gets the "request a new link" follow-up —
      // the password-length error means the link itself is still perfectly valid.
      showRequestNewLink.value = msg.includes('reset link')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="auth-card">
      <!-- STATE A — no token in URL at all -->
      <template v-if="!hasToken">
        <div class="state-icon-block">
          <i class="pi pi-exclamation-triangle warning-icon" />
          <h2 class="state-title">Invalid reset link</h2>
          <p class="state-text">This password reset link is invalid or incomplete.</p>
        </div>
        <Button
          label="Request a new reset link"
          icon="pi pi-arrow-right"
          class="w-full auth-btn"
          @click="router.push('/forgot-password')"
        />
      </template>

      <!-- STATE C — success -->
      <template v-else-if="submitted">
        <div class="state-icon-block">
          <i class="pi pi-check-circle success-icon" />
          <h2 class="state-title">Password reset successful!</h2>
          <p class="state-text">{{ successMessage }}</p>
        </div>
        <Button
          label="Go to Login"
          icon="pi pi-arrow-right"
          class="w-full auth-btn"
          @click="router.push('/login')"
        />
      </template>

      <!-- STATE B / D — the form itself, with an inline error if the API rejected it -->
      <template v-else>
        <div class="auth-header">
          <h1 class="auth-title">Reset your password</h1>
        </div>

        <Message v-if="apiErrorMessage" severity="error" :closable="false" class="error-message">
          {{ apiErrorMessage }}
        </Message>

        <div class="auth-form">
          <div class="field">
            <label for="newPassword">New Password</label>
            <Password
              id="newPassword"
              v-model="newPassword"
              placeholder="Enter new password"
              :feedback="false"
              :disabled="loading"
              toggleMask
              class="w-full"
            />
          </div>

          <div class="field">
            <label for="confirmPassword">Confirm Password</label>
            <Password
              id="confirmPassword"
              v-model="confirmPassword"
              placeholder="Confirm new password"
              :feedback="false"
              :disabled="loading"
              toggleMask
              class="w-full"
              @keyup.enter="handleSubmit"
            />
          </div>

          <p class="hint-text">Password must be at least 8 characters</p>

          <Message v-if="validationError" severity="warn" :closable="false" class="inline-warning">
            {{ validationError }}
          </Message>

          <Button
            type="button"
            label="Reset Password"
            icon="pi pi-check"
            :loading="loading"
            :disabled="!canSubmit"
            class="w-full auth-btn"
            @click="handleSubmit"
          />

          <p v-if="showRequestNewLink" class="back-link" @click="router.push('/forgot-password')">
            Request a new reset link →
          </p>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
}

.auth-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
}

.auth-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.auth-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
}

.error-message,
.inline-warning {
  margin-bottom: 1.25rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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

.hint-text {
  font-size: 0.8rem;
  color: #64748b;
  margin: -0.75rem 0 0;
}

.w-full {
  width: 100% !important;
}

.auth-btn {
  margin-top: 0.5rem;
  height: 44px;
  font-size: 1rem;
  font-weight: 600;
}

.state-icon-block {
  text-align: center;
  padding: 1rem 0 1.5rem;
}

.warning-icon {
  font-size: 3rem;
  color: #f59e0b;
  display: block;
  margin-bottom: 1rem;
}

.success-icon {
  font-size: 3rem;
  color: #22c55e;
  display: block;
  margin-bottom: 1rem;
}

.state-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.5rem;
}

.state-text {
  color: #94a3b8;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
}

.back-link {
  text-align: center;
  color: #3b82f6;
  cursor: pointer;
  font-size: 0.875rem;
  margin: 0.5rem 0 0;
}

.back-link:hover {
  text-decoration: underline;
}

:deep(.p-password) {
  width: 100%;
}

:deep(.p-password-input) {
  width: 100%;
}
</style>
