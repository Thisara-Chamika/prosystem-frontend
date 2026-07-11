<script setup lang="ts">
import Button from 'primevue/button'

const props = defineProps<{
  plugins: any[]
  businessType: string
}>()

const emit = defineEmits<{
  next: []
  back: []
}>()

const businessEmoji: Record<string, string> = {
  'fashion-shop': '👗',
  restaurant: '🍕',
  salon: '✂️',
  pharmacy: '💊',
  supermarket: '🛒',
  'electronics-shop': '📱',
}

const businessName: Record<string, string> = {
  'fashion-shop': 'Fashion Shop',
  restaurant: 'Restaurant',
  salon: 'Salon',
  pharmacy: 'Pharmacy',
  supermarket: 'Supermarket',
  'electronics-shop': 'Electronics Shop',
}
</script>

<template>
  <div class="step-card">
    <div class="step-header">
      <p class="step-number">Step 2 of 3</p>
      <h2 class="step-title">{{ businessEmoji[businessType] || '🎉' }} Great choice!</h2>
      <p class="step-desc">
        We've set up your <strong>{{ businessName[businessType] || businessType }}</strong> with:
      </p>
    </div>

    <div class="plugins-list">
      <div v-for="plugin in plugins" :key="plugin.id" class="plugin-item">
        <i class="pi pi-check-circle plugin-check" />
        <div class="plugin-info">
          <span class="plugin-name">{{ plugin.icon }} {{ plugin.name }}</span>
          <span class="plugin-desc">{{ plugin.description }}</span>
        </div>
      </div>

      <div v-if="plugins.length === 0" class="empty-state">
        <p>No additional features to set up.</p>
      </div>
    </div>

    <div class="customize-note">
      <i class="pi pi-info-circle" />
      <span>You can add or remove features anytime from <strong>Settings → Plugins</strong></span>
    </div>

    <div class="step-nav">
      <Button label="Back" severity="secondary" icon="pi pi-arrow-left" @click="emit('back')" />
      <Button
        label="Continue to Setup"
        icon="pi pi-arrow-right"
        icon-pos="right"
        @click="emit('next')"
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
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.step-number {
  font-size: 0.8rem;
  color: #3b82f6;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.step-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
}

.step-desc {
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.5;
}

.step-desc strong {
  color: #f1f5f9;
}

.plugins-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.plugin-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
}

.plugin-check {
  color: #22c55e;
  font-size: 1.1rem;
  margin-top: 0.15rem;
  flex-shrink: 0;
}

.plugin-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.plugin-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #f1f5f9;
}

.plugin-desc {
  font-size: 0.8rem;
  color: #64748b;
}

.empty-state {
  text-align: center;
  padding: 1rem;
  color: #475569;
  font-size: 0.875rem;
}

.customize-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  font-size: 0.8rem;
  color: #94a3b8;
}

.customize-note .pi {
  color: #3b82f6;
  flex-shrink: 0;
}

.customize-note strong {
  color: #f1f5f9;
}

.step-nav {
  display: flex;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid #334155;
}
</style>
