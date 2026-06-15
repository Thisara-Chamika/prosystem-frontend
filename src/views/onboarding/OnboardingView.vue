<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import shopService from '../../services/shopService'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

import BusinessTypeStep from './steps/BusinessTypeStep.vue'
import PluginsStep from './steps/PluginsStep.vue'
import ConfigureStep from './steps/ConfigureStep.vue'
import { useAuthStore } from '../../stores/authStore'
import CategoriesPreviewStep from './steps/CategoriesPreviewStep.vue'

const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()

// ── State ─────────────────────────────────────────
const currentStep = ref(1)
const loading = ref(false)
const showCategoriesPreview = ref(false)

// Step 1 state
const selectedBusinessType = ref('')

// Step 2 state
const availablePlugins = ref<any[]>([])
const activePlugins = ref<string[]>([])

// Step 3 state
const configuration = ref({
  primaryColor: '#3b82f6',
  currency: 'USD',
  timezone: 'Asia/Colombo',
  logoUrl: '',
})

const steps = [
  { number: 1, label: 'Business Type' },
  { number: 2, label: 'Features' },
  { number: 3, label: 'Configure' },
]

// ── Step 1 handlers ───────────────────────────────
async function onBusinessTypeSelected(type: string) {
  loading.value = true
  try {
    const response = await shopService.setBusinessType(type)
    if (response.success) {
      selectedBusinessType.value = type
      // Load plugins in background while showing preview
      const pluginsResponse = await shopService.getAvailablePlugins()
      if (pluginsResponse.success) {
        availablePlugins.value = pluginsResponse.data.availablePlugins
        activePlugins.value = pluginsResponse.data.activePlugins
      }
      // Show categories preview before moving to plugins step
      showCategoriesPreview.value = true
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to set business type',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

// ── Step 2 handlers ───────────────────────────────
async function onPluginToggled(pluginId: string, active: boolean) {
  try {
    const action = active ? 'add' : 'remove'
    await shopService.togglePlugin(pluginId, action)
    if (active) {
      activePlugins.value = [...activePlugins.value, pluginId]
    } else {
      activePlugins.value = activePlugins.value.filter((p) => p !== pluginId)
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to update plugin',
      life: 3000,
    })
  }
}

function onPluginsNext() {
  currentStep.value = 3
}

function onCategoriesPreviewNext() {
  showCategoriesPreview.value = false
  currentStep.value = 2
}

// ── Step 3 handlers ───────────────────────────────
async function onFinishSetup(config: typeof configuration.value) {
  loading.value = true
  try {
    // Save configuration
    await shopService.updateConfiguration({
      primaryColor: config.primaryColor,
      currency: config.currency,
      timezone: config.timezone,
      logoUrl: config.logoUrl || undefined,
    })

    // Complete onboarding
    await shopService.completeOnboarding()
    await authStore.fetchCurrentUser()

    toast.add({
      severity: 'success',
      summary: "You're all set!",
      detail: 'Your shop is ready. Welcome to ProSystem!',
      life: 3000,
    })

    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to complete setup',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

function goBack() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}
</script>

<template>
  <div class="onboarding-container">
    <Toast />

    <!-- Header -->
    <div class="onboarding-header">
      <div class="brand">
        <div class="brand-icon">
          <i class="pi pi-shopping-cart" />
        </div>
        <span class="brand-name">ProSystem</span>
      </div>
    </div>

    <!-- Step Indicator -->
    <div class="step-indicator">
      <div v-for="step in steps" :key="step.number" class="step-item">
        <div
          class="step-circle"
          :class="{
            active: currentStep === step.number,
            completed: currentStep > step.number,
          }"
        >
          <i v-if="currentStep > step.number" class="pi pi-check" />
          <span v-else>{{ step.number }}</span>
        </div>
        <span class="step-label" :class="{ active: currentStep === step.number }">
          {{ step.label }}
        </span>
        <!-- Connector line -->
        <div
          v-if="step.number < steps.length"
          class="step-connector"
          :class="{ completed: currentStep > step.number }"
        />
      </div>
    </div>

    <!-- Step Content -->
    <div class="step-content">
      <!-- Step 1: Business Type -->
      <BusinessTypeStep
        v-if="currentStep === 1 && !showCategoriesPreview"
        :loading="loading"
        @select="onBusinessTypeSelected"
      />

      <!-- Step 1.5: Categories Preview -->
      <CategoriesPreviewStep
        v-if="currentStep === 1 && showCategoriesPreview"
        :businessType="selectedBusinessType"
        @next="onCategoriesPreviewNext"
      />

      <!-- Step 2: Plugins -->
      <PluginsStep
        v-else-if="currentStep === 2"
        :plugins="availablePlugins"
        :activePlugins="activePlugins"
        :businessType="selectedBusinessType"
        @toggle="onPluginToggled"
        @back="goBack"
        @next="onPluginsNext"
      />

      <!-- Step 3: Configure -->
      <ConfigureStep
        v-else-if="currentStep === 3"
        :loading="loading"
        @back="goBack"
        @finish="onFinishSetup"
      />
    </div>
  </div>
</template>

<style scoped>
.onboarding-container {
  min-height: 100vh;
  background: #0f172a;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem;
}

.onboarding-header {
  width: 100%;
  max-width: 760px;
  margin-bottom: 2rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon {
  width: 36px;
  height: 36px;
  background: #3b82f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
}

.brand-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f1f5f9;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  align-items: center;
  margin-bottom: 2.5rem;
  width: 100%;
  max-width: 500px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  position: relative;
  flex: 1;
}

.step-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #334155;
  background: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  transition: all 0.3s;
  z-index: 1;
}

.step-circle.active {
  border-color: #3b82f6;
  background: #3b82f6;
  color: white;
}

.step-circle.completed {
  border-color: #22c55e;
  background: #22c55e;
  color: white;
}

.step-label {
  font-size: 0.75rem;
  color: #64748b;
  white-space: nowrap;
}

.step-label.active {
  color: #3b82f6;
  font-weight: 600;
}

.step-connector {
  position: absolute;
  top: 18px;
  left: 60%;
  right: -40%;
  height: 2px;
  background: #334155;
  transition: background 0.3s;
}

.step-connector.completed {
  background: #22c55e;
}

/* Step Content */
.step-content {
  width: 100%;
  max-width: 760px;
}
</style>
