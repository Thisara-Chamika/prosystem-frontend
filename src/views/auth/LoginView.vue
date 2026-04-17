<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../../stores/authStore'

// PrimeVue components
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'

const authStore = useAuthStore()

// Form fields - ref() makes them reactive
// When these change, the UI updates automatically
const email = ref('')
const password = ref('')

async function handleLogin() {
  console.log('handleLogin called!', email.value, password.value)
  if (!email.value || !password.value) return
  await authStore.login(email.value, password.value)
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <!-- Logo / Brand -->
      <div class="login-header">
        <div class="brand-icon">
          <i class="pi pi-shopping-cart" />
        </div>
        <h1 class="brand-name">ProSystem</h1>
        <p class="brand-subtitle">Point of Sale Platform</p>
      </div>

      <!-- Error message -->
      <Message v-if="authStore.error" severity="error" :closable="false" class="error-message">
        {{ authStore.error }}
      </Message>

      <!-- Login Form -->
      <div class="login-form">
        <!-- Email field -->
        <div class="field">
          <label for="email">Email</label>
          <InputText
            id="email"
            v-model="email"
            type="email"
            placeholder="Enter your email"
            :disabled="authStore.loading"
            class="w-full"
            @keyup.enter="handleLogin"
          />
        </div>

        <!-- Password field -->
        <div class="field">
          <label for="password">Password</label>
          <Password
            id="password"
            v-model="password"
            placeholder="Enter your password"
            :feedback="false"
            :disabled="authStore.loading"
            toggleMask
            class="w-full"
            @keyup.enter="handleLogin"
          />
        </div>

        <!-- Login button -->
        <Button
          type="button"
          label="Sign In"
          icon="pi pi-sign-in"
          :loading="authStore.loading"
          :disabled="!email || !password"
          class="w-full login-btn"
          @click="handleLogin"
        />
      </div>

      <p class="login-footer">ProSystem &copy; 2025 — All rights reserved</p>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
}

.login-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.brand-icon {
  width: 64px;
  height: 64px;
  background: #3b82f6;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.brand-icon .pi {
  font-size: 1.8rem;
  color: white;
}

.brand-name {
  font-size: 1.8rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.25rem;
}

.brand-subtitle {
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 0;
}

.error-message {
  margin-bottom: 1.25rem;
}

.login-form {
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

.login-btn {
  margin-top: 0.5rem;
  height: 44px;
  font-size: 1rem;
  font-weight: 600;
}

.login-footer {
  text-align: center;
  color: #475569;
  font-size: 0.75rem;
  margin: 1.5rem 0 0;
}

/* Fix PrimeVue Password component width and icon position */
:deep(.p-password) {
  width: 100%;
}

:deep(.p-password-input) {
  width: 100%;
}
</style>
