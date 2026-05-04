<script setup lang="ts">
const businessTypes = [
  {
    id: 'fashion-shop',
    name: 'Fashion Shop',
    icon: 'pi pi-tag',
    description: 'Clothing, accessories, size & color variants',
    color: '#8b5cf6',
  },
  {
    id: 'salon',
    name: 'Salon',
    icon: 'pi pi-heart',
    description: 'Hair, beauty services, appointments',
    color: '#ec4899',
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    icon: 'pi pi-star',
    description: 'Food & beverage, tables, kitchen orders',
    color: '#f59e0b',
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    icon: 'pi pi-plus-circle',
    description: 'Medicine, prescriptions, expiry tracking',
    color: '#22c55e',
  },
  {
    id: 'supermarket',
    name: 'Supermarket',
    icon: 'pi pi-shopping-cart',
    description: 'Grocery, weighing scale, bulk items',
    color: '#3b82f6',
  },
  {
    id: 'electronics-shop',
    name: 'Electronics',
    icon: 'pi pi-desktop',
    description: 'Devices, warranties, serial numbers',
    color: '#14b8a6',
  },
]

const props = defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  select: [type: string]
}>()
</script>

<template>
  <div class="step-card">
    <div class="step-header">
      <p class="step-number">Step 1 of 3</p>
      <h2 class="step-title">Choose your business type</h2>
      <p class="step-desc">This determines what features are available to you</p>
    </div>

    <div class="business-grid">
      <div
        v-for="type in businessTypes"
        :key="type.id"
        class="business-card"
        :class="{ disabled: loading }"
        @click="!loading && emit('select', type.id)"
      >
        <div class="business-icon" :style="{ background: type.color + '20', color: type.color }">
          <i :class="type.icon" />
        </div>
        <div class="business-info">
          <span class="business-name">{{ type.name }}</span>
          <span class="business-desc">{{ type.description }}</span>
        </div>
        <i class="pi pi-chevron-right arrow-icon" />
      </div>
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

.business-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.business-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.business-card:hover {
  border-color: #3b82f6;
  background: #1e3a5f;
  transform: translateY(-1px);
}

.business-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.business-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.business-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.business-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #f1f5f9;
}

.business-desc {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.3;
}

.arrow-icon {
  color: #475569;
  font-size: 0.875rem;
}
</style>
