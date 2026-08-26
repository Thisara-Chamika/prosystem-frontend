<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import supportService from '../../services/supportService'
import { TICKET_STATUS_META } from '../../utils/ticketStatus'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// Same pattern as ReportsView.vue — role check lives in the component,
// not the router, matching every other owner/manager-only page in this app.
if (authStore.userRole === 'cashier') {
  router.push('/dashboard')
}

const tickets = ref<any[]>([])
const loading = ref(false)

async function loadTickets() {
  loading.value = true
  try {
    const res = await supportService.getTickets()
    if (res.success) tickets.value = res.data
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load tickets', life: 3000 })
  } finally {
    loading.value = false
  }
}

function openTicket(ticket: any) {
  router.push(`/support/${ticket.ticketId}`)
}

// ── New Ticket dialog ────────────────────────────────
const showNewDialog = ref(false)
const newSubject = ref('')
const newMessage = ref('')
const creating = ref(false)

async function submitNewTicket() {
  if (!newSubject.value.trim() || !newMessage.value.trim()) return
  creating.value = true
  try {
    const res = await supportService.createTicket(newSubject.value.trim(), newMessage.value.trim())
    if (res.success) {
      showNewDialog.value = false
      newSubject.value = ''
      newMessage.value = ''
      // Straight into the new ticket's thread — you just wrote the first
      // message, natural next step is seeing it land, not back to a list.
      router.push(`/support/${res.data.ticketId}`)
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to create ticket',
      life: 3000,
    })
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  loadTickets()
})
</script>

<template>
  <div class="support-page">
    <Toast />

    <div class="page-header">
      <h1 class="page-title">🎫 Support</h1>
      <Button label="New Ticket" icon="pi pi-plus" @click="showNewDialog = true" />
    </div>

    <DataTable
      :value="tickets"
      :loading="loading"
      stripedRows
      class="clickable-rows"
      @row-click="(e: any) => openTicket(e.data)"
    >
      <Column field="subject" header="Subject" />
      <Column header="Status">
        <template #body="{ data }">
          {{ TICKET_STATUS_META[data.status]?.emoji }} {{ TICKET_STATUS_META[data.status]?.label }}
        </template>
      </Column>

      <template #empty>
        <div class="empty-state">
          <i class="pi pi-inbox" />
          <p>No support tickets yet</p>
        </div>
      </template>
    </DataTable>

    <!-- New Ticket dialog -->
    <Dialog
      v-model:visible="showNewDialog"
      header="New Support Ticket"
      :style="{ width: '420px' }"
      modal
    >
      <div class="new-ticket-form">
        <div class="field">
          <label>Subject</label>
          <InputText v-model="newSubject" placeholder="Brief summary of the issue" class="w-full" />
        </div>
        <div class="field">
          <label>Message</label>
          <Textarea
            v-model="newMessage"
            rows="4"
            placeholder="Describe the issue..."
            class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showNewDialog = false" />
        <Button
          label="Submit"
          icon="pi pi-check"
          :loading="creating"
          :disabled="!newSubject.trim() || !newMessage.trim()"
          @click="submitNewTicket"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.support-page {
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
.new-ticket-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.field label {
  font-size: 0.875rem;
  color: #cbd5e1;
}
.w-full {
  width: 100% !important;
}
</style>
