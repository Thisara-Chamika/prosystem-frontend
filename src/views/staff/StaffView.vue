<script setup lang="ts">
import { ref, onMounted } from 'vue'
import staffService from '../../services/staffService'
import type { Staff, CreateStaffRequest, UpdateStaffRequest } from '../../types'
import { useAuthStore } from '../../stores/authStore'

import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'

const confirm = useConfirm()
const toast = useToast()
const authStore = useAuthStore()

const isOwner = authStore.userRole === 'shop_owner'

// ── State ─────────────────────────────────────────
const staff = ref<Staff[]>([])
const loading = ref(false)
const totalRecords = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// Filter state
const filterRole = ref<'shop_manager' | 'cashier' | null>(null)
const filterStatus = ref<boolean | null>(null)

// Add dialog state
const showAddDialog = ref(false)
const saving = ref(false)
const addForm = ref<CreateStaffRequest>({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'cashier',
  phone: '',
})

// Edit dialog state
const showEditDialog = ref(false)
const editingStaff = ref<Staff | null>(null)
const updating = ref(false)
const editForm = ref<UpdateStaffRequest>({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  role: 'cashier',
})

const roleOptions = [
  { label: 'Shop Manager', value: 'shop_manager' },
  { label: 'Cashier', value: 'cashier' },
]

const filterRoleOptions = [
  { label: 'All Roles', value: null },
  { label: 'Shop Manager', value: 'shop_manager' },
  { label: 'Cashier', value: 'cashier' },
]

const filterStatusOptions = [
  { label: 'All Status', value: null },
  { label: 'Active', value: true },
  { label: 'Inactive', value: false },
]

// ── Methods ───────────────────────────────────────
async function loadStaff() {
  loading.value = true
  try {
    const params: any = {
      page: currentPage.value,
      limit: pageSize.value,
    }
    if (filterRole.value !== null) params.role = filterRole.value
    if (filterStatus.value !== null) params.isActive = filterStatus.value

    const response = await staffService.getStaff(params)
    if (response.success) {
      staff.value = response.data
      totalRecords.value = response.pagination?.total ?? response.data.length
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load staff',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

function onPageChange(event: any) {
  currentPage.value = event.page + 1
  pageSize.value = event.rows
  loadStaff()
}

function onFilterChange() {
  currentPage.value = 1
  loadStaff()
}

function openAddDialog() {
  addForm.value = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'cashier',
    phone: '',
  }
  showAddDialog.value = true
}

function openEditDialog(member: Staff) {
  editingStaff.value = member
  editForm.value = {
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone || '',
    password: '',
    role: member.role,
  }
  showEditDialog.value = true
}

async function saveStaff() {
  if (
    !addForm.value.firstName ||
    !addForm.value.lastName ||
    !addForm.value.email ||
    !addForm.value.password
  ) {
    toast.add({
      severity: 'warn',
      summary: 'Required',
      detail: 'Please fill in all required fields',
      life: 3000,
    })
    return
  }

  saving.value = true
  try {
    const payload: CreateStaffRequest = {
      firstName: addForm.value.firstName,
      lastName: addForm.value.lastName,
      email: addForm.value.email,
      password: addForm.value.password,
      role: addForm.value.role,
    }
    if (addForm.value.phone) payload.phone = addForm.value.phone

    const response = await staffService.createStaff(payload)
    if (response.success) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Staff member added successfully',
        life: 3000,
      })
      showAddDialog.value = false
      staff.value = [response.data, ...staff.value]
      totalRecords.value++
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to add staff member',
      life: 3000,
    })
  } finally {
    saving.value = false
  }
}

