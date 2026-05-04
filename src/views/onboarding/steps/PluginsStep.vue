<script setup lang="ts">
import Button from 'primevue/button'

const props = defineProps<{
  plugins: any[]
  activePlugins: string[]
  businessType: string
}>()

const emit = defineEmits<{
  toggle: [pluginId: string, active: boolean]
  back: []
  next: []
}>()

function isActive(pluginId: string): boolean {
  return props.activePlugins.includes(pluginId)
}

function getPluginLabel(pluginId: string): string {
  const labels: Record<string, { name: string; description: string }> = {
    'barcode-scanner': {
      name: 'Barcode Scanner',
      description: 'Scan product barcodes at checkout',
    },
    'size-variants': {
      name: 'Size Variants',
      description: 'Track inventory by size (S, M, L, XL)',
    },
    'color-variants': { name: 'Color Variants', description: 'Track inventory by color' },
    'loyalty-program': {
      name: 'Loyalty Program',
      description: 'Reward returning customers with points',
    },
    'online-payments': { name: 'Online Payments', description: 'Accept card and digital payments' },
    'appointment-booking': {
      name: 'Appointment Booking',
      description: 'Schedule and manage appointments',
    },
    'staff-commission': {
      name: 'Staff Commission',
      description: 'Track and calculate staff commissions',
    },
    'sms-notifications': { name: 'SMS Notifications', description: 'Send SMS alerts to customers' },
    'table-management': {
      name: 'Table Management',
      description: 'Manage restaurant tables and seating',
    },
    'kitchen-display': { name: 'Kitchen Display', description: 'Show orders on kitchen screen' },
    'online-ordering': { name: 'Online Ordering', description: 'Accept orders online' },
    delivery: { name: 'Delivery', description: 'Manage delivery orders and tracking' },
    'expiry-tracking': { name: 'Expiry Tracking', description: 'Track medicine expiry dates' },
    'prescription-management': {
      name: 'Prescription Management',
      description: 'Manage customer prescriptions',
    },
    'weighing-scale': {
      name: 'Weighing Scale',
      description: 'Integrate with digital weighing scales',
    },
    'warranty-tracking': { name: 'Warranty Tracking', description: 'Track product warranties' },
    'serial-number-tracking': {
      name: 'Serial Number Tracking',
      description: 'Track device serial numbers',
    },
  }
  return labels[pluginId]?.name || pluginId
}

function getPluginDescription(pluginId: string): string {
  const labels: Record<string, { name: string; description: string }> = {
    'barcode-scanner': {
      name: 'Barcode Scanner',
      description: 'Scan product barcodes at checkout',
    },
    'size-variants': {
      name: 'Size Variants',
      description: 'Track inventory by size (S, M, L, XL)',
    },
    'color-variants': { name: 'Color Variants', description: 'Track inventory by color' },
    'loyalty-program': {
      name: 'Loyalty Program',
      description: 'Reward returning customers with points',
    },
    'online-payments': { name: 'Online Payments', description: 'Accept card and digital payments' },
    'appointment-booking': {
      name: 'Appointment Booking',
      description: 'Schedule and manage appointments',
    },
    'staff-commission': {
      name: 'Staff Commission',
      description: 'Track and calculate staff commissions',
    },
    'sms-notifications': { name: 'SMS Notifications', description: 'Send SMS alerts to customers' },
    'table-management': {
      name: 'Table Management',
      description: 'Manage restaurant tables and seating',
    },
    'kitchen-display': { name: 'Kitchen Display', description: 'Show orders on kitchen screen' },
    'online-ordering': { name: 'Online Ordering', description: 'Accept orders online' },
    delivery: { name: 'Delivery', description: 'Manage delivery orders and tracking' },
    'expiry-tracking': { name: 'Expiry Tracking', description: 'Track medicine expiry dates' },
    'prescription-management': {
      name: 'Prescription Management',
      description: 'Manage customer prescriptions',
    },
    'weighing-scale': {
      name: 'Weighing Scale',
      description: 'Integrate with digital weighing scales',
    },
    'warranty-tracking': { name: 'Warranty Tracking', description: 'Track product warranties' },
    'serial-number-tracking': {
      name: 'Serial Number Tracking',
      description: 'Track device serial numbers',
    },
  }
  return labels[pluginId]?.description || ''
}
</script>

<template>
  <div class="step-card">
    <div class="step-header">
      <p class="step-number">Step 2 of 3</p>
      <h2 class="step-title">Activate features</h2>
      <p class="step-desc">Turn on the features you need for your business</p>
    </div>

    <!-- Plugin list -->
    <div class="plugins-list">
      <div v-for="plugin in plugins" :key="plugin" class="plugin-item">
        <div class="plugin-info">
          <span class="plugin-name">{{ getPluginLabel(plugin) }}</span>
          <span class="plugin-desc">{{ getPluginDescription(plugin) }}</span>
        </div>
        <div
          class="toggle"
          :class="{ active: isActive(plugin) }"
          @click="emit('toggle', plugin, !isActive(plugin))"
        >
          <div class="toggle-thumb" />
        </div>
      </div>

      <div v-if="plugins.length === 0" class="no-plugins">
        <i class="pi pi-info-circle" />
        <p>No additional features available for this business type</p>
      </div>
    </div>

    <!-- Navigation -->
    <div class="step-nav">
      <Button label="Back" severity="secondary" icon="pi pi-arrow-left" @click="emit('back')" />
      <Button label="Continue" icon="pi pi-arrow-right" icon-pos="right" @click="emit('next')" />
    </div>
  </div>
</template>

<style scoped>
.step-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 2rem;
}

.step-header {
  margin-bottom: 1.5rem;
}

.step-number {
  font-size: 0.8rem;
  color: #3b82f6;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.5rem;
}

.step-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.4rem;
}

.step-desc {
  color: #94a3b8;
  font-size: 0.9rem;
  margin: 0;
}

.plugins-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.plugin-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
}

.plugin-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.plugin-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #f1f5f9;
}

.plugin-desc {
  font-size: 0.8rem;
  color: #64748b;
}

/* Custom Toggle Switch */
.toggle {
  width: 48px;
  height: 26px;
  border-radius: 13px;
  background: #334155;
  position: relative;
  cursor: pointer;
  transition: background 0.3s;
  flex-shrink: 0;
}

.toggle.active {
  background: #3b82f6;
}

.toggle-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: transform 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.toggle.active .toggle-thumb {
  transform: translateX(22px);
}

.no-plugins {
  text-align: center;
  padding: 2rem;
  color: #475569;
}

.step-nav {
  display: flex;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid #334155;
}
</style>
