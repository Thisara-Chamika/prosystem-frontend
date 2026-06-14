<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import inventoryService from '../../services/inventoryService'
import categoryService from '../../services/categoryService'
import type { Category } from '../../types'
import { useAuthStore } from '../../stores/authStore'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const toast = useToast()
const authStore = useAuthStore()

// ── State ─────────────────────────────────────────
const inventory = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const categories = ref<Category[]>([])

// Pagination
const currentPage = ref(0)
const pageSize = ref(10)
const totalRecords = ref(0)
const totalPages = ref(0)

// Filters
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')

// Edit stock dialog
const showDialog = ref(false)
const selectedItem = ref<any>(null)
const newQuantity = ref(0)

// Inline reorder edit
const editingReorderId = ref<string | null>(null)
const editReorderPoint = ref(0)
const savingReorder = ref(false)

// ── Options ───────────────────────────────────────
const statusOptions = [
  { label: 'All Status', value: '' },
  { label: '🟢 In Stock', value: 'in_stock' },
  { label: '🟡 Low Stock', value: 'low' },
  { label: '🔴 Out of Stock', value: 'out_of_stock' },
]

// ── Methods ───────────────────────────────────────
function getStatusSeverity(status: string) {
  switch (status) {
    case 'in_stock':
      return 'success'
    case 'low':
      return 'warn'
    case 'out_of_stock':
      return 'danger'
    default:
      return 'secondary'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'in_stock':
      return 'In Stock'
    case 'low':
      return 'Low Stock'
    case 'out_of_stock':
      return 'Out of Stock'
    default:
      return status
  }
}

async function loadInventory() {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
    }
    if (searchQuery.value) params.search = searchQuery.value
    if (selectedCategory.value) params.category = selectedCategory.value
    if (selectedStatus.value) params.status = selectedStatus.value

    const response = await inventoryService.getInventoryList(params)
    if (response.success) {
      inventory.value = response.data
      totalRecords.value = response.pagination?.total ?? response.data.length
      totalPages.value = response.pagination?.totalPages ?? 1
    }
  } catch {
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

async function loadCategories() {
  try {
    const response = await categoryService.getCategories()
    if (response.success) categories.value = response.data
  } catch {
    categories.value = []
  }
}

function onSearch() {
  currentPage.value = 1
  loadInventory()
}

function onFilterChange() {
  currentPage.value = 1
  loadInventory()
}

function onPageChange(event: any) {
  currentPage.value = event.page + 1
  pageSize.value = event.rows
  loadInventory()
}

function openEditDialog(item: any) {
  selectedItem.value = item
  newQuantity.value = item.quantity
  showDialog.value = true
}

async function saveStock() {
  if (!selectedItem.value) return
  saving.value = true
  try {
    const response = await inventoryService.updateInventory(selectedItem.value.productId, {
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

function startReorderEdit(item: any) {
  editingReorderId.value = item.productId
  editReorderPoint.value = item.reorderPoint ?? 0
}

function cancelReorderEdit() {
  editingReorderId.value = null
}

async function saveReorderPoint(item: any) {
  savingReorder.value = true
  try {
    const response = await inventoryService.updateReorderSettings(item.productId, {
      reorderPoint: editReorderPoint.value,
      reorderQuantity: item.reorderQuantity ?? 0,
    })
    if (response.success) {
      editingReorderId.value = null
      toast.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Reorder point updated',
        life: 3000,
      })
      loadInventory()
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to update reorder point',
      life: 3000,
    })
  } finally {
    savingReorder.value = false
  }
}

onMounted(() => {
  loadInventory()
  loadCategories()
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

    <!-- Info Note -->
    <div class="inventory-note">
      <i class="pi pi-info-circle" />
      <span
        >Only physical products appear here. Service items do not require inventory tracking.</span
      >
    </div>

    <!-- Filters -->
    <div class="filters-row">
      <div class="search-wrapper">
        <i class="pi pi-search search-icon" />
        <InputText
          v-model="searchQuery"
          placeholder="Search by name or SKU..."
          class="search-input"
          @input="onSearch"
        />
      </div>

      <Select
        v-model="selectedCategory"
        :options="categories"
        optionLabel="name"
        optionValue="name"
        placeholder="All Categories"
        showClear
        class="filter-select"
        @change="onFilterChange"
      />
      <Select
        v-model="selectedStatus"
        :options="statusOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Status"
        showClear
        class="filter-select"
        @change="onFilterChange"
      />
    </div>

    <!-- Inventory Table -->
    <div class="table-card">
      <DataTable
        :value="inventory"
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
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-warehouse" />
            <p>No inventory data found</p>
          </div>
        </template>

        <Column field="sku" header="SKU" style="width: 12%" />

        <Column field="productName" header="Product" style="width: 25%" />

        <Column field="category" header="Category" style="width: 15%">
          <template #body="{ data }">
            {{ data.category || '—' }}
          </template>
        </Column>

        <Column header="Stock" style="width: 10%">
          <template #body="{ data }">
            <span
              :class="{
                'qty-danger': data.quantity === 0,
                'qty-warning': data.quantity > 0 && data.quantity <= data.reorderPoint,
                'qty-success': data.quantity > data.reorderPoint,
              }"
            >
              {{ data.quantity }}
            </span>
          </template>
        </Column>

        <Column header="Reorder Point" style="width: 18%">
          <template #body="{ data }">
            <div class="reorder-cell">
              <template v-if="editingReorderId === data.productId">
                <InputNumber
                  v-model="editReorderPoint"
                  :min="0"
                  class="reorder-input"
                  :inputStyle="{ width: '70px' }"
                />
                <Button
                  icon="pi pi-check"
                  size="small"
                  severity="success"
                  text
                  :loading="savingReorder"
                  @click="saveReorderPoint(data)"
                />
                <Button
                  icon="pi pi-times"
                  size="small"
                  severity="danger"
                  text
                  @click="cancelReorderEdit"
                />
              </template>
              <template v-else>
                <span
                  class="reorder-value"
                  :class="{
                    'reorder-alert': data.quantity <= data.reorderPoint && data.quantity > 0,
                  }"
                  @click="startReorderEdit(data)"
                  title="Click to edit"
                >
                  {{ data.reorderPoint ?? 0 }}
                  <i class="pi pi-pencil reorder-edit-icon" />
                </span>
              </template>
            </div>
          </template>
        </Column>

        <Column header="Status" style="width: 13%">
          <template #body="{ data }">
            <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
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
          <span class="product-name">{{ selectedItem?.productName }}</span>
          <span class="product-sku">{{ selectedItem?.sku }}</span>
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
  gap: 1.25rem;
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

.inventory-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  font-size: 0.8rem;
  color: #94a3b8;
}

.inventory-note .pi {
  color: #3b82f6;
  flex-shrink: 0;
}

/* ── Filters ── */
.filters-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.search-wrapper {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding-left: 2.25rem !important;
}

.filter-select {
  width: 180px;
}

/* ── Table ── */
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

/* ── Reorder Point ── */
.reorder-cell {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.reorder-value {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  color: #94a3b8;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.reorder-value:hover {
  background: #334155;
  color: #f1f5f9;
}

.reorder-alert {
  color: #f59e0b;
}

.reorder-edit-icon {
  font-size: 0.7rem;
  opacity: 0.5;
}

.reorder-input {
  width: 90px;
}

/* ── Pagination ── */
.pagination-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-top: 1px solid #334155;
}

.pagination-info {
  font-size: 0.8rem;
  color: #64748b;
}

.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-indicator {
  font-size: 0.8rem;
  color: #94a3b8;
}

/* ── Dialog ── */
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
