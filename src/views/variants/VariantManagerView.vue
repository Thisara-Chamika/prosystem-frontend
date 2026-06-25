<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import productService from '../../services/productService'
import pluginService from '../../services/pluginService'
import inventoryService from '../../services/inventoryService'
import { useAuthStore } from '../../stores/authStore'

import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import { useConfirm } from 'primevue/useconfirm'
import ConfirmDialog from 'primevue/confirmdialog'

const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()
const router = useRouter()

// ── Role guard ────────────────────────────────────
const role = authStore.userRole
if (role !== 'shop_owner' && role !== 'shop_manager') {
  router.push('/dashboard')
}

// ── State ─────────────────────────────────────────
const products = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')

// Variants panel
const selectedProduct = ref<any>(null)
const variants = ref<any[]>([])
const loadingVariants = ref(false)
const reorderPoint = ref(0)

// Plugin config (for dropdowns)
const configSizes = ref<string[]>([])
const configColors = ref<string[]>([])

// Add/Edit variant dialog
const showVariantDialog = ref(false)
const variantDialogMode = ref<'create' | 'edit'>('create')
const editingVariant = ref<any>(null)
const savingVariant = ref(false)

const variantForm = ref({
  size: '',
  color: '',
  quantity: 0,
  skuVariant: '',
  priceAdjustment: 0,
})

// ── Computed ──────────────────────────────────────
const filteredProducts = computed(() => {
  if (!searchQuery.value.trim()) return products.value
  const q = searchQuery.value.toLowerCase()
  return products.value.filter(
    (p: any) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
  )
})

const isOwner = computed(() => authStore.userRole === 'shop_owner')

// ── Methods ───────────────────────────────────────
function getVariantStatus(quantity: number): { severity: string; label: string } {
  if (quantity === 0) return { severity: 'danger', label: 'Out of Stock' }
  if (quantity <= reorderPoint.value && reorderPoint.value > 0)
    return { severity: 'warn', label: 'Low Stock' }
  return { severity: 'success', label: 'In Stock' }
}

