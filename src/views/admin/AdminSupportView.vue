<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import adminService from '../../services/adminService'
import { TICKET_STATUS_META, TICKET_STATUS_OPTIONS } from '../../utils/ticketStatus'

import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const router = useRouter()
const toast = useToast()

const tickets = ref<any[]>([])
const loading = ref(false)
const statusFilter = ref('all')

const filterOptions = [{ label: 'All', value: 'all' }, ...TICKET_STATUS_OPTIONS]

async function loadTickets() {
  loading.value = true
  try {
    const res = await adminService.getTickets(
      statusFilter.value === 'all' ? undefined : statusFilter.value,
    )
    if (res.success) tickets.value = res.data
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load tickets', life: 3000 })
  } finally {
    loading.value = false
  }
}

function openTicket(ticket: any) {
  router.push(`/admin/support/${ticket.ticketId}`)
}

onMounted(() => {
  loadTickets()
})
</script>

<template>
  <div class="tickets-page">
    <Toast />

    <div class="page-header">
      <h1 class="page-title">Support Tickets</h1>
      <div class="filter-row">
        <span>Filter:</span>
        <Select
          v-model="statusFilter"
          :options="filterOptions"
          optionLabel="label"
          optionValue="value"
          class="filter-select"
          @change="loadTickets"
        />
      </div>
    </div>

    <DataTable
      :value="tickets"
      :loading="loading"
      stripedRows
      class="clickable-rows"
      @row-click="(e: any) => openTicket(e.data)"
    >
      <Column field="shopName" header="Shop" />
      <Column field="subject" header="Subject" />
      <Column header="Status">
        <template #body="{ data }">
          {{ TICKET_STATUS_META[data.status]?.emoji }} {{ TICKET_STATUS_META[data.status]?.label }}
        </template>
      </Column>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-inbox" />
          <p>No tickets found</p>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.tickets-page {
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
.filter-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.875rem;
  color: #94a3b8;
}
.filter-select {
  width: 160px;
}
:deep(.clickable-rows .p-datatable-tbody > tr) {
  cursor: pointer;
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
</style>
