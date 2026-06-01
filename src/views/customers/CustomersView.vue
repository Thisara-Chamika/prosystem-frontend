<script setup lang="ts">
import { ref, onMounted } from 'vue'
import customerService from '../../services/customerService'
import type { Customer } from '../../types'
import { useAuthStore } from '../../stores/authStore'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const toast = useToast()
const authStore = useAuthStore()

// ── State ─────────────────────────────────────────
const customers = ref<Customer[]>([])
const loading = ref(false)
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const searchQuery = ref('')
let searchTimeout: ReturnType<typeof setTimeout>

// Add customer dialog
const showAddDialog = ref(false)
const saving = ref(false)
const newCustomer = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
})

// Edit customer dialog
const showEditDialog = ref(false)
const editingCustomer = ref<Customer | null>(null)
const editForm = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
})

// Customer detail dialog
const showDetailDialog = ref(false)
const updatingCustomer = ref(false)
const selectedCustomer = ref<Customer | null>(null)
const customerTransactions = ref<any[]>([])
const loadingTransactions = ref(false)

// ── Methods ───────────────────────────────────────
async function loadCustomers() {
  loading.value = true
  try {
    const response = await customerService.getCustomers(
      currentPage.value,
      pageSize.value,
      searchQuery.value,
    )
    if (response.success) {
      customers.value = response.data
      totalRecords.value = response.pagination?.total ?? response.data.length
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load customers',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadCustomers()
  }, 400)
}

function onPageChange(event: any) {
  currentPage.value = event.page + 1
  pageSize.value = event.rows
  loadCustomers()
}

// ── Validation ─────────────────────────────────────
function validateEmail(email: string): boolean {
  if (!email) return true // optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validateSriLankanPhone(phone: string): boolean {
  if (!phone) return true // optional field
  // Accepts: 07XXXXXXXX or +947XXXXXXXX
  const localFormat = /^07[0-9]{8}$/
  const intlFormat = /^\+947[0-9]{8}$/
  return localFormat.test(phone) || intlFormat.test(phone)
}

function validateCustomerForm(form: typeof newCustomer.value): string | null {
  if (!form.firstName.trim()) return 'First name is required'
  if (!form.lastName.trim()) return 'Last name is required'
  if (form.email && !validateEmail(form.email)) {
    return 'Please enter a valid email address'
  }
  if (form.phone && !validateSriLankanPhone(form.phone)) {
    return 'Phone must be in format: 07XXXXXXXX or +947XXXXXXXX'
  }
  return null // no errors
}

async function saveCustomer() {
  const validationError = validateCustomerForm(newCustomer.value)
  if (validationError) {
    toast.add({
      severity: 'warn',
      summary: 'Required',
      detail: validationError,
      life: 3000,
    })
    return
  }
  saving.value = true
  try {
    const response = await customerService.createCustomer(newCustomer.value)
    if (response.success) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Customer created successfully',
        life: 3000,
      })
      showAddDialog.value = false
      newCustomer.value = { firstName: '', lastName: '', email: '', phone: '', address: '' }
      loadCustomers()
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to create customer',
      life: 3000,
    })
  } finally {
    saving.value = false
  }
}

async function viewCustomer(customer: Customer) {
  selectedCustomer.value = customer
  showDetailDialog.value = true
  loadingTransactions.value = true
  customerTransactions.value = []
  try {
    const response = await customerService.getCustomerTransactions(customer.customerId)
    if (response.success) {
      customerTransactions.value = response.data
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load transaction history',
      life: 3000,
    })
  } finally {
    loadingTransactions.value = false
  }
}

function getStatusSeverity(status: string) {
  switch (status) {
    case 'completed':
      return 'success'
    case 'cancelled':
      return 'danger'
    case 'refunded':
      return 'warn'
    default:
      return 'secondary'
  }
}

function getTotalSpent() {
  return customerTransactions.value
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + parseFloat(t.total), 0)
}

function openEditDialog(customer: Customer) {
  editingCustomer.value = customer
  editForm.value = {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email || '',
    phone: customer.phone || '',
    address: customer.address || '',
  }
  showEditDialog.value = true
}

async function updateCustomer() {
  const validationError = validateCustomerForm(editForm.value)
  if (validationError) {
    toast.add({
      severity: 'warn',
      summary: 'Required',
      detail: validationError,
      life: 3000,
    })
    return
  }
  updatingCustomer.value = true
  try {
    const response = await customerService.updateCustomer(
      editingCustomer.value!.customerId,
      editForm.value,
    )
    if (response.success) {
      toast.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Customer updated successfully',
        life: 3000,
      })
      showEditDialog.value = false

      const index = customers.value.findIndex(
        (c) => c.customerId === editingCustomer.value!.customerId,
      )
      if (index !== -1 && editingCustomer.value) {
        customers.value[index] = {
          customerId: editingCustomer.value.customerId,
          shopId: editingCustomer.value.shopId,
          createdAt: editingCustomer.value.createdAt,
          firstName: editForm.value.firstName,
          lastName: editForm.value.lastName,
          email: editForm.value.email || null,
          phone: editForm.value.phone || null,
          address: editForm.value.address || null,
        }
      }
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to update customer',
      life: 3000,
    })
  } finally {
    updatingCustomer.value = false
  }
}