async function loadProducts() {
  loading.value = true
  try {
    const response = await productService.getProducts(1, 100, 'product')
    if (response.success) {
      const activeProducts = response.data.filter((p: any) => p.isActive)
      // Load variant count for each product
      const withVariants = await Promise.all(
        activeProducts.map(async (product: any) => {
          try {
            const vRes = await pluginService.getVariants(product.productId)
            return {
              ...product,
              variantCount: vRes.success ? vRes.data.length : 0,
            }
          } catch {
            return { ...product, variantCount: 0 }
          }
        }),
      )
      products.value = withVariants
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load products',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

async function loadPluginConfig() {
  try {
    const response = await pluginService.getPluginConfig('fashion-shop')
    if (response.success) {
      configSizes.value = response.data.configuration?.sizes || []
      configColors.value = response.data.configuration?.colors || []
    }
  } catch {
    configSizes.value = []
    configColors.value = []
  }
}

async function selectProduct(product: any) {
  selectedProduct.value = product
  loadingVariants.value = true
  try {
    const [variantsRes, inventoryRes] = await Promise.all([
      pluginService.getVariants(product.productId),
      inventoryService.getInventory(product.productId),
    ])
    if (variantsRes.success) variants.value = variantsRes.data
    if (inventoryRes.success) reorderPoint.value = inventoryRes.data.inventory?.reorderPoint ?? 0
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load variants',
      life: 3000,
    })
  } finally {
    loadingVariants.value = false
  }
}

function openAddVariant() {
  variantDialogMode.value = 'create'
  editingVariant.value = null
  variantForm.value = {
    size: '',
    color: '',
    quantity: 0,
    skuVariant: '',
    priceAdjustment: 0,
  }
  showVariantDialog.value = true
}

function openEditVariant(variant: any) {
  variantDialogMode.value = 'edit'
  editingVariant.value = variant
  variantForm.value = {
    size: variant.size,
    color: variant.color,
    quantity: variant.quantity,
    skuVariant: variant.skuVariant,
    priceAdjustment: parseFloat(variant.priceAdjustment) || 0,
  }
  showVariantDialog.value = true
}

function autoGenerateSku() {
  if (selectedProduct.value && variantForm.value.size && variantForm.value.color) {
    const colorCode = variantForm.value.color.substring(0, 3).toUpperCase()
    variantForm.value.skuVariant = `${selectedProduct.value.sku}-${variantForm.value.size}-${colorCode}`
  }
}

async function saveVariant() {
  if (!variantForm.value.size || !variantForm.value.color) {
    toast.add({
      severity: 'warn',
      summary: 'Required',
      detail: 'Size and color are required',
      life: 3000,
    })
    return
  }

  savingVariant.value = true
  try {
    if (variantDialogMode.value === 'create') {
      const response = await pluginService.createVariant(
        selectedProduct.value.productId,
        variantForm.value,
      )
      if (response.success) {
        variants.value.push(response.data)
        // Update variant count in product list
        const idx = products.value.findIndex(
          (p: any) => p.productId === selectedProduct.value.productId,
        )
        if (idx !== -1) products.value[idx].variantCount++
        showVariantDialog.value = false
        toast.add({
          severity: 'success',
          summary: 'Created',
          detail: 'Variant added successfully',
          life: 3000,
        })
      }
    } else {
      const response = await pluginService.updateVariant(editingVariant.value.variantId, {
        size: variantForm.value.size,
        color: variantForm.value.color,
        quantity: variantForm.value.quantity,
        priceAdjustment: variantForm.value.priceAdjustment,
      })
      if (response.success) {
        const idx = variants.value.findIndex(
          (v: any) => v.variantId === editingVariant.value.variantId,
        )
        if (idx !== -1) variants.value[idx] = response.data
        showVariantDialog.value = false
        toast.add({
          severity: 'success',
          summary: 'Updated',
          detail: 'Variant updated',
          life: 3000,
        })
      }
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to save variant',
      life: 3000,
    })
  } finally {
    savingVariant.value = false
  }
}

function confirmDeleteVariant(variant: any) {
  confirm.require({
    message: `Delete variant ${variant.size} / ${variant.color}?`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary' },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: async () => {
      try {
        await pluginService.deleteVariant(variant.variantId)
        variants.value = variants.value.filter((v: any) => v.variantId !== variant.variantId)
        const idx = products.value.findIndex(
          (p: any) => p.productId === selectedProduct.value.productId,
        )
        if (idx !== -1 && products.value[idx].variantCount > 0) products.value[idx].variantCount--
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Variant deleted',
          life: 3000,
        })
      } catch {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete variant',
          life: 3000,
        })
      }
    },
  })
}

onMounted(() => {
  loadProducts()
  loadPluginConfig()
})
</script>

