<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import adminService from '../../services/adminService'
import { businessTypeLabel } from '../../utils/businessTypes'

import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const toast = useToast()

const shops = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const page = ref(1)
const limit = 20
const total = ref(0)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

let searchDebounce: number | undefined

function formatJoinedDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
    new Date(dateStr),
  )
}

async function loadShops() {
  loading.value = true
  try {
    const res = await adminService.getShops({
      search: searchQuery.value || undefined,
      page: page.value,
      limit,
    })
    if (res.success) {
      shops.value = res.data
      total.value = res.pagination?.total ?? res.data.length
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load shops', life: 3000 })
  } finally {
    loading.value = false
  }
}

function onSearchInput() {
  // Changing the search term while sitting on page 3 of the OLD result set
  // could land on an empty page of the new, smaller filtered set — reset.
  page.value = 1
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = window.setTimeout(loadShops, 350)
}

function prevPage() {
  if (page.value > 1) {
    page.value--
    loadShops()
  }
}

function nextPage() {
  if (page.value < totalPages.value) {
    page.value++
    loadShops()
  }
}

// ── Status toggle confirmation ──────────────────────
const showConfirm = ref(false)
const targetShop = ref<any>(null)
const updating = ref(false)

const confirmMessage = computed(() => {
  if (!targetShop.value) return ''
  return targetShop.value.isActive
    ? `This will prevent ${targetShop.value.shopName}'s staff from logging in. Continue?`
    : `This will allow ${targetShop.value.shopName}'s staff to log in again. Continue?`
})

function openConfirm(shop: any) {
  targetShop.value = shop
  showConfirm.value = true
}

async function confirmToggle() {
  if (!targetShop.value) return
  updating.value = true
  try {
    const res = await adminService.updateShopStatus(
      targetShop.value.shopId,
      !targetShop.value.isActive,
    )
    if (res.success) {
      showConfirm.value = false
      await loadShops()
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to update shop status',
      life: 3000,
    })
  } finally {
    updating.value = false
  }
}

onMounted(() => {
  loadShops()
})
</script>

<template>
  <div class="shops-page">
    <Toast />

    <div class="page-header">
      <h1 class="page-title">Shops</h1>
      <IconField class="search-field">
        <InputIcon class="pi pi-search" />
        <InputText v-model="searchQuery" placeholder="Search shops..." @input="onSearchInput" />
      </IconField>
    </div>

    <DataTable :value="shops" :loading="loading" stripedRows>
      <Column field="shopName" header="Name" />
      <Column field="ownerName" header="Owner" />
      <Column header="Type">
        <template #body="{ data }">{{ businessTypeLabel(data.businessType) }}</template>
      </Column>
      <Column header="Joined">
        <template #body="{ data }">{{ formatJoinedDate(data.createdAt) }}</template>
      </Column>
      <Column header="Status">
        <template #body="{ data }">
          <span :class="data.isActive ? 'status-active' : 'status-inactive'">
            {{ data.isActive ? '🟢 Active' : '🔴 Deactivated' }}
          </span>
        </template>
      </Column>
      <Column header="" style="width: 140px">
        <template #body="{ data }">
          <Button
            :label="data.isActive ? 'Deactivate' : 'Reactivate'"
            size="small"
            :severity="data.isActive ? 'danger' : 'success'"
            outlined
            @click="openConfirm(data)"
          />
        </template>
      </Column>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-inbox" />
          <p>No shops found</p>
        </div>
      </template>
    </DataTable>

    <div class="pagination-row" v-if="!loading && shops.length > 0">
      <Button
        label="Prev"
        icon="pi pi-chevron-left"
        size="small"
        severity="secondary"
        :disabled="page <= 1"
        @click="prevPage"
      />
      <span class="page-label">Page {{ page }}/{{ totalPages }}</span>
      <Button
        label="Next"
        icon="pi pi-chevron-right"
        iconPos="right"
        size="small"
        severity="secondary"
        :disabled="page >= totalPages"
        @click="nextPage"
      />
    </div>

    <!-- Status change confirmation -->
    <Dialog v-model:visible="showConfirm" header="Confirm" :style="{ width: '380px' }" modal>
      <p class="confirm-text">{{ confirmMessage }}</p>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showConfirm = false" />
        <Button
          :label="targetShop?.isActive ? 'Deactivate' : 'Reactivate'"
          :severity="targetShop?.isActive ? 'danger' : 'success'"
          :loading="updating"
          @click="confirmToggle"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.shops-page {
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

.search-field {
  width: 260px;
}

.status-active {
  color: #22c55e;
  font-size: 0.875rem;
  font-weight: 600;
}

.status-inactive {
  color: #ef4444;
  font-size: 0.875rem;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #475569;
}

.empty-state i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  display: block;
}

.pagination-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.page-label {
  font-size: 0.875rem;
  color: #94a3b8;
}

.confirm-text {
  color: #9e9f9f;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0.5rem 0;
}
</style>