onMounted(() => {
  loadCustomers()
})
</script>

<template>
  <div class="customers-page">
    <Toast />

    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Customers</h1>
        <p class="page-subtitle">Manage your customer records</p>
      </div>
      <Button label="Add Customer" icon="pi pi-plus" @click="showAddDialog = true" />
    </div>

    <!-- Search Bar -->
    <div class="search-bar">
      <IconField class="w-full">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="searchQuery"
          placeholder="Search by name, email or phone..."
          class="w-full"
          @input="onSearch"
        />
      </IconField>
    </div>

    <!-- Customers Table -->
    <div class="table-card">
      <DataTable
        :value="customers"
        :loading="loading"
        lazy
        paginator
        :rows="pageSize"
        :totalRecords="totalRecords"
        :rowsPerPageOptions="[10, 25, 50]"
        @page="onPageChange"
        stripedRows
        tableStyle="min-width: 40rem"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-users" />
            <p>No customers found</p>
          </div>
        </template>

        <Column header="Name" style="width: 25%">
          <template #body="{ data }">
            <div class="customer-name-cell">
              <div class="customer-avatar">
                {{ data.firstName.charAt(0) }}{{ data.lastName.charAt(0) }}
              </div>
              <span>{{ data.firstName }} {{ data.lastName }}</span>
            </div>
          </template>
        </Column>

        <Column field="email" header="Email" style="width: 25%">
          <template #body="{ data }">
            {{ data.email || '—' }}
          </template>
        </Column>

        <Column field="phone" header="Phone" style="width: 20%">
          <template #body="{ data }">
            {{ data.phone || '—' }}
          </template>
        </Column>

        <Column field="address" header="Address" style="width: 20%">
          <template #body="{ data }">
            {{ data.address || '—' }}
          </template>
        </Column>

        <Column header="Actions" style="width: 15%">
          <template #body="{ data }">
            <div class="action-buttons">
              <Button
                icon="pi pi-eye"
                size="small"
                severity="secondary"
                @click="viewCustomer(data)"
              />
              <Button
                icon="pi pi-pencil"
                size="small"
                severity="secondary"
                @click="openEditDialog(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Add Customer Dialog -->
    <Dialog
      v-model:visible="showAddDialog"
      header="Add New Customer"
      :style="{ width: '450px' }"
      modal
    >
      <div class="dialog-form">
        <div class="form-row">
          <div class="field">
            <label>First Name *</label>
            <InputText v-model="newCustomer.firstName" placeholder="First name" class="w-full" />
          </div>
          <div class="field">
            <label>Last Name *</label>
            <InputText v-model="newCustomer.lastName" placeholder="Last name" class="w-full" />
          </div>
        </div>
        <div class="field">
          <label>Phone</label>
          <InputText
            v-model="newCustomer.phone"
            placeholder="07XXXXXXXX or +947XXXXXXXX"
            class="w-full"
          />
        </div>
        <div class="field">
          <label>Email</label>
          <InputText v-model="newCustomer.email" placeholder="email@example.com" class="w-full" />
        </div>
        <div class="field">
          <label>Address</label>
          <InputText v-model="newCustomer.address" placeholder="Optional address" class="w-full" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showAddDialog = false" />
        <Button label="Add Customer" icon="pi pi-check" :loading="saving" @click="saveCustomer" />
      </template>
    </Dialog>

    <!-- Edit Customer Dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      header="Edit Customer"
      :style="{ width: '450px' }"
      modal
    >
      <div class="dialog-form">
        <div class="form-row">
          <div class="field">
            <label>First Name *</label>
            <InputText v-model="editForm.firstName" placeholder="First name" class="w-full" />
          </div>
          <div class="field">
            <label>Last Name *</label>
            <InputText v-model="editForm.lastName" placeholder="Last name" class="w-full" />
          </div>
        </div>
        <div class="field">
          <label>Phone</label>
          <InputText
            v-model="editForm.phone"
            placeholder="07XXXXXXXX or +947XXXXXXXX"
            class="w-full"
          />
        </div>
        <div class="field">
          <label>Email</label>
          <InputText v-model="editForm.email" placeholder="email@example.com" class="w-full" />
        </div>
        <div class="field">
          <label>Address</label>
          <InputText v-model="editForm.address" placeholder="Optional address" class="w-full" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showEditDialog = false" />
        <Button
          label="Save Changes"
          icon="pi pi-check"
          :loading="updatingCustomer"
          @click="updateCustomer"
        />
      </template>
    </Dialog>

    <!-- Customer Detail Dialog -->
    <Dialog
      v-model:visible="showDetailDialog"
      :header="`${selectedCustomer?.firstName} ${selectedCustomer?.lastName}`"
      :style="{ width: '620px' }"
      modal
    >
      <div class="customer-detail" v-if="selectedCustomer">
        <!-- Customer Info Cards -->
        <div class="detail-info-grid">
          <div class="detail-info-item" v-if="selectedCustomer.phone">
            <i class="pi pi-phone" />
            <div>
              <span class="detail-label">Phone</span>
              <span class="detail-value">{{ selectedCustomer.phone }}</span>
            </div>
          </div>
          <div class="detail-info-item" v-if="selectedCustomer.email">
            <i class="pi pi-envelope" />
            <div>
              <span class="detail-label">Email</span>
              <span class="detail-value">{{ selectedCustomer.email }}</span>
            </div>
          </div>
          <div class="detail-info-item" v-if="selectedCustomer.address">
            <i class="pi pi-map-marker" />
            <div>
              <span class="detail-label">Address</span>
              <span class="detail-value">{{ selectedCustomer.address }}</span>
            </div>
          </div>
          <div class="detail-info-item">
            <i class="pi pi-calendar" />
            <div>
              <span class="detail-label">Customer Since</span>
              <span class="detail-value">{{
                authStore.formatDate(selectedCustomer.createdAt)
              }}</span>
            </div>
          </div>
        </div>

        <!-- Transaction Summary -->
        <div class="txn-summary">
          <div class="txn-summary-card">
            <span class="txn-summary-value">{{ customerTransactions.length }}</span>
            <span class="txn-summary-label">Total Transactions</span>
          </div>
          <div class="txn-summary-card green">
            <span class="txn-summary-value">{{
              authStore.formatCurrency(parseFloat(getTotalSpent()))
            }}</span>
            <span class="txn-summary-label">Total Spent</span>
          </div>
        </div>

        <!-- Transaction History -->
        <div class="txn-history">
          <h3 class="txn-history-title">Transaction History</h3>

          <div class="txn-loading" v-if="loadingTransactions">
            <i class="pi pi-spin pi-spinner" />
            <span>Loading transactions...</span>
          </div>

          <div class="txn-empty" v-else-if="customerTransactions.length === 0">
            <i class="pi pi-receipt" />
            <p>No transactions yet</p>
          </div>

          <div v-else v-for="txn in customerTransactions" :key="txn.transactionId" class="txn-item">
            <div class="txn-item-left">
              <span class="txn-number">{{ txn.transactionNumber }}</span>
              <span class="txn-date">{{ authStore.formatDate(txn.createdAt) }}</span>
            </div>
            <div class="txn-item-right">
              <span class="txn-total">{{ authStore.formatCurrency(parseFloat(txn.total)) }}</span>
              <Tag :value="txn.status" :severity="getStatusSeverity(txn.status)" />
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Close" severity="secondary" @click="showDetailDialog = false" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.customers-page {
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

