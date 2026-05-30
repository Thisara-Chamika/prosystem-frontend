<script setup lang="ts">
import { ref, onMounted } from 'vue'
import categoryService from '../../../services/categoryService'
import Button from 'primevue/button'

const props = defineProps<{
  businessType: string
}>()

const emit = defineEmits<{
  next: []
}>()

const categories = ref<string[]>([])
const loading = ref(false)

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

async function loadCategories() {
  loading.value = true
  try {
    const response = await categoryService.getCategories()
    if (response.success) {
      categories.value = response.data.map((c: any) => c.name)
    }
  } catch {
    categories.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCategories()
})
</script>

<template>
  <div class="step-card">
    <div class="step-header">
      <p class="step-number">Step 1 of 3</p>
      <h2 class="step-title">{{ businessEmoji[businessType] || '🎉' }} Great choice!</h2>
      <p class="step-desc">
        We've set up these default categories for your
        <strong>{{ businessName[businessType] || businessType }}</strong
        >:
      </p>
    </div>

    <div class="categories-loading" v-if="loading">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading your categories...</span>
    </div>

    <div class="categories-list" v-else>
      <div v-for="category in categories" :key="category" class="category-item">
        <i class="pi pi-check-circle category-check" />
        <span>{{ category }}</span>
      </div>

      <div class="empty-state" v-if="categories.length === 0">
        <p>No categories found.</p>
      </div>
    </div>

    <div class="customize-note">
      <i class="pi pi-info-circle" />
      <span>You can customize these anytime in <strong>Settings → Categories</strong></span>
    </div>

    <div class="step-nav">
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

.categories-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #64748b;
  padding: 1rem 0;
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #f1f5f9;
  font-weight: 500;
}

.category-check {
  color: #22c55e;
  font-size: 1rem;
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
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #334155;
}
</style>
