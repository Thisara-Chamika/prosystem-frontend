<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import supportService from '../../services/supportService'
import { TICKET_STATUS_META } from '../../utils/ticketStatus'

import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

if (authStore.userRole === 'cashier') {
  router.push('/dashboard')
}

const ticketId = route.params.ticketId as string

const ticket = ref<any>(null)
const loading = ref(false)
const sending = ref(false)
const replyText = ref('')

// Deliberately NOT authStore.formatDate — that reads shop.timezone, which
function formatMessageTime(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

async function loadTicket() {
  loading.value = true
  try {
    const res = await supportService.getTicket(ticketId)
    if (res.success) ticket.value = res.data
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load ticket', life: 3000 })
  } finally {
    loading.value = false
  }
}

async function sendReply() {
  if (!replyText.value.trim()) return
  sending.value = true
  try {
    const res = await supportService.sendMessage(ticketId, replyText.value.trim())
    if (res.success) {
      replyText.value = ''
      await loadTicket()
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to send reply',
      life: 3000,
    })
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  loadTicket()
})
</script>

<template>
  <div class="thread-page">
    <Toast />

    <div class="thread-header">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.push('/support')" />
      <div class="thread-title" v-if="ticket">{{ ticket.subject }}</div>
      <span class="status-badge" v-if="ticket">
        {{ TICKET_STATUS_META[ticket.status]?.emoji }}
        {{ TICKET_STATUS_META[ticket.status]?.label }}
      </span>
    </div>

    <div class="thread-body" v-if="ticket">
      <div v-for="msg in ticket.messages" :key="msg.messageId" class="message-row">
        <div class="message-meta">
          <span class="sender-name" :class="{ 'sender-admin': msg.senderType === 'admin' }">
            {{ msg.senderName }}
          </span>
          <span class="message-time">{{ formatMessageTime(msg.createdAt) }}</span>
        </div>
        <p class="message-text">{{ msg.message }}</p>
      </div>

      <div v-if="ticket.messages.length === 0" class="empty-state">
        <p>No messages yet</p>
      </div>
    </div>

    <div class="reply-row" v-if="ticket">
      <Textarea v-model="replyText" rows="2" placeholder="Type a reply..." class="reply-input" />
      <Button
        label="Send"
        icon="pi pi-send"
        :loading="sending"
        :disabled="!replyText.trim()"
        @click="sendReply"
      />
    </div>
  </div>
</template>

<style scoped>
.thread-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  height: calc(100vh - 60px - 3rem);
}
.thread-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.thread-title {
  flex: 1;
  font-size: 1.1rem;
  font-weight: 700;
  color: #f1f5f9;
}
.status-badge {
  font-size: 0.875rem;
  color: #94a3b8;
}
.thread-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.25rem;
}
.message-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.message-meta {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}
.sender-name {
  font-size: 0.875rem;
  font-weight: 700;
  color: #cbd5e1;
}
.sender-name.sender-admin {
  color: #3b82f6;
}
.message-time {
  font-size: 0.75rem;
  color: #64748b;
}
.message-text {
  font-size: 0.9rem;
  color: #e2e8f0;
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
}
.empty-state {
  text-align: center;
  padding: 2rem;
  color: #475569;
}
.reply-row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}
.reply-input {
  flex: 1;
  resize: none;
}
</style>