.search-bar {
  max-width: 400px;
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

/* Customer name with avatar initials */
.customer-name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.customer-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
  text-transform: uppercase;
}

/* Dialog form */
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
  margin-top: 0.2rem;
}

/* Customer Detail */
.customer-detail {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.detail-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.detail-info-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #0f172a;
  border-radius: 8px;
  border: 1px solid #334155;
}

.detail-info-item .pi {
  color: #3b82f6;
  font-size: 1rem;
  margin-top: 0.1rem;
}

.detail-label {
  display: block;
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.2rem;
}

.detail-value {
  display: block;
  font-size: 0.875rem;
  color: #f1f5f9;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

/* Transaction Summary Cards */
.txn-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.txn-summary-card {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.txn-summary-card.green {
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.08);
}

.txn-summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #22c55e;
}

.txn-summary-label {
  font-size: 0.75rem;
  color: #16a34a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Transaction History */
.txn-history {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.txn-history-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #94a3b8;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.txn-loading,
.txn-empty {
  text-align: center;
  padding: 1.5rem;
  color: #475569;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.txn-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
}

.txn-item-left {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.txn-number {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f1f5f9;
}

.txn-date {
  font-size: 0.75rem;
  color: #64748b;
}

.txn-item-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.txn-total {
  font-size: 0.875rem;
  font-weight: 700;
  color: #22c55e;
}

.w-full {
  width: 100% !important;
}
</style>
