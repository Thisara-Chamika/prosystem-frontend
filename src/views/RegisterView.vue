<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useRouter } from 'vue-router'

import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'

const authStore = useAuthStore()
const router = useRouter()

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  shopName: '',
  shopSlug: '',
  currency: 'USD',
  timezone: 'UTC',
})

const validationError = ref('')

// Auto generate slug from shop name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function onShopNameInput() {
  form.value.shopSlug = generateSlug(form.value.shopName)
}

function validate(): string | null {
  if (!form.value.firstName.trim()) return 'First name is required'
  if (!form.value.lastName.trim()) return 'Last name is required'
  if (!form.value.email.trim()) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) return 'Invalid email address'
  if (!form.value.password) return 'Password is required'
  if (form.value.password.length < 6) return 'Password must be at least 6 characters'
  if (form.value.password !== form.value.confirmPassword) return 'Passwords do not match'
  if (!form.value.shopName.trim()) return 'Shop name is required'
  if (!form.value.shopSlug.trim()) return 'Shop slug is required'
  if (!/^[a-z0-9-]+$/.test(form.value.shopSlug))
    return 'Slug can only contain lowercase letters, numbers and hyphens'
  return null
}

async function handleRegister() {
  validationError.value = ''
  const error = validate()
  if (error) {
    validationError.value = error
    return
  }
  await authStore.register({
    firstName: form.value.firstName,
    lastName: form.value.lastName,
    email: form.value.email,
    password: form.value.password,
    shopName: form.value.shopName,
    shopSlug: form.value.shopSlug,
    currency: form.value.currency,
    timezone: form.value.timezone,
  })
}
</script>

<template>
  <div class="register-container">
    <div class="register-card">
      <!-- Header -->
      <div class="register-header">
        <div class="brand-icon">
          <i class="pi pi-shopping-cart" />
        </div>
        <h1 class="brand-name">ProSystem</h1>
        <p class="brand-subtitle">Create your account</p>
        <p class="brand-desc">Start your ProSystem journey</p>
      </div>

      <!-- Error messages -->
      <Message v-if="validationError" severity="warn" :closable="false" class="error-message">
        {{ validationError }}
      </Message>
      <Message v-if="authStore.error" severity="error" :closable="false" class="error-message">
        {{ authStore.error }}
      </Message>

      <!-- Form -->
      <div class="register-form">
        <!-- Section: Personal Info -->
        <div class="section-label">Personal Information</div>

        <div class="form-row">
          <div class="field">
            <label>First Name *</label>
            <InputText
              v-model="form.firstName"
              placeholder="First name"
              class="w-full"
              :disabled="authStore.loading"
            />
          </div>
          <div class="field">
            <label>Last Name *</label>
            <InputText
              v-model="form.lastName"
              placeholder="Last name"
              class="w-full"
              :disabled="authStore.loading"
            />
          </div>
        </div>

        <div class="field">
          <label>Email Address *</label>
          <InputText
            v-model="form.email"
            type="email"
            placeholder="email@example.com"
            class="w-full"
            :disabled="authStore.loading"
          />
        </div>

        <div class="form-row">
          <div class="field">
            <label>Password *</label>
            <Password
              v-model="form.password"
              placeholder="Min. 6 characters"
              :feedback="false"
              toggleMask
              class="w-full"
              :disabled="authStore.loading"
            />
          </div>
          <div class="field">
            <label>Confirm Password *</label>
            <Password
              v-model="form.confirmPassword"
              placeholder="Repeat password"
              :feedback="false"
              toggleMask
              class="w-full"
              :disabled="authStore.loading"
            />
          </div>
        </div>

        <!-- Section: Shop Info -->
        <div class="section-label">Shop Information</div>

        <div class="field">
          <label>Shop Name *</label>
          <InputText
            v-model="form.shopName"
            placeholder="e.g. Fashion World"
            class="w-full"
            :disabled="authStore.loading"
            @input="onShopNameInput"
          />
        </div>

        <div class="field">
          <label>Shop Slug *</label>
          <IconField class="w-full">
            <InputIcon class="pi pi-link" />
            <InputText
              v-model="form.shopSlug"
              placeholder="fashion-world"
              class="w-full"
              :disabled="authStore.loading"
            />
          </IconField>
          <small class="field-hint">
            Unique identifier — auto-generated from shop name. Lowercase, numbers and hyphens only.
          </small>
        </div>

        <!-- Create Account Button -->
        <Button
          type="button"
          label="Create Account"
          icon="pi pi-user-plus"
          :loading="authStore.loading"
          :disabled="authStore.loading"
          class="w-full register-btn"
          @click="handleRegister"
        />
      </div>

      <!-- Footer -->
      <p class="register-footer">
        Already have an account?
        <span class="login-link" @click="router.push('/login')">Sign in</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  padding: 2rem 1rem;
}

.register-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 1.75rem 2.5rem;
  width: 100%;
  max-width: 860px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
}

.register-header {
  text-align: center;
  margin-bottom: 1rem;
}

.brand-icon {
  width: 48px;
  height: 48px;
  background: #3b82f6;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.5rem;
}

.brand-icon .pi {
  font-size: 1.5rem;
  color: white;
}

.brand-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.25rem;
}

.brand-subtitle {
  color: #f1f5f9;
  font-size: 1rem;
  font-weight: 500;
  margin: 0 0 0.25rem;
}

.brand-desc {
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0;
}

.error-message {
  margin-bottom: 1rem;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding-top: 0.25rem;
  border-top: 1px solid #334155;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #cbd5e1;
}

.field-hint {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.4;
}

.w-full {
  width: 100% !important;
}

:deep(.p-password) {
  width: 100%;
}

:deep(.p-password-input) {
  width: 100%;
}

.register-btn {
  margin-top: 0.5rem;
  height: 44px;
  font-size: 1rem;
  font-weight: 600;
}

.register-footer {
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
  margin: 0.75rem 0 0;
}

.login-link {
  color: #3b82f6;
  cursor: pointer;
  font-weight: 500;
  margin-left: 0.25rem;
}

.login-link:hover {
  text-decoration: underline;
}
</style>
