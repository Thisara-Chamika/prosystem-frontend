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
    const response = await productService.getProducts(currentPage.value, pageSize.value)

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
  showDialog.value = true
}

async function saveProduct() {
  saving.value = true
  try {
    if (dialogMode.value === 'create') {
      const response = await productService.createProduct(form.value)
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
      const response = await productService.updateProduct(
        selectedProduct.value!.productId,
        form.value as UpdateProductRequest,
      )
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
          <div class="field">
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
        <div class="field" v-if="dialogMode === 'create'">
          <label>Initial Stock</label>
          <InputNumber v-model="form.initialStock" :min="0" showButtons class="w-full" />
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
</style>
