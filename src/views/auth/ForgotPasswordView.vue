<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import authService from '../../services/authService'

import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'

const router = useRouter()

const email = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const submitted = ref(false)
const successMessage = ref('')

async function handleSubmit() {
  if (!email.value) return
  loading.value = true
  errorMessage.value = null

  try {
    const response = await authService.forgotPassword(email.value)
    successMessage.value = response.message
    submitted.value = true
  } catch (error: any) {
    if (!error.response) {
      // No response at all reached the client — request never got to the server.
      errorMessage.value = 'Could not reach the server. Please check your connection and try again.'
    } else {
      // Covers the 429 rate-limit case — the spec says show that message as-is.
      errorMessage.value = error.response.data?.message ?? 'Something went wrong. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="auth-card">
      <template v-if="!submitted">
        <div class="auth-header">
          <h1 class="auth-title">Forgot your password?</h1>
          <p class="auth-subtitle">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        <Message v-if="errorMessage" severity="error" :closable="false" class="error-message">
          {{ errorMessage }}
        </Message>

        <div class="auth-form">
          <div class="field">
            <label for="email">Email</label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              placeholder="Enter your email"
              :disabled="loading"
              class="w-full"
              @keyup.enter="handleSubmit"
            />
          </div>

          <Button
            type="button"
            label="Send Reset Link"
            icon="pi pi-send"
            :loading="loading"
            :disabled="!email"
            class="w-full auth-btn"
            @click="handleSubmit"
          />
        </div>
      </template>

      <template v-else>
        <div class="success-state">
          <i class="pi pi-check-circle success-icon" />
          <h2 class="success-title">Check your email</h2>
          <p class="success-text">{{ successMessage }} It expires in 30 minutes.</p>
        </div>
      </template>

      <p class="back-link" @click="router.push('/login')">← Back to login</p>
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
  margin-bottom: 2rem;
}

.auth-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.5rem;
}

.auth-subtitle {
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.5;
}

.error-message {
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

.w-full {
  width: 100% !important;
}

.auth-btn {
  margin-top: 0.5rem;
  height: 44px;
  font-size: 1rem;
  font-weight: 600;
}

.success-state {
  text-align: center;
  padding: 1rem 0 1.5rem;
}

.success-icon {
  font-size: 3rem;
  color: #22c55e;
  display: block;
  margin-bottom: 1rem;
}

.success-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.5rem;
}

.success-text {
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
  margin: 1.5rem 0 0;
}

.back-link:hover {
  text-decoration: underline;
}
</style>
