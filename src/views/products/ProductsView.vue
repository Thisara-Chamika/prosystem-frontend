<script setup lang="ts">
import { ref, onMounted } from 'vue'
import productService from '../../services/productService'
import type { Product, CreateProductRequest, UpdateProductRequest } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import categoryService from '../../services/categoryService'
import type { Category } from '../../types'

// PrimeVue components
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const confirm = useConfirm()
const toast = useToast()
const authStore = useAuthStore()

// ── State ─────────────────────────────────────────
const products = ref<Product[]>([])
const loading = ref(false)
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// Dialog state
const showDialog = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const selectedProduct = ref<Product | null>(null)
const saving = ref(false)

// Form state
const form = ref<CreateProductRequest>({
  sku: '',
  name: '',
  price: 0,
  category: '',
  description: '',
  barcode: '',
  cost: 0,
  taxRate: 0,
  trackInventory: true,
  initialStock: 0,
})

const categories = ref<Category[]>([])

const productTypeFilter = ref<'all' | 'product' | 'service'>('all')
const formProductType = ref<'product' | 'service'>('product')

async function loadCategories() {
  try {
    const response = await categoryService.getCategories()
    if (response.success) {
      categories.value = response.data
    }
  } catch {
    categories.value = []
  }
}

// ── Methods ───────────────────────────────────────
async function loadProducts() {
  loading.value = true
  try {
    const typeParam = productTypeFilter.value === 'all' ? undefined : productTypeFilter.value
    const response = await productService.getProducts(currentPage.value, pageSize.value, typeParam)

    // Handle the response
    if (response && response.success) {
      const productData = response.data

      if (Array.isArray(productData)) {
        products.value = productData
        totalRecords.value = response.pagination?.total ?? productData.length
      } else {
        products.value = []
        totalRecords.value = 0
      }
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load products',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  dialogMode.value = 'create'
  selectedProduct.value = null
  form.value = {
    sku: '',
    name: '',
    price: 0,
    category: '',
    description: '',
    barcode: '',
    cost: 0,
    taxRate: 0,
    trackInventory: true,
    initialStock: 0,
  }
  formProductType.value = 'product'
  showDialog.value = true
}

function openEditDialog(product: Product) {
  dialogMode.value = 'edit'
  selectedProduct.value = product
  form.value = {
    sku: product.sku,
    name: product.name,
    price: product.price,
    category: product.category || '',
    description: product.description || '',
    barcode: product.barcode || '',
    cost: product.cost || 0,
    taxRate: product.taxRate,
    trackInventory: product.trackInventory,
  }
  formProductType.value = (product as any).productType || 'product'
  showDialog.value = true
}

async function saveProduct() {
  saving.value = true
  try {
    if (dialogMode.value === 'create') {
      const payload = {
        ...form.value,
        productType: formProductType.value,
        ...(formProductType.value === 'service' ? { initialStock: 0 } : {}),
      }
      const response = await productService.createProduct(payload)
      if (response.success) {
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Product created successfully',
          life: 3000,
        })
        showDialog.value = false
        loadProducts()
      }
    } else {
      const payload = {
        ...(form.value as UpdateProductRequest),
        productType: formProductType.value,
      }
      const response = await productService.updateProduct(selectedProduct.value!.productId, payload)
      if (response.success) {
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Product updated successfully',
          life: 3000,
        })
        showDialog.value = false
        loadProducts()
      }
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to save product',
      life: 3000,
    })
  } finally {
    saving.value = false
  }
}

function confirmDelete(product: Product) {
  confirm.require({
    message: `Are you sure you want to delete "${product.name}"?`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
    },
    acceptProps: {
      label: 'Delete',
      severity: 'danger',
    },
    accept: async () => {
      try {
        await productService.deleteProduct(product.productId)
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Product deleted successfully',
          life: 3000,
        })
        loadProducts()
      } catch {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete product',
          life: 3000,
        })
      }
    },
  })
}

function onPageChange(event: any) {
  currentPage.value = event.page + 1
  pageSize.value = event.rows
  loadProducts()
}

function onFilterChange(type: 'all' | 'product' | 'service') {
  productTypeFilter.value = type
  currentPage.value = 1
  loadProducts()
}

