<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'

const props = defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  back: []
  finish: [
    config: {
      primaryColor: string
      currency: string
      timezone: string
      logoUrl: string
    },
  ]
}>()

const config = ref({
  primaryColor: '#3b82f6',
  currency: 'USD',
  timezone: 'Asia/Colombo',
  logoUrl: '',
})

const colors = [
  { label: 'Blue', value: '#3b82f6', hex: '#3b82f6' },
  { label: 'Green', value: '#22c55e', hex: '#22c55e' },
  { label: 'Purple', value: '#8b5cf6', hex: '#8b5cf6' },
  { label: 'Red', value: '#ef4444', hex: '#ef4444' },
  { label: 'Orange', value: '#f59e0b', hex: '#f59e0b' },
  { label: 'Pink', value: '#ec4899', hex: '#ec4899' },
]

const currencies = [
  { label: 'USD — US Dollar', value: 'USD' },
  { label: 'LKR — Sri Lankan Rupee', value: 'LKR' },
  { label: 'EUR — Euro', value: 'EUR' },
  { label: 'GBP — British Pound', value: 'GBP' },
  { label: 'INR — Indian Rupee', value: 'INR' },
  { label: 'AUD — Australian Dollar', value: 'AUD' },
]

const timezones = [
  { label: 'Asia/Colombo (Sri Lanka)', value: 'Asia/Colombo' },
  { label: 'Asia/Kolkata (India)', value: 'Asia/Kolkata' },
  { label: 'UTC', value: 'UTC' },
  { label: 'America/New_York (EST)', value: 'America/New_York' },
  { label: 'Europe/London (GMT)', value: 'Europe/London' },
  { label: 'Asia/Dubai (UAE)', value: 'Asia/Dubai' },
  { label: 'Asia/Singapore', value: 'Asia/Singapore' },
]
</script>

<template>
  <div class="step-card">
    <div class="step-header">
      <p class="step-number">Step 3 of 3</p>
      <h2 class="step-title">Customize your shop</h2>
      <p class="step-desc">Set your preferences and branding</p>
    </div>

    <div class="config-form">
      <!-- Logo URL -->
      <div class="field">
        <label>Shop Logo URL <span class="optional">(optional)</span></label>
        <InputText
          v-model="config.logoUrl"
          placeholder="https://example.com/logo.png"
          class="w-full"
        />
        <small class="field-hint">Enter a URL to your shop logo image</small>
      </div>

      <!-- Primary Color -->
      <div class="field">
        <label>Primary Color</label>
        <div class="color-grid">
          <div
            v-for="color in colors"
            :key="color.value"
            class="color-swatch"
            :style="{ background: color.hex }"
            :class="{ selected: config.primaryColor === color.value }"
            @click="config.primaryColor = color.value"
          >
            <i v-if="config.primaryColor === color.value" class="pi pi-check" />
          </div>
        </div>
      </div>

      <!-- Currency -->
      <div class="field">
        <label>Currency</label>
        <Select
          v-model="config.currency"
          :options="currencies"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>

      <!-- Timezone -->
      <div class="field">
        <label>Timezone</label>
        <Select
          v-model="config.timezone"
          :options="timezones"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>
    </div>

    <!-- Navigation -->
    <div class="step-nav">
      <Button label="Back" severity="secondary" icon="pi pi-arrow-left" @click="emit('back')" />
      <Button
        label="Finish Setup"
        icon="pi pi-check-circle"
        icon-pos="right"
        :loading="loading"
        @click="emit('finish', config)"
      />
    </div>
  </div>
</template>

<style scoped>
.step-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 2rem;
}

.step-header {
  margin-bottom: 1.5rem;
}

.step-number {
  font-size: 0.8rem;
  color: #3b82f6;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.5rem;
}

.step-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.4rem;
}

.step-desc {
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 0;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2rem;
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

.optional {
  color: #475569;
  font-weight: 400;
  font-size: 0.8rem;
}

.field-hint {
  font-size: 0.75rem;
  color: #64748b;
}

/* Color swatches */
.color-grid {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.color-swatch {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid transparent;
  transition: all 0.2s;
}

.color-swatch:hover {
  transform: scale(1.1);
}

.color-swatch.selected {
  border-color: white;
  box-shadow: 0 0 0 2px #3b82f6;
}

.color-swatch .pi-check {
  color: white;
  font-size: 0.875rem;
  font-weight: 900;
}

.w-full {
  width: 100% !important;
}

.step-nav {
  display: flex;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid #334155;
}
</style>