<template>
  <div class="variants-page">
    <Toast />
    <ConfirmDialog />

    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">👗 Variant Manager</h1>
        <p class="page-subtitle">Manage size and color variants for your products</p>
      </div>
    </div>

    <div class="variants-layout">
      <!-- Left: Product List -->
      <div class="products-panel">
        <div class="search-wrapper">
          <i class="pi pi-search search-icon" />
          <InputText v-model="searchQuery" placeholder="Search products..." class="search-input" />
        </div>

        <div class="loading-state" v-if="loading">
          <i class="pi pi-spin pi-spinner" />
          <p>Loading products...</p>
        </div>

        <div class="product-list" v-else>
          <div
            v-for="product in filteredProducts"
            :key="product.productId"
            class="product-row"
            :class="{ selected: selectedProduct?.productId === product.productId }"
            @click="selectProduct(product)"
          >
            <div class="product-row-info">
              <span class="product-row-name">{{ product.name }}</span>
              <span class="product-row-sku">{{ product.sku }}</span>
            </div>
            <div class="product-row-meta">
              <span class="variant-count" v-if="product.variantCount > 0">
                {{ product.variantCount }} variants
              </span>
              <span class="no-variants" v-else>No variants</span>
              <i class="pi pi-chevron-right" />
            </div>
          </div>

          <div class="empty-state" v-if="filteredProducts.length === 0">
            <i class="pi pi-box" />
            <p>No products found</p>
          </div>
        </div>
      </div>

      <!-- Right: Variant Detail -->
      <div class="variants-panel">
        <!-- No product selected -->
        <div class="no-selection" v-if="!selectedProduct">
          <i class="pi pi-tag" />
          <p>Select a product to manage variants</p>
        </div>

        <template v-else>
          <!-- Panel Header -->
          <div class="variants-panel-header">
            <div>
              <h2 class="panel-title">{{ selectedProduct.name }}</h2>
              <span class="panel-sku">{{ selectedProduct.sku }}</span>
            </div>
            <Button label="Add Variant" icon="pi pi-plus" size="small" @click="openAddVariant" />
          </div>

          <!-- Loading variants -->
          <div class="loading-state" v-if="loadingVariants">
            <i class="pi pi-spin pi-spinner" />
            <p>Loading variants...</p>
          </div>

          <!-- Empty variants -->
          <div class="empty-state" v-else-if="variants.length === 0">
            <i class="pi pi-tag" />
            <p>No variants yet. Add your first variant.</p>
          </div>

          <!-- Variants Table -->
          <div class="variants-table" v-else>
            <div class="variants-table-header">
              <span>Size</span>
              <span>Color</span>
              <span>SKU</span>
              <span>Stock</span>
              <span>Price Adj.</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            <div v-for="variant in variants" :key="variant.variantId" class="variant-row">
              <span class="variant-cell">
                <span class="variant-size-badge">{{ variant.size }}</span>
              </span>
              <span class="variant-cell">{{ variant.color }}</span>
              <span class="variant-cell variant-sku">{{ variant.skuVariant }}</span>
              <span class="variant-cell">
                <span
                  :class="{
                    'qty-danger': variant.quantity === 0,
                    'qty-warning':
                      variant.quantity > 0 && reorderPoint > 0 && variant.quantity <= reorderPoint,
                    'qty-success':
                      variant.quantity > reorderPoint ||
                      (reorderPoint === 0 && variant.quantity > 0),
                  }"
                >
                  {{ variant.quantity }}
                  <span
                    v-if="
                      reorderPoint > 0 && variant.quantity <= reorderPoint && variant.quantity > 0
                    "
                    >⚠️</span
                  >
                </span>
              </span>
              <span class="variant-cell">
                {{
                  parseFloat(variant.priceAdjustment) === 0
                    ? '—'
                    : `+${authStore.formatCurrency(parseFloat(variant.priceAdjustment))}`
                }}
              </span>
              <span class="variant-cell">
                <Tag
                  :value="getVariantStatus(variant.quantity).label"
                  :severity="getVariantStatus(variant.quantity).severity"
                />
              </span>
              <span class="variant-cell">
                <div class="variant-actions">
                  <Button
                    icon="pi pi-pencil"
                    size="small"
                    severity="secondary"
                    text
                    @click="openEditVariant(variant)"
                  />
                  <Button
                    v-if="isOwner"
                    icon="pi pi-trash"
                    size="small"
                    severity="danger"
                    text
                    @click="confirmDeleteVariant(variant)"
                  />
                </div>
              </span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Add/Edit Variant Dialog -->
    <Dialog
      v-model:visible="showVariantDialog"
      :header="variantDialogMode === 'create' ? 'Add Variant' : 'Edit Variant'"
      :style="{ width: '480px' }"
      modal
    >
      <div class="dialog-form">
        <div class="form-row">
          <div class="field">
            <label>Size *</label>
            <Select
              v-model="variantForm.size"
              :options="configSizes"
              placeholder="Select size"
              class="w-full"
              @change="autoGenerateSku"
            />
          </div>
          <div class="field">
            <label>Color *</label>
            <Select
              v-model="variantForm.color"
              :options="configColors"
              placeholder="Select color"
              class="w-full"
              @change="autoGenerateSku"
            />
          </div>
        </div>

        <div class="field" v-if="variantDialogMode === 'create'">
          <label>SKU Variant</label>
          <InputText v-model="variantForm.skuVariant" placeholder="Auto-generated" class="w-full" />
          <span class="field-hint">Auto-generated from product SKU + size + color</span>
        </div>

        <div class="form-row">
          <div class="field">
            <label>Quantity</label>
            <InputNumber v-model="variantForm.quantity" :min="0" showButtons class="w-full" />
          </div>
          <div class="field">
            <label>Price Adjustment</label>
            <InputNumber
              v-model="variantForm.priceAdjustment"
              :prefix="authStore.shop?.currency ? authStore.shop.currency + ' ' : '$ '"
              :minFractionDigits="2"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showVariantDialog = false" />
        <Button
          :label="variantDialogMode === 'create' ? 'Add Variant' : 'Save Changes'"
          icon="pi pi-check"
          :loading="savingVariant"
          @click="saveVariant"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.variants-page {
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

/* ── Layout ── */
.variants-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.25rem;
  min-height: calc(100vh - 200px);
}