// Load products when page opens
onMounted(() => {
  loadProducts()
  loadCategories()
})
</script>

<template>
  <div class="products-page">
    <Toast />
    <ConfirmDialog />

    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Products</h1>
        <p class="page-subtitle">Manage your product catalog</p>
      </div>
      <Button label="Add Product" icon="pi pi-plus" @click="openCreateDialog" />
    </div>

    <div class="filter-tabs">
      <button
        class="filter-tab"
        :class="{ active: productTypeFilter === 'all' }"
        @click="onFilterChange('all')"
      >
        All
      </button>
      <button
        class="filter-tab"
        :class="{ active: productTypeFilter === 'product' }"
        @click="onFilterChange('product')"
      >
        Products
      </button>
      <button
        class="filter-tab"
        :class="{ active: productTypeFilter === 'service' }"
        @click="onFilterChange('service')"
      >
        Services
      </button>
    </div>

    <!-- Products Table -->
    <div class="table-card">
      <DataTable
        :value="products"
        :loading="loading"
        lazy
        paginator
        :rows="pageSize"
        :totalRecords="totalRecords"
        :rowsPerPageOptions="[10, 25, 50]"
        :pageLinkSize="3"
        @page="onPageChange"
        stripedRows
        tableStyle="min-width: 50rem"
      >
        <!-- Empty state -->
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-box" />
            <p>No products found</p>
          </div>
        </template>

        <Column field="sku" header="SKU" style="width: 10%" />
        <Column field="name" header="Name" style="width: 25%" />
        <Column field="category" header="Category" style="width: 15%">
          <template #body="{ data }">
            <span>{{ data.category || '—' }}</span>
          </template>
        </Column>
        <Column header="Type" style="width: 10%">
          <template #body="{ data }">
            <span
              class="type-badge"
              :class="data.productType === 'service' ? 'type-service' : 'type-product'"
            >
              {{ data.productType === 'service' ? '⚡ Service' : '📦 Product' }}
            </span>
          </template>
        </Column>
        <Column field="price" header="Price" style="width: 10%">
          <template #body="{ data }">
            <span>{{ authStore.formatCurrency(parseFloat(data.price)) }}</span>
          </template>
        </Column>
        <Column field="taxRate" header="Tax %" style="width: 10%">
          <template #body="{ data }">
            <span>{{ parseFloat(data.taxRate).toFixed(2) }}%</span>
          </template>
        </Column>
        <Column field="isActive" header="Status" style="width: 10%">
          <template #body="{ data }">
            <Tag
              :value="data.isActive ? 'Active' : 'Inactive'"
              :severity="data.isActive ? 'success' : 'danger'"
            />
          </template>
        </Column>
        <Column header="Actions" style="width: 15%">
          <template #body="{ data }">
            <div class="action-buttons">
              <Button
                icon="pi pi-pencil"
                size="small"
                severity="secondary"
                @click="openEditDialog(data)"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                severity="danger"
                @click="confirmDelete(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Add/Edit Dialog -->
    <Dialog
      v-model:visible="showDialog"
      :header="dialogMode === 'create' ? 'Add Product' : 'Edit Product'"
      :style="{ width: '550px' }"
      modal
    >
      <div class="type-selector">
        <label>Product Type</label>
        <div class="type-options">
          <div
            class="type-option"
            :class="{ selected: formProductType === 'product' }"
            @click="formProductType = 'product'"
          >
            <span class="type-option-icon">📦</span>
            <div>
              <span class="type-option-name">Product</span>
              <span class="type-option-desc">Physical item · Track inventory</span>
            </div>
          </div>
          <div
            class="type-option"
            :class="{ selected: formProductType === 'service' }"
            @click="formProductType = 'service'"
          >
            <span class="type-option-icon">⚡</span>
            <div>
              <span class="type-option-name">Service</span>
              <span class="type-option-desc">No stock needed · Made on demand</span>
            </div>
          </div>
        </div>
      </div>
      <div class="dialog-form">
        <!-- Row 1: SKU + Barcode -->
        <div class="form-row">
          <div class="field">
            <label>SKU *</label>
            <InputText
              v-model="form.sku"
              placeholder="e.g. PROD-001"
              class="w-full"
              :disabled="dialogMode === 'edit'"
            />
          </div>
          <div class="field">
            <label>Barcode</label>
            <InputText v-model="form.barcode" placeholder="e.g. 123456789" class="w-full" />
          </div>
        </div>

        <!-- Row 2: Name -->
        <div class="field">
          <label>Product Name *</label>
          <InputText v-model="form.name" placeholder="Enter product name" class="w-full" />
        </div>

        <!-- Row 3: Category -->
        <div class="field">
          <label>Category</label>
          <Select
            v-model="form.category"
            :options="categories"
            optionLabel="name"
            optionValue="name"
            placeholder="Select category"
            class="w-full"
          >
            <template #empty>
              <div class="category-empty">
                No categories yet. Add them in Settings → Categories.
              </div>
            </template>
          </Select>
        </div>

        <!-- Row 4: Price + Cost -->
        <div class="form-row">
          <div class="field">
            <label>Price *</label>
            <InputNumber
              v-model="form.price"
              mode="currency"
              :currency="authStore.shop?.currency || 'USD'"
              class="w-full"
            />
          </div>
          <div class="field" v-if="formProductType === 'product'">
            <label>Cost</label>
            <InputNumber
              v-model="form.cost"
              mode="currency"
              :currency="authStore.shop?.currency || 'USD'"
              class="w-full"
            />
          </div>
        </div>

        <!-- Row 5: Tax Rate -->
        <div class="field">
          <label>Tax Rate (%)</label>
          <InputNumber v-model="form.taxRate" suffix="%" :min="0" :max="100" class="w-full" />
        </div>

        <!-- Row: Initial Stock (only show when creating) -->
        <div class="field" v-if="dialogMode === 'create' && formProductType === 'product'">
          <label>Initial Stock</label>
          <InputNumber v-model="form.initialStock" :min="0" showButtons class="w-full" />
        </div>
        <div class="service-note" v-if="formProductType === 'service'">
          <i class="pi pi-info-circle" />
          <span>Services are not tracked in inventory</span>
        </div>
        <div
          class="service-note warning"
          v-if="
            dialogMode === 'edit' &&
            formProductType === 'product' &&
            (selectedProduct as any)?.productType === 'service'
          "
        >
          <i class="pi pi-exclamation-triangle" />
          <span>Stock is currently 0. Update inventory after saving.</span>
        </div>

        <!-- Row 6: Description -->
        <div class="field">
          <label>Description</label>
          <InputText v-model="form.description" placeholder="Optional description" class="w-full" />
        </div>
      </div>

      <!-- Dialog Footer -->
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showDialog = false" />
        <Button
          :label="dialogMode === 'create' ? 'Create Product' : 'Save Changes'"
          icon="pi pi-check"
          :loading="saving"
          @click="saveProduct"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.products-page {
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

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

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

.w-full {
  width: 100% !important;
}

.category-empty {
  padding: 0.75rem;
  color: #64748b;
  font-size: 0.875rem;
  text-align: center;
}

/* Filter tabs */
.filter-tabs {
  display: flex;
  gap: 0.5rem;
}

.filter-tab {
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #1e293b;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.filter-tab:hover {
  border-color: #3b82f6;
  color: #f1f5f9;
}

.filter-tab.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
  font-weight: 600;
}

/* Type badge */
.type-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.type-product {
  background: rgba(100, 116, 139, 0.15);
  color: #94a3b8;
}

.type-service {
  background: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
}

/* Type selector in form */
.type-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.type-selector label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #cbd5e1;
}

.type-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.type-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #0f172a;
  border: 2px solid #334155;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.type-option:hover {
  border-color: #3b82f6;
}

.type-option.selected {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}

.type-option-icon {
  font-size: 1.5rem;
}

.type-option-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
}

.type-option-desc {
  display: block;
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 0.15rem;
}

/* Service note */
.service-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 8px;
  font-size: 0.8rem;
  color: #8b5cf6;
}

.service-note.warning {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.service-note .pi {
  flex-shrink: 0;
}
</style>
