<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import loyaltyService from '../../../services/loyaltyService'
import { useAuthStore } from '../../../stores/authStore'

import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const customerId = route.params.customerId as string

// ── State ─────────────────────────────────────────
const loading = ref(true)
const profile = ref<any>(null)
const loyalty = ref<any>(null)
const activeTab = ref<'purchases' | 'points'>('purchases')

// ── Computed ──────────────────────────────────────
const tierInfo = computed(() => {
  const tier = profile.value?.loyaltyTier || 'bronze'
  switch (tier) {
    case 'gold':
      return { label: '🥇 Gold Member', class: 'tier-gold' }
    case 'silver':
      return { label: '🥈 Silver Member', class: 'tier-silver' }
    default:
      return { label: '🥉 Bronze Member', class: 'tier-bronze' }
  }
})

const pointsValue = computed(() => {
  const settings = authStore.loyaltySettings
  if (!settings || !profile.value) return 0
  return Math.floor(profile.value.pointsBalance / settings.pointsToRedeem) * settings.redeemValue
})

const progressPercent = computed(() => {
  const settings = authStore.loyaltySettings
  if (!settings || !profile.value) return 0
  const tier = profile.value.loyaltyTier
  const totalEarned = profile.value.totalPointsEarned

  if (tier === 'gold') return 100
  if (tier === 'silver') {
    return Math.min(100, Math.round((totalEarned / settings.goldThreshold) * 100))
  }
  return Math.min(100, Math.round((totalEarned / settings.silverThreshold) * 100))
})

const progressLabel = computed(() => {
  if (!loyalty.value) return ''
  if (profile.value?.loyaltyTier === 'gold') return 'Maximum tier reached! 🏆'
  return loyalty.value.nextTier?.message || ''
})

const avgPerVisit = computed(() => {
  if (!profile.value || profile.value.totalVisits === 0) return 0
  return parseFloat(profile.value.totalSpent) / profile.value.totalVisits
})

const lastVisitDisplay = computed(() => {
  if (!profile.value?.lastVisit) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: authStore.shop?.timezone || 'UTC',
  }).format(new Date(profile.value.lastVisit))
})

// ── Methods ───────────────────────────────────────
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

async function loadProfile() {
  loading.value = true
  try {
    const [profileRes, loyaltyRes] = await Promise.all([
      loyaltyService.getCustomerProfile(customerId),
      loyaltyService.getCustomerLoyalty(customerId),
    ])
    if (profileRes.success) profile.value = profileRes.data
    if (loyaltyRes.success) loyalty.value = loyaltyRes.data
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load customer profile',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<template>
  <div class="profile-page">
    <Toast />

    <!-- Back button -->
    <div class="back-nav">
      <Button
        label="Back to Customers"
        icon="pi pi-arrow-left"
        severity="secondary"
        size="small"
        text
        @click="router.push('/customers')"
      />
    </div>

    <!-- Loading -->
    <div class="loading-state" v-if="loading">
      <i class="pi pi-spin pi-spinner" />
      <p>Loading profile...</p>
    </div>

    <template v-else-if="profile">
      <!-- Header -->
      <div class="profile-header">
        <div class="profile-avatar">
          {{ profile.firstName.charAt(0) }}{{ profile.lastName.charAt(0) }}
        </div>
        <div class="profile-info">
          <h1 class="profile-name">{{ profile.firstName }} {{ profile.lastName }}</h1>
          <div class="profile-contacts">
            <span v-if="profile.phone"> <i class="pi pi-phone" /> {{ profile.phone }} </span>
            <span v-if="profile.email"> <i class="pi pi-envelope" /> {{ profile.email }} </span>
          </div>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ profile.totalVisits }}</span>
          <span class="stat-label">Visits</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{
            authStore.formatCurrency(parseFloat(profile.totalSpent))
          }}</span>
          <span class="stat-label">Total Spent</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ authStore.formatCurrency(avgPerVisit) }}</span>
          <span class="stat-label">Avg / Visit</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ lastVisitDisplay }}</span>
          <span class="stat-label">Last Visit</span>
        </div>
      </div>

      <!-- Loyalty Card -->
      <div class="loyalty-card" v-if="authStore.loyaltySettings?.isEnabled">
        <div class="loyalty-header">
          <span class="tier-badge" :class="tierInfo.class">{{ tierInfo.label }}</span>
          <div class="points-info">
            <span class="points-value">{{ profile.pointsBalance }} points available</span>
            <span class="points-worth"> Worth {{ authStore.formatCurrency(pointsValue) }} </span>
          </div>
        </div>

        <div v-if="profile.loyaltyTier !== 'gold'">
          <div class="progress-label-row">
            <span class="progress-label"
              >Progress to {{ profile.loyaltyTier === 'silver' ? 'Gold' : 'Silver' }}</span
            >
            <span class="progress-label"
              >{{ profile.totalPointsEarned }} /
              {{
                profile.loyaltyTier === 'silver'
                  ? authStore.loyaltySettings?.goldThreshold
                  : authStore.loyaltySettings?.silverThreshold
              }}
              pts</span
            >
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }" />
          </div>
          <p class="progress-note">{{ progressLabel }}</p>
        </div>

        <div v-else class="gold-achieved">
          <i class="pi pi-star-fill" />
          <span>Maximum tier reached! 🏆</span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-switcher">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'purchases' }"
          @click="activeTab = 'purchases'"
        >
          Purchase History
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'points' }"
          @click="activeTab = 'points'"
        >
          Points History
        </button>
      </div>

      <!-- Purchase History -->
      <div v-if="activeTab === 'purchases'">
        <div class="empty-state" v-if="profile.recentTransactions?.length === 0">
          <i class="pi pi-receipt" />
          <p>No transactions yet</p>
        </div>
        <div class="history-list" v-else>
          <div
            v-for="txn in profile.recentTransactions"
            :key="txn.transactionId"
            class="history-item"
          >
            <div class="history-item-left">
              <span class="history-ref">{{ txn.transactionNumber }}</span>
              <span class="history-date">{{ authStore.formatDate(txn.createdAt) }}</span>
            </div>
            <div class="history-item-right">
              <span class="history-amount">{{
                authStore.formatCurrency(parseFloat(txn.total))
              }}</span>
              <Tag :value="txn.status" :severity="getStatusSeverity(txn.status)" />
            </div>
          </div>
        </div>
      </div>

      <!-- Points History -->
      <div v-if="activeTab === 'points'">
        <div class="empty-state" v-if="!profile.loyaltyHistory?.length">
          <i class="pi pi-star" />
          <p>No points activity yet</p>
        </div>
        <div class="history-list" v-else>
          <div
            v-for="entry in profile.loyaltyHistory"
            :key="entry.loyaltyTxId"
            class="history-item"
          >
            <div class="history-item-left">
              <span
                class="history-ref"
                :class="entry.type === 'earn' ? 'points-earn' : 'points-redeem'"
              >
                {{ entry.type === 'earn' ? '+' : '-' }}{{ Math.abs(entry.points) }} pts
              </span>
              <span class="history-date">{{ authStore.formatDate(entry.createdAt) }}</span>
            </div>
            <div class="history-item-right">
              <span class="history-desc">{{ entry.description }}</span>
              <span class="history-balance">Balance: {{ entry.balanceAfter }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 800px;
}