async function updateStaff() {
  if (!editingStaff.value) return
  updating.value = true
  try {
    const payload: UpdateStaffRequest = {
      firstName: editForm.value.firstName,
      lastName: editForm.value.lastName,
      email: editForm.value.email,
      phone: editForm.value.phone || undefined,
      role: editForm.value.role,
    }
    // Only send password if filled in
    if (editForm.value.password) payload.password = editForm.value.password

    const response = await staffService.updateStaff(editingStaff.value.userId, payload)
    if (response.success) {
      toast.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Staff member updated successfully',
        life: 3000,
      })
      showEditDialog.value = false

      // Local array update — no full reload
      const index = staff.value.findIndex((s) => s.userId === editingStaff.value!.userId)
      if (index !== -1) {
        staff.value[index] = response.data
      }
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to update staff member',
      life: 3000,
    })
  } finally {
    updating.value = false
  }
}

function confirmDeactivate(member: Staff) {
  confirm.require({
    message: `Are you sure you want to deactivate ${member.firstName} ${member.lastName}?`,
    header: 'Confirm Deactivate',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary' },
    acceptProps: { label: 'Deactivate', severity: 'danger' },
    accept: async () => {
      try {
        await staffService.deleteStaff(member.userId)
        toast.add({
          severity: 'success',
          summary: 'Deactivated',
          detail: `${member.firstName} ${member.lastName} has been deactivated`,
          life: 3000,
        })
        const index = staff.value.findIndex((s) => s.userId === member.userId)
        if (index !== -1) {
          staff.value[index] = { ...staff.value[index], isActive: false } as Staff
        }
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.response?.data?.message || 'Failed to deactivate staff member',
          life: 3000,
        })
      }
    },
  })
}

async function reactivateStaff(member: Staff) {
  try {
    const response = await staffService.updateStaff(member.userId, { isActive: true })
    if (response.success) {
      toast.add({
        severity: 'success',
        summary: 'Reactivated',
        detail: `${member.firstName} ${member.lastName} has been reactivated`,
        life: 3000,
      })
      const index = staff.value.findIndex((s) => s.userId === member.userId)
      if (index !== -1) {
        staff.value[index] = response.data
      }
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to reactivate staff member',
      life: 3000,
    })
  }
}

onMounted(() => {
  loadStaff()
})
</script>