/* ── Products Panel ── */
.products-panel {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-wrapper {
  position: relative;
  padding: 0.75rem;
  border-bottom: 1px solid #334155;
}

.search-icon {
  position: absolute;
  left: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
}

.search-input {
  width: 100%;
  padding-left: 2.25rem !important;
}

.product-list {
  flex: 1;
  overflow-y: auto;
}

.product-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #334155;
  cursor: pointer;
  transition: all 0.15s;
}

.product-row:hover {
  background: #334155;
}

.product-row.selected {
  background: rgba(59, 130, 246, 0.1);
  border-left: 3px solid #3b82f6;
}

.product-row-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
}

.product-row-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f1f5f9;
}

.product-row-sku {
  font-size: 0.75rem;
  color: #64748b;
}

.product-row-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.variant-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.no-variants {
  font-size: 0.75rem;
  color: #475569;
}

/* ── Variants Panel ── */
.variants-panel {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.no-selection {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #475569;
  padding: 4rem;
}

.no-selection i {
  font-size: 3rem;
}

.variants-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 1rem;
  border-bottom: 1px solid #334155;
}

.panel-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
}

.panel-sku {
  font-size: 0.75rem;
  color: #64748b;
  font-family: monospace;
}

/* ── Variants Table ── */
.variants-table {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid #334155;
  border-radius: 8px;
  overflow: hidden;
}

.variants-table-header {
  display: grid;
  grid-template-columns: 80px 100px 1fr 80px 100px 110px 80px;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: #0f172a;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.variant-row {
  display: grid;
  grid-template-columns: 80px 100px 1fr 80px 100px 110px 80px;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid #334155;
  align-items: center;
}

.variant-row:hover {
  background: rgba(59, 130, 246, 0.05);
}

.variant-cell {
  font-size: 0.875rem;
  color: #cbd5e1;
}

.variant-sku {
  font-size: 0.75rem;
  font-family: monospace;
  color: #64748b;
}

.variant-size-badge {
  background: #334155;
  color: #f1f5f9;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
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

.variant-actions {
  display: flex;
  gap: 0.25rem;
}

/* ── Empty / Loading ── */
.loading-state {
  text-align: center;
  padding: 3rem;
  color: #475569;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.loading-state i {
  font-size: 2rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #475569;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-state i {
  font-size: 2rem;
}

/* ── Dialog ── */
.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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

.field-hint {
  font-size: 0.75rem;
  color: #64748b;
}

.w-full {
  width: 100% !important;
}
</style>