.back-nav {
  display: flex;
}

.loading-state {
  text-align: center;
  padding: 4rem;
  color: #475569;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.loading-state i {
  font-size: 2rem;
}

/* ── Header ── */
.profile-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
  text-transform: uppercase;
  flex-shrink: 0;
}

.profile-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
}

.profile-contacts {
  display: flex;
  gap: 1rem;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #94a3b8;
}

.profile-contacts .pi {
  margin-right: 0.3rem;
}

/* ── Stats ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: center;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f1f5f9;
}

.stat-label {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Loyalty Card ── */
.loyalty-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loyalty-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.tier-badge {
  font-size: 1rem;
  font-weight: 700;
  padding: 0.4rem 0.875rem;
  border-radius: 8px;
}

.tier-gold {
  background: rgba(234, 179, 8, 0.15);
  color: #ca8a04;
}
.tier-silver {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}
.tier-bronze {
  background: rgba(180, 120, 80, 0.15);
  color: #b47850;
}

.points-info {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.points-value {
  font-size: 1rem;
  font-weight: 700;
  color: #f1f5f9;
}

.points-worth {
  font-size: 0.8rem;
  color: #22c55e;
}

.progress-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #64748b;
  margin-bottom: 0.4rem;
}

.progress-bar {
  height: 8px;
  background: #334155;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-note {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0.4rem 0 0;
}

.gold-achieved {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ca8a04;
  font-weight: 600;
}

/* ── Tabs ── */
.tab-switcher {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid #334155;
  padding-bottom: 0;
}

.tab-btn {
  padding: 0.6rem 1.25rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  margin-bottom: -1px;
}

.tab-btn:hover {
  color: #f1f5f9;
}

.tab-btn.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

/* ── History List ── */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
}

.history-item-left {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.history-ref {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f1f5f9;
}

.history-date {
  font-size: 0.75rem;
  color: #64748b;
}

.history-item-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-direction: column;
  align-items: flex-end;
}

.history-amount {
  font-weight: 700;
  color: #22c55e;
  font-size: 0.875rem;
}

.history-desc {
  font-size: 0.8rem;
  color: #94a3b8;
}

.history-balance {
  font-size: 0.75rem;
  color: #64748b;
}

.points-earn {
  color: #22c55e;
}
.points-redeem {
  color: #ef4444;
}

/* ── Empty ── */
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #475569;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.empty-state i {
  font-size: 2.5rem;
}
</style>