<template>
  <div class="staff-page">
    <Toast />
    <ConfirmDialog />

    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Staff</h1>
        <p class="page-subtitle">Manage your team members</p>
      </div>
      <Button v-if="isOwner" label="Add Staff" icon="pi pi-plus" @click="openAddDialog" />
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <Select
        v-model="filterRole"
        :options="filterRoleOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Roles"
        class="filter-select"
        @change="onFilterChange"
      />
      <Select
        v-model="filterStatus"
        :options="filterStatusOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Status"
        class="filter-select"
        @change="onFilterChange"
      />
    </div>

    <!-- Staff Table -->
    <div class="table-card">
      <DataTable
        :value="staff"
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
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-users" />
            <p>No staff members found</p>
          </div>
        </template>

        <!-- Name Column -->
        <Column header="Name" style="width: 25%">
          <template #body="{ data }">
            <div class="staff-name-cell">
              <div class="staff-avatar">
                {{ data.firstName.charAt(0) }}{{ data.lastName.charAt(0) }}
              </div>
              <div>
                <span class="staff-name">{{ data.firstName }} {{ data.lastName }}</span>
                <span class="staff-email">{{ data.email }}</span>
              </div>
            </div>
          </template>
        </Column>

        <!-- Role Column -->
        <Column header="Role" style="width: 15%">
          <template #body="{ data }">
            <Tag
              :value="
                data.role === 'shop_manager'
                  ? 'Manager'
                  : data.role === 'cashier'
                    ? 'Cashier'
                    : data.role
              "
              :severity="
                data.role === 'shop_manager'
                  ? 'info'
                  : data.role === 'cashier'
                    ? 'secondary'
                    : 'warn'
              "
            />
          </template>
        </Column>

        <!-- Phone Column -->
        <Column header="Phone" style="width: 18%">
          <template #body="{ data }">
            {{ data.phone || '—' }}
          </template>
        </Column>

        <!-- Last Login Column -->
        <Column header="Last Login" style="width: 20%">
          <template #body="{ data }">
            <span class="last-login">
              {{ data.lastLogin ? authStore.formatDate(data.lastLogin) : 'Never' }}
            </span>
          </template>
        </Column>

        <!-- Status Column -->
        <Column header="Status" style="width: 10%">
          <template #body="{ data }">
            <Tag
              :value="data.isActive ? 'Active' : 'Inactive'"
              :severity="data.isActive ? 'success' : 'danger'"
            />
          </template>
        </Column>

        <!-- Actions Column -->
        <Column header="Actions" style="width: 12%" v-if="isOwner">
          <template #body="{ data }">
            <div class="action-buttons">
              <Button
                icon="pi pi-pencil"
                size="small"
                severity="secondary"
                @click="openEditDialog(data)"
              />
              <Button
                v-if="data.isActive"
                icon="pi pi-ban"
                size="small"
                severity="danger"
                v-tooltip="'Deactivate'"
                @click="confirmDeactivate(data)"
              />
              <Button
                v-else
                icon="pi pi-check-circle"
                size="small"
                severity="success"
                v-tooltip="'Reactivate'"
                @click="reactivateStaff(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Add Staff Dialog -->
    <Dialog
      v-model:visible="showAddDialog"
      header="Add Staff Member"
      :style="{ width: '480px' }"
      modal
    >
      <div class="dialog-form">
        <div class="form-row">
          <div class="field">
            <label>First Name *</label>
            <InputText v-model="addForm.firstName" placeholder="First name" class="w-full" />
          </div>
          <div class="field">
            <label>Last Name *</label>
            <InputText v-model="addForm.lastName" placeholder="Last name" class="w-full" />
          </div>
        </div>
        <div class="field">
          <label>Email *</label>
          <InputText
            v-model="addForm.email"
            placeholder="email@example.com"
            class="w-full"
            autocomplete="off"
          />
        </div>
        <div class="field">
          <label>Password *</label>
          <InputText
            v-model="addForm.password"
            type="password"
            placeholder="Min 6 characters"
            class="w-full"
            autocomplete="off"
          />
        </div>
        <div class="field">
          <label>Role *</label>
          <Select
            v-model="addForm.role"
            :options="roleOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
        <div class="field">
          <label>Phone</label>
          <InputText v-model="addForm.phone" placeholder="+94771234567" class="w-full" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showAddDialog = false" />
        <Button label="Add Staff" icon="pi pi-check" :loading="saving" @click="saveStaff" />
      </template>
    </Dialog>

    <!-- Edit Staff Dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      header="Edit Staff Member"
      :style="{ width: '480px' }"
      modal
    >
      <div class="dialog-form">
        <div class="form-row">
          <div class="field">
            <label>First Name</label>
            <InputText v-model="editForm.firstName" placeholder="First name" class="w-full" />
          </div>
          <div class="field">
            <label>Last Name</label>
            <InputText v-model="editForm.lastName" placeholder="Last name" class="w-full" />
          </div>
        </div>
        <div class="field">
          <label>Email</label>
          <InputText v-model="editForm.email" placeholder="email@example.com" class="w-full" />
        </div>
        <div class="field">
          <label>New Password <span class="optional">(leave blank to keep current)</span></label>
          <InputText
            v-model="editForm.password"
            type="password"
            placeholder="Enter new password to change"
            class="w-full"
          />
        </div>
        <div class="field">
          <label>Role</label>
          <Select
            v-model="editForm.role"
            :options="roleOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
        <div class="field">
          <label>Phone</label>
          <InputText v-model="editForm.phone" placeholder="+94771234567" class="w-full" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showEditDialog = false" />
        <Button label="Save Changes" icon="pi pi-check" :loading="updating" @click="updateStaff" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.staff-page {
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

.filters-bar {
  display: flex;
  gap: 1rem;
}

.filter-select {
  width: 180px;
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

.staff-name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.staff-avatar {
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

.staff-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #505d6f;
}

.staff-email {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
}

.last-login {
  font-size: 0.875rem;
  color: #94a3b8;
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

.optional {
  font-size: 0.75rem;
  color: #475569;
  font-weight: 400;
}

.w-full {
  width: 100% !important;
}
</style>
