<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import productService from '../../services/productService'
import inventoryService from '../../services/inventoryService'
import type { ProductWithInventory } from '../../types'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const toast = useToast()

// ── State ─────────────────────────────────────────
const products = ref<ProductWithInventory[]>([])
const loading = ref(false)
const saving = ref(false)

// Edit stock dialog
const showDialog = ref(false)
const selectedProduct = ref<ProductWithInventory | null>(null)
const newQuantity = ref(0)

// ── Computed ──────────────────────────────────────
const totalProducts = computed(() => products.value.length)
const inStockCount = computed(
  () => products.value.filter((p) => (p.inventory?.quantity ?? 0) > 10).length,
)
const lowStockCount = computed(
  () =>
    products.value.filter((p) => {
      const qty = p.inventory?.quantity ?? 0
      return qty > 0 && qty <= 10
    }).length,
)
const outOfStockCount = computed(
  () => products.value.filter((p) => (p.inventory?.quantity ?? 0) === 0).length,
)

// ── Methods ───────────────────────────────────────
function getStockStatus(quantity: number) {
  if (quantity === 0) return { label: 'Out of stock', severity: 'danger' }
  if (quantity <= 10) return { label: 'Low stock', severity: 'warn' }
  return { label: 'In stock', severity: 'success' }
}

async function loadInventory() {
  loading.value = true
  try {
    const response = await productService.getProducts(1, 100)
    if (!response.success) return

    const productList = response.data

    // Filter only active products
    const activeProducts = productList.filter((p: any) => p.isActive === true)

    const withInventory = await Promise.all(
      activeProducts.map(async (product: any) => {
        try {
          const invResponse = await inventoryService.getInventory(product.productId)
          return invResponse.success ? invResponse.data : { ...product, inventory: null }
        } catch {
          return { ...product, inventory: null }
        }
      }),
    )
    products.value = withInventory
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load inventory',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

function openEditDialog(product: ProductWithInventory) {
  selectedProduct.value = product
  newQuantity.value = product.inventory?.quantity ?? 0
  showDialog.value = true
}

async function saveStock() {
  if (!selectedProduct.value) return
  saving.value = true
  try {
    const response = await inventoryService.updateInventory(selectedProduct.value.productId, {
      quantity: newQuantity.value,
    })
    if (response.success) {
      toast.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Stock updated successfully',
        life: 3000,
      })
      showDialog.value = false
      loadInventory()
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to update stock',
      life: 3000,
    })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadInventory()
})
</script>

<template>
  <div class="inventory-page">
    <Toast />

    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Inventory</h1>
        <p class="page-subtitle">Monitor and manage stock levels</p>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card">
        <span class="summary-label">Total Products</span>
        <span class="summary-value">{{ totalProducts }}</span>
      </div>
      <div class="summary-card success">
        <span class="summary-label">In Stock</span>
        <span class="summary-value">{{ inStockCount }}</span>
      </div>
      <div class="summary-card warning">
        <span class="summary-label">Low Stock</span>
        <span class="summary-value">{{ lowStockCount }}</span>
      </div>
      <div class="summary-card danger">
        <span class="summary-label">Out of Stock</span>
        <span class="summary-value">{{ outOfStockCount }}</span>
      </div>
    </div>

    <!-- Inventory Table -->
    <div class="table-card">
      <DataTable :value="products" :loading="loading" stripedRows tableStyle="min-width: 50rem">
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-warehouse" />
            <p>No inventory data found</p>
          </div>
        </template>

        <Column field="sku" header="SKU" style="width: 12%" />

        <Column field="name" header="Product" style="width: 28%" />

        <Column field="category" header="Category" style="width: 15%">
          <template #body="{ data }">
            {{ data.category || '—' }}
          </template>
        </Column>

        <Column header="Quantity" style="width: 12%">
          <template #body="{ data }">
            <span
              :class="{
                'qty-danger': (data.inventory?.quantity ?? 0) === 0,
                'qty-warning':
                  (data.inventory?.quantity ?? 0) > 0 && (data.inventory?.quantity ?? 0) <= 10,
                'qty-success': (data.inventory?.quantity ?? 0) > 10,
              }"
            >
              {{ data.inventory?.quantity ?? 0 }}
            </span>
          </template>
        </Column>

        <Column header="Reorder Point" style="width: 12%">
          <template #body="{ data }">
            {{ data.inventory?.reorderPoint ?? 0 }}
          </template>
        </Column>

        <Column header="Status" style="width: 13%">
          <template #body="{ data }">
            <Tag
              :value="getStockStatus(data.inventory?.quantity ?? 0).label"
              :severity="getStockStatus(data.inventory?.quantity ?? 0).severity"
            />
          </template>
        </Column>

        <Column header="Actions" style="width: 8%">
          <template #body="{ data }">
            <Button
              icon="pi pi-pencil"
              size="small"
              severity="secondary"
              @click="openEditDialog(data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Edit Stock Dialog -->
    <Dialog v-model:visible="showDialog" header="Update Stock" :style="{ width: '380px' }" modal>
      <div class="dialog-form">
        <div class="product-info">
          <span class="product-name">{{ selectedProduct?.name }}</span>
          <span class="product-sku">{{ selectedProduct?.sku }}</span>
        </div>

        <div class="field">
          <label>New Quantity</label>
          <InputNumber v-model="newQuantity" :min="0" showButtons class="w-full" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showDialog = false" />
        <Button label="Update Stock" icon="pi pi-check" :loading="saving" @click="saveStock" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.inventory-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.summary-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-card.success {
  border-left: 3px solid #22c55e;
}
.summary-card.warning {
  border-left: 3px solid #f59e0b;
}
.summary-card.danger {
  border-left: 3px solid #ef4444;
}

.summary-label {
  font-size: 0.8rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-value {
  font-size: 2rem;
  font-weight: 700;
  color: #f1f5f9;
}

.table-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #475569;
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
  display: block;
}

.qty-success {
  color: #22c55e;
  font-weight: 600;
}
.qty-warning {
  color: #f59e0b;
  font-weight: 600;
}
.qty-danger {
  color: #ef4444;
  font-weight: 600;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.5rem 0;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: #0f172a;
  border-radius: 8px;
}

.product-name {
  font-weight: 600;
  color: #f1f5f9;
}

.product-sku {
  font-size: 0.8rem;
  color: #94a3b8;
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
</style>
