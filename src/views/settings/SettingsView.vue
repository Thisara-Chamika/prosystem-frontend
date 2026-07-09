<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import shopService from '../../services/shopService'
import { useAuthStore } from '../../stores/authStore'
import categoryService from '../../services/categoryService'
import type { Category } from '../../types'
import pluginService from '../../services/pluginService'
import auditLogService from '../../services/auditLogService'
import staffService from '../../services/staffService'
import loyaltyService from '../../services/loyaltyService'

import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import { useConfirm } from 'primevue/useconfirm'
import ConfirmDialog from 'primevue/confirmdialog'

const toast = useToast()
const authStore = useAuthStore()
const router = useRouter()
const confirm = useConfirm()

// ── Role Guard ────────────────────────────────────
if (authStore.userRole !== 'shop_owner') {
  router.push('/dashboard')
}

// ── State ─────────────────────────────────────────
const loading = ref(false)
const originalData = ref<any>(null)

// General tab
const shopName = ref('')
const currency = ref('')
const timezone = ref('')
const slug = ref('')
const createdAt = ref('')
const savingGeneral = ref(false)
const showCurrencyWarning = ref(false)

// Branding tab
const primaryColor = ref('#3b82f6')
const originalColor = ref('#3b82f6')
const logoUrl = ref('')
const savingBranding = ref(false)

// Categories tab
const categories = ref<Category[]>([])
const loadingCategories = ref(false)
const showAddCategoryDialog = ref(false)
const showEditCategoryDialog = ref(false)
const savingCategory = ref(false)
const editingCategory = ref<Category | null>(null)
const newCategoryName = ref('')
const editCategoryName = ref('')
const showCategoryErrorDialog = ref(false)
const categoryErrorMessage = ref('')

// Plugins tab
const plugins = ref<any[]>([])
const loadingPlugins = ref(false)
const installingPlugin = ref<string | null>(null)
const uninstallingPlugin = ref<string | null>(null)
const showInstallDialog = ref(false)
const showUninstallDialog = ref(false)
const showConfigureDialog = ref(false)
const selectedPlugin = ref<any>(null)
const pluginConfig = ref<any>(null)
const savingConfig = ref(false)
const newSize = ref('')
const newColor = ref('')

const activePluginsList = computed(() => plugins.value.filter((p: any) => p.isInstalled))
const availablePluginsList = computed(() => plugins.value.filter((p: any) => !p.isInstalled))

// Loyalty tab
const loyaltySettings = ref<any>({
  isEnabled: false,
  pointsPer100: 1,
  pointsToRedeem: 100,
  redeemValue: 50,
  silverThreshold: 501,
  goldThreshold: 2001,
})
const savingLoyalty = ref(false)

// Notifications tab
const emailPreferences = ref<any>({
  receiptEmails: true,
  customerWelcomeEmails: true,
  staffWelcomeEmail: true,
  lowStockAlerts: true,
})
const savingNotifications = ref(false)
const welcomeEmailSent = ref(false)

// Audit Log tab
const auditSummary = ref<any>(null)
const auditLogs = ref<any[]>([])
const loadingAudit = ref(false)
const auditCurrentPage = ref(1)
const auditTotalRecords = ref(0)
const auditTotalPages = ref(0)
const auditPageSize = 20

// Audit filters
const auditActionFilter = ref('')
const auditUserFilter = ref('')
const auditFromDate = ref('')
const auditToDate = ref('')
const staffList = ref<any[]>([])
const auditTabOpened = ref(false)

const actionOptions = [
  { label: 'All Actions', value: '' },
  { label: '── Financial ──', value: '', disabled: true },
  { label: 'Return Initiated', value: 'RETURN_INITIATED' },
  { label: 'Return Approved', value: 'RETURN_APPROVED' },
  { label: '── Staff ──', value: '', disabled: true },
  { label: 'Staff Created', value: 'STAFF_CREATED' },
  { label: 'Staff Updated', value: 'STAFF_UPDATED' },
  { label: 'Staff Deactivated', value: 'STAFF_DEACTIVATED' },
  { label: '── Products ──', value: '', disabled: true },
  { label: 'Product Created', value: 'PRODUCT_CREATED' },
  { label: 'Product Updated', value: 'PRODUCT_UPDATED' },
  { label: 'Product Deleted', value: 'PRODUCT_DELETED' },
  { label: 'Inventory Adjusted', value: 'INVENTORY_ADJUSTED' },
  { label: '── System ──', value: '', disabled: true },
  { label: 'Settings Updated', value: 'SETTINGS_UPDATED' },
  { label: 'Plugin Installed', value: 'PLUGIN_INSTALLED' },
  { label: 'Plugin Uninstalled', value: 'PLUGIN_UNINSTALLED' },
  { label: 'Category Created', value: 'CATEGORY_CREATED' },
  { label: 'Category Deleted', value: 'CATEGORY_DELETED' },
  { label: '── Auth ──', value: '', disabled: true },
  { label: 'Login', value: 'LOGIN_SUCCESS' },
]

// ── Options ───────────────────────────────────────
const currencyOptions = [
  { label: 'USD — US Dollar', value: 'USD' },
  { label: 'LKR — Sri Lankan Rupee', value: 'LKR' },
  { label: 'EUR — Euro', value: 'EUR' },
  { label: 'GBP — British Pound', value: 'GBP' },
  { label: 'AUD — Australian Dollar', value: 'AUD' },
  { label: 'INR — Indian Rupee', value: 'INR' },
  { label: 'SGD — Singapore Dollar', value: 'SGD' },
  { label: 'AED — UAE Dirham', value: 'AED' },
]

const timezoneOptions = [
  { label: 'Asia/Colombo (Sri Lanka)', value: 'Asia/Colombo' },
  { label: 'Asia/Kolkata (India)', value: 'Asia/Kolkata' },
  { label: 'UTC', value: 'UTC' },
  { label: 'America/New_York (EST)', value: 'America/New_York' },
  { label: 'Europe/London (GMT)', value: 'Europe/London' },
  { label: 'Asia/Dubai (UAE)', value: 'Asia/Dubai' },
  { label: 'Asia/Singapore', value: 'Asia/Singapore' },
]

// ── Computed helpers ──────────────────────────────
function getMemberSince(dateStr: string): string {
  if (!dateStr) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: authStore.shop?.timezone || 'UTC',
  }).format(new Date(dateStr))
}

// ── Methods ───────────────────────────────────────
async function loadSettings() {
  loading.value = true
  try {
    const response = await shopService.getSettings()
    if (response.success) {
      const data = response.data
      originalData.value = data
      shopName.value = data.name
      currency.value = data.currency
      timezone.value = data.timezone
      slug.value = data.slug
      createdAt.value = data.createdAt
      primaryColor.value = data.configuration?.primaryColor || '#3b82f6'
      originalColor.value = data.configuration?.primaryColor || '#3b82f6'
      logoUrl.value = data.configuration?.logoUrl || ''
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load settings',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

function onSaveGeneral() {
  const currencyChanged = currency.value !== originalData.value?.currency
  if (currencyChanged) {
    showCurrencyWarning.value = true
  } else {
    saveGeneral()
  }
}

async function saveGeneral() {
  showCurrencyWarning.value = false
  savingGeneral.value = true
  try {
    const response = await shopService.updateSettings({
      name: shopName.value,
      currency: currency.value,
      timezone: timezone.value,
    })
    if (response.success) {
      if (authStore.shop) {
        authStore.shop.name = response.data.name
        authStore.shop.currency = response.data.currency
        authStore.shop.timezone = response.data.timezone
      }
      originalData.value = { ...originalData.value, ...response.data }
      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Settings updated successfully',
        life: 3000,
      })
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to save settings',
      life: 3000,
    })
  } finally {
    savingGeneral.value = false
  }
}

function onColorChange() {
  document.documentElement.style.setProperty('--ps-primary', primaryColor.value)
}

async function saveBranding() {
  savingBranding.value = true
  try {
    const response = await shopService.updateSettings({
      configuration: {
        primaryColor: primaryColor.value,
        logoUrl: logoUrl.value || null,
      },
    })
    if (response.success) {
      originalColor.value = primaryColor.value
      if (authStore.shop) {
        authStore.shop.configuration = response.data.configuration
      }
      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Branding updated successfully',
        life: 3000,
      })
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to save branding',
      life: 3000,
    })
  } finally {
    savingBranding.value = false
  }
}

async function loadCategories() {
  loadingCategories.value = true
  try {
    const response = await categoryService.getCategories()
    if (response.success) categories.value = response.data
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load categories',
      life: 3000,
    })
  } finally {
    loadingCategories.value = false
  }
}

async function addCategory() {
  if (!newCategoryName.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Required',
      detail: 'Category name is required',
      life: 3000,
    })
    return
  }
  savingCategory.value = true
  try {
    const response = await categoryService.createCategory({
      name: newCategoryName.value.trim(),
      sortOrder: categories.value.length + 1,
    })
    if (response.success) {
      categories.value.push(response.data)
      newCategoryName.value = ''
      showAddCategoryDialog.value = false
      toast.add({
        severity: 'success',
        summary: 'Added',
        detail: 'Category added successfully',
        life: 3000,
      })
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to add category',
      life: 3000,
    })
  } finally {
    savingCategory.value = false
  }
}

function openEditCategory(category: Category) {
  editingCategory.value = category
  editCategoryName.value = category.name
  showEditCategoryDialog.value = true
}

async function saveEditCategory() {
  if (!editingCategory.value) return
  savingCategory.value = true
  try {
    const response = await categoryService.updateCategory(editingCategory.value.categoryId, {
      name: editCategoryName.value.trim(),
    })
    if (response.success) {
      const index = categories.value.findIndex(
        (c) => c.categoryId === editingCategory.value!.categoryId,
      )
      if (index !== -1) categories.value[index] = response.data
      showEditCategoryDialog.value = false
      toast.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Category updated successfully',
        life: 3000,
      })
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to update category',
      life: 3000,
    })
  } finally {
    savingCategory.value = false
  }
}

function confirmDeleteCategory(category: Category) {
  confirm.require({
    message: `Are you sure you want to delete "${category.name}"?`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary' },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: async () => {
      try {
        await categoryService.deleteCategory(category.categoryId)
        categories.value = categories.value.filter((c) => c.categoryId !== category.categoryId)
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Category deleted',
          life: 3000,
        })
      } catch (error: any) {
        const message = error.response?.data?.message || ''
        if (message.includes('Cannot delete')) {
          categoryErrorMessage.value = message
          showCategoryErrorDialog.value = true
        } else {
          toast.add({
            severity: 'error',
            summary: 'Error',
            detail: message || 'Failed to delete category',
            life: 3000,
          })
        }
      }
    },
  })
}

async function loadPlugins() {
  loadingPlugins.value = true
  try {
    const response = await pluginService.getPlugins()
    if (response.success) plugins.value = response.data
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load plugins', life: 3000 })
  } finally {
    loadingPlugins.value = false
  }
}

function confirmInstall(plugin: any) {
  selectedPlugin.value = plugin
  showInstallDialog.value = true
}

async function installPlugin() {
  if (!selectedPlugin.value) return
  installingPlugin.value = selectedPlugin.value.id
  showInstallDialog.value = false
  try {
    const response = await pluginService.installPlugin(selectedPlugin.value.id)
    if (response.success) {
      toast.add({
        severity: 'success',
        summary: 'Installed',
        detail: `${selectedPlugin.value.name} installed successfully!`,
        life: 3000,
      })
      const shopResponse = await shopService.getSettings()
      if (shopResponse.success && authStore.shop) {
        authStore.shop.activePlugins = shopResponse.data.activePlugins
      }
      await loadPlugins()
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to install plugin',
      life: 3000,
    })
  } finally {
    installingPlugin.value = null
  }
}

function confirmUninstall(plugin: any) {
  selectedPlugin.value = plugin
  showUninstallDialog.value = true
}

async function uninstallPlugin() {
  if (!selectedPlugin.value) return
  uninstallingPlugin.value = selectedPlugin.value.id
  showUninstallDialog.value = false
  try {
    const response = await pluginService.uninstallPlugin(selectedPlugin.value.id)
    if (response.success) {
      toast.add({
        severity: 'success',
        summary: 'Uninstalled',
        detail: 'Plugin uninstalled',
        life: 3000,
      })
      const shopResponse = await shopService.getSettings()
      if (shopResponse.success && authStore.shop) {
        authStore.shop.activePlugins = shopResponse.data.activePlugins
      }
      await loadPlugins()
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to uninstall plugin',
      life: 3000,
    })
  } finally {
    uninstallingPlugin.value = null
  }
}

async function openConfigure(plugin: any) {
  selectedPlugin.value = plugin
  showConfigureDialog.value = true
  try {
    const response = await pluginService.getPluginConfig(plugin.id)
    if (response.success) {
      pluginConfig.value = {
        sizes: [...(response.data.configuration?.sizes || [])],
        colors: [...(response.data.configuration?.colors || [])],
      }
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load config', life: 3000 })
  }
}

function addSize() {
  const s = newSize.value.trim().toUpperCase()
  if (!s || pluginConfig.value.sizes.includes(s)) return
  pluginConfig.value.sizes.push(s)
  newSize.value = ''
}

function removeSize(size: string) {
  pluginConfig.value.sizes = pluginConfig.value.sizes.filter((s: string) => s !== size)
}

function addColor() {
  const c = newColor.value.trim()
  if (!c || pluginConfig.value.colors.includes(c)) return
  pluginConfig.value.colors.push(c)
  newColor.value = ''
}

function removeColor(color: string) {
  pluginConfig.value.colors = pluginConfig.value.colors.filter((c: string) => c !== color)
}

async function saveConfig() {
  if (!selectedPlugin.value || !pluginConfig.value) return
  savingConfig.value = true
  try {
    const response = await pluginService.updatePluginConfig(
      selectedPlugin.value.id,
      pluginConfig.value,
    )
    if (response.success) {
      showConfigureDialog.value = false
      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Plugin configuration updated',
        life: 3000,
      })
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to save config',
      life: 3000,
    })
  } finally {
    savingConfig.value = false
  }
}

// ── Loyalty Methods ───────────────────────────────
async function loadLoyaltySettings() {
  try {
    const response = await loyaltyService.getLoyaltySettings()
    if (response.success) loyaltySettings.value = { ...response.data }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load loyalty settings',
      life: 3000,
    })
  }
}

async function saveLoyaltySettings() {
  savingLoyalty.value = true
  try {
    const response = await loyaltyService.updateLoyaltySettings(loyaltySettings.value)
    if (response.success) {
      authStore.loyaltySettings = { ...loyaltySettings.value }
      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Loyalty settings updated',
        life: 3000,
      })
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to save',
      life: 3000,
    })
  } finally {
    savingLoyalty.value = false
  }
}

async function loadEmailPreferences() {
  try {
    const response = await shopService.getEmailPreferences()
    if (response.success) {
      emailPreferences.value = {
        receiptEmails: response.data.receiptEmails,
        customerWelcomeEmails: response.data.customerWelcomeEmails,
        staffWelcomeEmail: response.data.staffWelcomeEmail,
        lowStockAlerts: response.data.lowStockAlerts,
      }
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load email preferences',
      life: 3000,
    })
  }
  // welcomeEmailSent comes from the shop object, not preferences
  welcomeEmailSent.value = authStore.shop?.welcomeEmailSent ?? false
}

async function saveEmailPreferences() {
  savingNotifications.value = true
  try {
    const response = await shopService.updateEmailPreferences(emailPreferences.value)
    if (response.success) {
      toast.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Email preferences updated',
        life: 3000,
      })
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to save',
      life: 3000,
    })
  } finally {
    savingNotifications.value = false
  }
}

// ── Audit Methods ─────────────────────────────────
function getDefaultDateRange() {
  const tz = authStore.shop?.timezone || 'UTC'
  const today = new Date().toLocaleDateString('en-CA', { timeZone: tz })
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString(
    'en-CA',
    { timeZone: tz },
  )
  return { from: thirtyDaysAgo, to: today }
}

function formatAuditTime(dateStr: string): string {
  const date = new Date(dateStr)
  const tz = authStore.shop?.timezone || 'UTC'
  const today = new Date().toLocaleDateString('en-CA', { timeZone: tz })
  const logDate = date.toLocaleDateString('en-CA', { timeZone: tz })

  if (logDate === today) {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz,
    }).format(date)
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  }).format(date)
}

function getActionColor(action: string): string {
  const destructive = [
    'STAFF_DEACTIVATED',
    'PRODUCT_DELETED',
    'PLUGIN_UNINSTALLED',
    'CATEGORY_DELETED',
  ]
  const creation = ['STAFF_CREATED', 'PRODUCT_CREATED', 'PLUGIN_INSTALLED', 'CATEGORY_CREATED']
  const financial = ['RETURN_INITIATED', 'RETURN_APPROVED']
  const changes = ['SETTINGS_UPDATED', 'PRODUCT_UPDATED', 'INVENTORY_ADJUSTED', 'STAFF_UPDATED']

  if (destructive.includes(action)) return 'red'
  if (creation.includes(action)) return 'green'
  if (financial.includes(action)) return 'blue'
  if (changes.includes(action)) return 'yellow'
  return 'grey'
}

function getActionDescription(log: any): string {
  const d = log.details || {}
  switch (log.action) {
    case 'STAFF_CREATED':
      return `Added ${d.role || 'staff'}: ${d.firstName || ''} ${d.lastName || ''}`.trim()
    case 'STAFF_UPDATED':
      return 'Updated staff member details'
    case 'STAFF_DEACTIVATED':
      return `Deactivated: ${d.deactivatedUser || 'staff member'}`
    case 'RETURN_INITIATED':
      return `Return initiated — ${d.itemCount || ''} item(s)`
    case 'RETURN_APPROVED':
      return `Return approved — ${authStore.formatCurrency(d.totalRefund || 0)}`
    case 'SETTINGS_UPDATED':
      return 'Shop settings updated'
    case 'PRODUCT_CREATED':
      return `Created product: ${d.name || ''} (${d.sku || ''})`
    case 'PRODUCT_UPDATED':
      return 'Updated product details'
    case 'PRODUCT_DELETED':
      return `Deleted product: ${d.name || ''}`
    case 'INVENTORY_ADJUSTED':
      return 'Stock adjusted for product'
    case 'PLUGIN_INSTALLED':
      return `Installed plugin: ${log.entityId || ''}`
    case 'PLUGIN_UNINSTALLED':
      return `Uninstalled plugin: ${log.entityId || ''}`
    case 'LOGIN_SUCCESS':
      return 'Logged in successfully'
    case 'CATEGORY_CREATED':
      return `Created category: ${d.name || ''}`
    case 'CATEGORY_DELETED':
      return `Deleted category: ${d.name || ''}`
    default:
      return log.action.replace(/_/g, ' ').toLowerCase()
  }
}

function getUserDisplay(log: any): string {
  if (!log.user) return 'System'
  const roleMap: Record<string, string> = {
    shop_owner: 'Owner',
    shop_manager: 'Manager',
    cashier: 'Cashier',
  }
  return `${log.user.firstName} (${roleMap[log.user.role] || log.user.role})`
}

async function loadAuditSummary() {
  try {
    const response = await auditLogService.getSummary()
    if (response.success) auditSummary.value = response.data
  } catch {
    // silent fail
  }
}

async function loadAuditLogs(page = 1) {
  loadingAudit.value = true
  try {
    const params: any = {
      page,
      limit: auditPageSize,
      fromDate: auditFromDate.value,
      toDate: auditToDate.value,
    }
    if (auditActionFilter.value) params.action = auditActionFilter.value
    if (auditUserFilter.value) params.userId = auditUserFilter.value

    const response = await auditLogService.getLogs(params)
    if (response.success) {
      auditLogs.value = response.data
      auditCurrentPage.value = response.pagination?.page ?? 1
      auditTotalRecords.value = response.pagination?.total ?? 0
      auditTotalPages.value = response.pagination?.totalPages ?? 1
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load audit logs',
      life: 3000,
    })
  } finally {
    loadingAudit.value = false
  }
}

async function loadStaffList() {
  try {
    const response = await staffService.getStaff()
    if (response.success) staffList.value = response.data
  } catch {
    staffList.value = []
  }
}

function applyAuditFilters() {
  auditCurrentPage.value = 1
  loadAuditLogs(1)
}

function clearAuditFilters() {
  auditActionFilter.value = ''
  auditUserFilter.value = ''
  const { from, to } = getDefaultDateRange()
  auditFromDate.value = from
  auditToDate.value = to
  loadAuditLogs(1)
}

async function onAuditTabOpen() {
  if (auditTabOpened.value) return
  auditTabOpened.value = true
  const { from, to } = getDefaultDateRange()
  auditFromDate.value = from
  auditToDate.value = to
  await Promise.all([loadAuditSummary(), loadAuditLogs(1), loadStaffList()])
}

onBeforeUnmount(() => {
  document.documentElement.style.setProperty('--ps-primary', originalColor.value)
})

onMounted(() => {
  loadSettings()
  loadCategories()
  loadPlugins()
  loadLoyaltySettings()
  loadEmailPreferences()
})
</script>

<template>
  <div class="settings-page">
    <Toast />
    <ConfirmDialog />

    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Manage your shop configuration</p>
      </div>
    </div>

    <!-- Loading -->
    <div class="loading-state" v-if="loading">
      <i class="pi pi-spin pi-spinner" />
      <p>Loading settings...</p>
    </div>

    <template v-else>
      <Tabs value="0">
        <TabList>
          <Tab value="0">General</Tab>
          <Tab value="1">Branding</Tab>
          <Tab value="2">Categories</Tab>
          <Tab value="3">Plugins</Tab>
          <Tab value="4">Loyalty</Tab>
          <Tab value="5">Notifications</Tab>
          <Tab value="6">Audit Log</Tab>
        </TabList>

        <TabPanels>
          <!-- ── Tab 1: General ── -->
          <TabPanel value="0">
            <div class="tab-content">
              <div class="settings-card">
                <h3 class="card-title">Shop Information</h3>

                <div class="field">
                  <label>Shop Name</label>
                  <InputText v-model="shopName" placeholder="Shop name" class="w-full" />
                </div>

                <div class="form-row">
                  <div class="field">
                    <label>Currency</label>
                    <Select
                      v-model="currency"
                      :options="currencyOptions"
                      optionLabel="label"
                      optionValue="value"
                      class="w-full"
                    />
                  </div>
                  <div class="field">
                    <label>Timezone</label>
                    <Select
                      v-model="timezone"
                      :options="timezoneOptions"
                      optionLabel="label"
                      optionValue="value"
                      class="w-full"
                    />
                  </div>
                </div>

                <div class="card-footer">
                  <Button
                    label="Save Changes"
                    icon="pi pi-check"
                    :loading="savingGeneral"
                    @click="onSaveGeneral"
                  />
                </div>
              </div>

              <div class="settings-card">
                <h3 class="card-title">Shop Details</h3>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Shop URL</span>
                    <span class="info-value slug-value">{{ slug }}</span>
                    <span class="info-note">Never changes</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Plan</span>
                    <span class="info-value">MVP</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Member Since</span>
                    <span class="info-value">{{ getMemberSince(createdAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- ── Tab 2: Branding ── -->
          <TabPanel value="1">
            <div class="tab-content">
              <div class="settings-card">
                <h3 class="card-title">Brand Color</h3>
                <p class="card-desc">
                  Choose your primary brand color. This will be applied across the app.
                </p>

                <div class="field">
                  <label>Primary Color</label>
                  <div class="color-input-wrapper">
                    <input
                      type="color"
                      v-model="primaryColor"
                      class="color-picker"
                      @input="onColorChange"
                    />
                    <InputText
                      v-model="primaryColor"
                      class="color-hex-input"
                      @input="onColorChange"
                    />
                  </div>
                </div>

                <div class="preview-section">
                  <label class="preview-label">Live Preview</label>
                  <div class="preview-topbar">
                    <div class="preview-brand">
                      <i class="pi pi-shopping-cart" :style="{ color: primaryColor }" />
                      <span>{{ shopName || 'Your Shop' }}</span>
                    </div>
                    <span class="preview-logout">Logout</span>
                  </div>
                  <div class="preview-sidebar">
                    <div class="preview-nav-item active" :style="{ background: primaryColor }">
                      <i class="pi pi-home" /><span>Dashboard</span>
                    </div>
                    <div class="preview-nav-item">
                      <i class="pi pi-shopping-cart" /><span>POS</span>
                    </div>
                    <div class="preview-nav-item"><i class="pi pi-box" /><span>Products</span></div>
                  </div>
                  <p class="preview-note">Preview updates in real time</p>
                </div>

                <div class="card-footer">
                  <Button
                    label="Save Branding"
                    icon="pi pi-palette"
                    severity="secondary"
                    :loading="savingBranding"
                    @click="saveBranding"
                  />
                </div>
              </div>

              <div class="settings-card">
                <h3 class="card-title">Logo</h3>
                <p class="card-desc">
                  Enter a URL to your shop logo. File upload will be available in a future update.
                </p>

                <div class="logo-preview" v-if="logoUrl">
                  <img :src="logoUrl" alt="Shop logo" class="logo-img" />
                </div>
                <div class="logo-placeholder" v-else>
                  <i class="pi pi-image" />
                  <span>No logo set</span>
                </div>

                <div class="field">
                  <label>Logo URL</label>
                  <InputText
                    v-model="logoUrl"
                    placeholder="https://example.com/logo.png"
                    class="w-full"
                  />
                  <span class="field-hint">Supported formats: PNG, JPG</span>
                </div>

                <div class="card-footer">
                  <Button
                    label="Save Branding"
                    icon="pi pi-palette"
                    severity="secondary"
                    :loading="savingBranding"
                    @click="saveBranding"
                  />
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- ── Tab 3: Categories ── -->
          <TabPanel value="2">
            <div class="tab-content">
              <div class="settings-card">
                <div class="categories-header">
                  <div>
                    <h3 class="card-title" style="border: none; padding: 0">Product Categories</h3>
                    <p class="card-desc">Manage your product categories</p>
                  </div>
                  <Button
                    label="Add Category"
                    icon="pi pi-plus"
                    size="small"
                    @click="showAddCategoryDialog = true"
                  />
                </div>

                <div class="loading-state" v-if="loadingCategories">
                  <i class="pi pi-spin pi-spinner" />
                </div>

                <div class="empty-categories" v-else-if="categories.length === 0">
                  <i class="pi pi-tag" />
                  <p>No categories yet. Add your first category.</p>
                </div>

                <div class="categories-list" v-else>
                  <div
                    v-for="category in categories"
                    :key="category.categoryId"
                    class="category-item"
                  >
                    <i class="pi pi-bars drag-handle" />
                    <span class="category-name">{{ category.name }}</span>
                    <div class="category-actions">
                      <Button
                        icon="pi pi-pencil"
                        size="small"
                        severity="secondary"
                        text
                        @click="openEditCategory(category)"
                      />
                      <Button
                        icon="pi pi-trash"
                        size="small"
                        severity="danger"
                        text
                        @click="confirmDeleteCategory(category)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- ── Tab 4: Plugins ── -->
          <TabPanel value="3">
            <div class="tab-content">
              <div class="loading-state" v-if="loadingPlugins">
                <i class="pi pi-spin pi-spinner" />
                <p>Loading plugins...</p>
              </div>

              <template v-else>
                <!-- Active Plugins Section -->
                <div class="plugin-section">
                  <h3 class="plugin-section-title">Active Plugins</h3>
                  <p class="plugin-section-desc">Currently installed and running</p>

                  <div class="plugin-list" v-if="activePluginsList.length > 0">
                    <div v-for="plugin in activePluginsList" :key="plugin.id" class="plugin-card">
                      <div class="plugin-header">
                        <div class="plugin-icon">{{ plugin.icon }}</div>
                        <div class="plugin-info">
                          <span class="plugin-name">{{ plugin.name }}</span>
                          <span class="plugin-version">v{{ plugin.version }}</span>
                        </div>
                        <div class="plugin-status">
                          <span class="status-badge installed">
                            <i class="pi pi-check-circle" /> Active
                          </span>
                        </div>
                      </div>

                      <p class="plugin-desc">{{ plugin.description }}</p>

                      <div class="plugin-features">
                        <div
                          v-for="feature in plugin.features"
                          :key="feature"
                          class="plugin-feature"
                        >
                          <i class="pi pi-check" />
                          <span>{{ feature }}</span>
                        </div>
                      </div>

                      <div class="plugin-actions">
                        <Button
                          label="Configure"
                          icon="pi pi-cog"
                          severity="secondary"
                          size="small"
                          @click="openConfigure(plugin)"
                        />
                        <Button
                          label="Uninstall"
                          icon="pi pi-trash"
                          severity="danger"
                          size="small"
                          :loading="uninstallingPlugin === plugin.id"
                          @click="confirmUninstall(plugin)"
                        />
                      </div>
                    </div>
                  </div>

                  <div v-else class="empty-plugins">
                    <i class="pi pi-puzzle" />
                    <p>No active plugins yet</p>
                  </div>
                </div>

                <!-- Available Plugins Section -->
                <div class="plugin-section">
                  <h3 class="plugin-section-title">Available Plugins</h3>
                  <p class="plugin-section-desc">Compatible with your shop type</p>

                  <div class="plugin-list" v-if="availablePluginsList.length > 0">
                    <div
                      v-for="plugin in availablePluginsList"
                      :key="plugin.id"
                      class="plugin-card"
                    >
                      <div class="plugin-header">
                        <div class="plugin-icon">{{ plugin.icon }}</div>
                        <div class="plugin-info">
                          <span class="plugin-name">{{ plugin.name }}</span>
                          <span class="plugin-version">v{{ plugin.version }}</span>
                        </div>
                      </div>

                      <p class="plugin-desc">{{ plugin.description }}</p>

                      <div class="plugin-features">
                        <div
                          v-for="feature in plugin.features"
                          :key="feature"
                          class="plugin-feature"
                        >
                          <i class="pi pi-check" />
                          <span>{{ feature }}</span>
                        </div>
                      </div>

                      <div class="plugin-actions">
                        <Button
                          label="Install"
                          icon="pi pi-download"
                          size="small"
                          :loading="installingPlugin === plugin.id"
                          @click="confirmInstall(plugin)"
                        />
                      </div>
                    </div>
                  </div>

                  <div v-else class="empty-plugins">
                    <i class="pi pi-check-circle" />
                    <p>All compatible plugins are already active</p>
                  </div>
                </div>
              </template>
            </div>
          </TabPanel>

          <!-- ── Tab 5: Loyalty ── -->
          <TabPanel value="4">
            <div class="tab-content">
              <div class="settings-card">
                <h3 class="card-title">Loyalty Program</h3>

                <div class="loyalty-toggle-row">
                  <div>
                    <span class="loyalty-toggle-label">Enable Loyalty Program</span>
                    <span class="loyalty-toggle-desc"
                      >Customers earn and redeem points on purchases</span
                    >
                  </div>
                  <button
                    class="toggle-btn"
                    :class="{ active: loyaltySettings.isEnabled }"
                    @click="loyaltySettings.isEnabled = !loyaltySettings.isEnabled"
                  >
                    <span class="toggle-knob" />
                  </button>
                </div>

                <template v-if="loyaltySettings.isEnabled">
                  <div class="loyalty-section-title">Earning Rules</div>
                  <div class="field">
                    <label>Points per {{ authStore.shop?.currency || 'LKR' }} 100 spent</label>
                    <InputNumber
                      v-model="loyaltySettings.pointsPer100"
                      :min="1"
                      :max="100"
                      class="w-full"
                    />
                  </div>

                  <div class="loyalty-section-title">Redemption Rules</div>
                  <div class="form-row">
                    <div class="field">
                      <label>Points needed to redeem</label>
                      <InputNumber
                        v-model="loyaltySettings.pointsToRedeem"
                        :min="1"
                        class="w-full"
                      />
                    </div>
                    <div class="field">
                      <label>Value per redemption ({{ authStore.shop?.currency || 'LKR' }})</label>
                      <InputNumber v-model="loyaltySettings.redeemValue" :min="1" class="w-full" />
                    </div>
                  </div>

                  <div class="loyalty-section-title">Tier Thresholds</div>
                  <div class="form-row">
                    <div class="field">
                      <label>🥈 Silver from (total points earned)</label>
                      <InputNumber
                        v-model="loyaltySettings.silverThreshold"
                        :min="1"
                        class="w-full"
                      />
                    </div>
                    <div class="field">
                      <label>🥇 Gold from (total points earned)</label>
                      <InputNumber
                        v-model="loyaltySettings.goldThreshold"
                        :min="1"
                        class="w-full"
                      />
                    </div>
                  </div>

                  <!-- Live Preview -->
                  <div class="loyalty-preview">
                    <div class="loyalty-preview-title">Live Preview</div>
                    <div class="loyalty-preview-row">
                      <span>Customer spends {{ authStore.formatCurrency(5000) }}</span>
                      <span class="preview-result">
                        → Earns
                        <strong>{{
                          Math.floor((5000 / 100) * (loyaltySettings.pointsPer100 || 0))
                        }}</strong>
                        points
                      </span>
                    </div>
                    <div class="loyalty-preview-row">
                      <span>Customer redeems {{ loyaltySettings.pointsToRedeem }} points</span>
                      <span class="preview-result">
                        → Gets
                        <strong>{{
                          authStore.formatCurrency(loyaltySettings.redeemValue || 0)
                        }}</strong>
                        discount
                      </span>
                    </div>
                  </div>
                </template>

                <div class="card-footer">
                  <Button
                    label="Save Loyalty Settings"
                    icon="pi pi-check"
                    :loading="savingLoyalty"
                    @click="saveLoyaltySettings"
                  />
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- ── Tab 6: Email Notifications ── -->

          <TabPanel value="5">
            <div class="tab-content">
              <p class="card-desc" style="padding: 0 0.25rem">
                Manage automated email notifications sent by ProSystem.
              </p>

              <!-- Customer Emails -->
              <div class="settings-card">
                <h3 class="card-title">Customer Emails</h3>

                <div class="notif-row">
                  <div>
                    <span class="notif-icon">📧</span>
                    <span class="notif-label">Receipt Emails</span>
                    <span class="notif-desc"
                      >Send receipt to customer after purchase (only if customer has email on
                      file)</span
                    >
                  </div>
                  <button
                    class="toggle-btn"
                    :class="{ active: emailPreferences.receiptEmails }"
                    @click="emailPreferences.receiptEmails = !emailPreferences.receiptEmails"
                  >
                    <span class="toggle-knob" />
                  </button>
                </div>

                <div class="notif-row">
                  <div>
                    <span class="notif-icon">👋</span>
                    <span class="notif-label">Customer Welcome Emails</span>
                    <span class="notif-desc">Welcome new customers when they're added</span>
                  </div>
                  <button
                    class="toggle-btn"
                    :class="{ active: emailPreferences.customerWelcomeEmails }"
                    @click="
                      emailPreferences.customerWelcomeEmails =
                        !emailPreferences.customerWelcomeEmails
                    "
                  >
                    <span class="toggle-knob" />
                  </button>
                </div>
              </div>

              <!-- Team Emails -->
              <div class="settings-card">
                <h3 class="card-title">Team Emails</h3>

                <div class="notif-row">
                  <div>
                    <span class="notif-icon">👨‍💼</span>
                    <span class="notif-label">Staff Welcome Emails</span>
                    <span class="notif-desc">Notify new staff members when added</span>
                  </div>
                  <button
                    class="toggle-btn"
                    :class="{ active: emailPreferences.staffWelcomeEmail }"
                    @click="
                      emailPreferences.staffWelcomeEmail = !emailPreferences.staffWelcomeEmail
                    "
                  >
                    <span class="toggle-knob" />
                  </button>
                </div>

                <div class="notif-row">
                  <div>
                    <span class="notif-icon">🎉</span>
                    <span class="notif-label">Shop Welcome Email</span>
                    <span class="notif-desc">Sent once after onboarding completes</span>
                  </div>
                  <span
                    class="status-pill"
                    :class="welcomeEmailSent ? 'status-sent' : 'status-pending'"
                  >
                    {{ welcomeEmailSent ? '✅ Sent' : 'Pending' }}
                  </span>
                </div>
              </div>

              <!-- Operational Alerts -->
              <div class="settings-card">
                <h3 class="card-title">Operational Alerts</h3>

                <div class="notif-row">
                  <div>
                    <span class="notif-icon">⚠️</span>
                    <span class="notif-label">Low Stock Alerts</span>
                    <span class="notif-desc"
                      >Sent to shop owner and managers daily when products run low</span
                    >
                  </div>
                  <button
                    class="toggle-btn"
                    :class="{ active: emailPreferences.lowStockAlerts }"
                    @click="emailPreferences.lowStockAlerts = !emailPreferences.lowStockAlerts"
                  >
                    <span class="toggle-knob" />
                  </button>
                </div>

                <div class="card-footer">
                  <Button
                    label="Save Preferences"
                    icon="pi pi-check"
                    :loading="savingNotifications"
                    @click="saveEmailPreferences"
                  />
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- ── Tab 7: Audit Log ── -->
          <TabPanel value="6">
            <div class="tab-content" @vue:mounted="onAuditTabOpen">
              <!-- Summary Cards -->
              <div class="audit-summary-grid">
                <div class="audit-summary-card">
                  <span class="audit-summary-value">{{ auditSummary?.totalActions ?? '—' }}</span>
                  <span class="audit-summary-label">Total Actions</span>
                </div>
                <div class="audit-summary-card">
                  <span class="audit-summary-value">{{ auditSummary?.todayActions ?? '—' }}</span>
                  <span class="audit-summary-label">Today's Actions</span>
                </div>
                <div class="audit-summary-card">
                  <span class="audit-summary-value">{{
                    auditSummary?.mostActiveUser?.name ?? '—'
                  }}</span>
                  <span class="audit-summary-label">Most Active User</span>
                </div>
              </div>

              <!-- Filters -->
              <div class="audit-filters">
                <Select
                  v-model="auditActionFilter"
                  :options="actionOptions"
                  optionLabel="label"
                  optionValue="value"
                  optionDisabled="disabled"
                  placeholder="All Actions"
                  showClear
                  class="audit-filter-select"
                />
                <Select
                  v-model="auditUserFilter"
                  :options="staffList"
                  :optionLabel="(s) => `${s.firstName} ${s.lastName}`"
                  optionValue="userId"
                  placeholder="All Users"
                  showClear
                  class="audit-filter-select"
                />
                <input type="date" v-model="auditFromDate" class="audit-date-input" />
                <span class="date-sep">to</span>
                <input type="date" v-model="auditToDate" class="audit-date-input" />
                <Button label="Apply" icon="pi pi-check" size="small" @click="applyAuditFilters" />
                <Button
                  label="Clear"
                  icon="pi pi-times"
                  size="small"
                  severity="secondary"
                  @click="clearAuditFilters"
                />
              </div>

              <!-- Loading -->
              <div class="loading-state" v-if="loadingAudit">
                <i class="pi pi-spin pi-spinner" />
                <p>Loading activity...</p>
              </div>

              <!-- Empty -->
              <div class="empty-audit" v-else-if="auditLogs.length === 0">
                <i class="pi pi-history" />
                <p>No activity recorded for this period</p>
              </div>

              <!-- Log List -->
              <div class="audit-log-list" v-else>
                <div v-for="log in auditLogs" :key="log.logId" class="audit-log-item">
                  <div class="audit-dot" :class="`audit-dot-${getActionColor(log.action)}`" />
                  <div class="audit-log-content">
                    <div class="audit-log-header">
                      <span class="audit-time">{{ formatAuditTime(log.createdAt) }}</span>
                      <span class="audit-user">{{ getUserDisplay(log) }}</span>
                      <span
                        class="audit-action-badge"
                        :class="`audit-badge-${getActionColor(log.action)}`"
                      >
                        {{ log.action.replace(/_/g, ' ') }}
                      </span>
                    </div>
                    <div class="audit-description">{{ getActionDescription(log) }}</div>
                  </div>
                </div>
              </div>

              <!-- Pagination -->
              <div class="audit-pagination" v-if="auditTotalRecords > 0 && !loadingAudit">
                <span class="audit-pagination-info">
                  Showing {{ (auditCurrentPage - 1) * auditPageSize + 1 }}–{{
                    Math.min(auditCurrentPage * auditPageSize, auditTotalRecords)
                  }}
                  of {{ auditTotalRecords }}
                </span>
                <div class="audit-pagination-buttons">
                  <Button
                    label="← Prev"
                    size="small"
                    severity="secondary"
                    :disabled="auditCurrentPage === 1"
                    @click="loadAuditLogs(auditCurrentPage - 1)"
                  />
                  <span class="audit-page-indicator"
                    >Page {{ auditCurrentPage }} / {{ auditTotalPages }}</span
                  >
                  <Button
                    label="Next →"
                    size="small"
                    severity="secondary"
                    :disabled="auditCurrentPage === auditTotalPages"
                    @click="loadAuditLogs(auditCurrentPage + 1)"
                  />
                </div>
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>

    <!-- Currency Warning Dialog -->
    <Dialog
      v-model:visible="showCurrencyWarning"
      header="Change Currency?"
      :style="{ width: '420px' }"
      modal
    >
      <div class="warning-dialog">
        <i class="pi pi-exclamation-triangle warning-icon" />
        <p>
          Changing currency will affect how prices display across the app. Existing transaction
          amounts will not change.
        </p>
        <p class="warning-note">Are you sure you want to continue?</p>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showCurrencyWarning = false" />
        <Button label="Yes, Change Currency" severity="warning" @click="saveGeneral" />
      </template>
    </Dialog>

    <!-- Add Category Dialog -->
    <Dialog
      v-model:visible="showAddCategoryDialog"
      header="Add Category"
      :style="{ width: '380px' }"
      modal
    >
      <div class="dialog-form">
        <div class="field">
          <label>Category Name *</label>
          <InputText
            v-model="newCategoryName"
            placeholder="e.g. Electronics"
            class="w-full"
            autofocus
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showAddCategoryDialog = false" />
        <Button label="Add" icon="pi pi-check" :loading="savingCategory" @click="addCategory" />
      </template>
    </Dialog>

    <!-- Edit Category Dialog -->
    <Dialog
      v-model:visible="showEditCategoryDialog"
      header="Edit Category"
      :style="{ width: '380px' }"
      modal
    >
      <div class="dialog-form">
        <div class="field">
          <label>Category Name *</label>
          <InputText v-model="editCategoryName" placeholder="Category name" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showEditCategoryDialog = false" />
        <Button
          label="Save"
          icon="pi pi-check"
          :loading="savingCategory"
          @click="saveEditCategory"
        />
      </template>
    </Dialog>

    <!-- Category Error Dialog -->
    <Dialog
      v-model:visible="showCategoryErrorDialog"
      header="Cannot Delete"
      :style="{ width: '380px' }"
      modal
    >
      <div class="warning-dialog">
        <i class="pi pi-exclamation-triangle warning-icon" />
        <p>{{ categoryErrorMessage }}</p>
        <p class="warning-note">Reassign those products first.</p>
      </div>
      <template #footer>
        <Button label="OK" @click="showCategoryErrorDialog = false" />
      </template>
    </Dialog>

    <!-- Install Confirmation -->
    <Dialog
      v-model:visible="showInstallDialog"
      header="Install Plugin?"
      :style="{ width: '420px' }"
      modal
    >
      <div class="warning-dialog">
        <span style="font-size: 2rem">{{ selectedPlugin?.icon }}</span>
        <p>
          Install <strong>{{ selectedPlugin?.name }}</strong
          >?
        </p>
        <p class="warning-note">This will add new features to your shop immediately.</p>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showInstallDialog = false" />
        <Button label="Install Plugin" icon="pi pi-download" @click="installPlugin" />
      </template>
    </Dialog>

    <!-- Uninstall Confirmation -->
    <Dialog
      v-model:visible="showUninstallDialog"
      header="Uninstall Plugin?"
      :style="{ width: '420px' }"
      modal
    >
      <div class="warning-dialog">
        <i class="pi pi-exclamation-triangle warning-icon" />
        <p>
          Uninstall <strong>{{ selectedPlugin?.name }}</strong
          >?
        </p>
        <p class="warning-note">
          Your variant data will be preserved but variants will no longer appear at checkout.
        </p>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showUninstallDialog = false" />
        <Button label="Uninstall" severity="danger" @click="uninstallPlugin" />
      </template>
    </Dialog>

    <!-- Configure Dialog -->
    <Dialog
      v-model:visible="showConfigureDialog"
      header="Configure Plugin"
      :style="{ width: '500px' }"
      modal
    >
      <div class="config-form" v-if="pluginConfig">
        <div class="config-section">
          <h4 class="config-label">Sizes</h4>
          <div class="tag-list">
            <span v-for="size in pluginConfig.sizes" :key="size" class="config-tag">
              {{ size }}
              <button class="tag-remove" @click="removeSize(size)">×</button>
            </span>
          </div>
          <div class="tag-add-row">
            <InputText
              v-model="newSize"
              placeholder="Add size (e.g. XXS)"
              class="tag-input"
              @keyup.enter="addSize"
            />
            <Button label="Add" size="small" severity="secondary" @click="addSize" />
          </div>
        </div>

        <div class="config-section">
          <h4 class="config-label">Colors</h4>
          <div class="tag-list">
            <span v-for="color in pluginConfig.colors" :key="color" class="config-tag">
              {{ color }}
              <button class="tag-remove" @click="removeColor(color)">×</button>
            </span>
          </div>
          <div class="tag-add-row">
            <InputText
              v-model="newColor"
              placeholder="Add color (e.g. Purple)"
              class="tag-input"
              @keyup.enter="addColor"
            />
            <Button label="Add" size="small" severity="secondary" @click="addColor" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showConfigureDialog = false" />
        <Button
          label="Save Configuration"
          icon="pi pi-check"
          :loading="savingConfig"
          @click="saveConfig"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.settings-page {
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

.loading-state {
  text-align: center;
  padding: 4rem;
  color: #475569;
}

.loading-state i {
  font-size: 2rem;
  margin-bottom: 1rem;
  display: block;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-top: 1.25rem;
}

.settings-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #334155;
}

.card-desc {
  font-size: 0.875rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid #334155;
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
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.info-item {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f1f5f9;
}

.slug-value {
  font-family: monospace;
  color: #3b82f6;
}

.info-note {
  font-size: 0.7rem;
  color: #475569;
  font-style: italic;
}

.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.color-picker {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  cursor: pointer;
  padding: 2px;
  background: #0f172a;
  border: 1px solid #334155;
}

.color-hex-input {
  width: 140px;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-topbar {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px 8px 0 0;
  padding: 0.6rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #f1f5f9;
}

.preview-logout {
  font-size: 0.75rem;
  color: #94a3b8;
}

.preview-sidebar {
  background: #1e293b;
  border: 1px solid #334155;
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 0.5rem;
  display: flex;
  gap: 0.25rem;
}

.preview-nav-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #94a3b8;
}

.preview-nav-item.active {
  color: white;
}
.preview-note {
  font-size: 0.75rem;
  color: #475569;
  font-style: italic;
  margin: 0;
}

.logo-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
}

.logo-img {
  max-height: 80px;
  max-width: 200px;
  object-fit: contain;
}

.logo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  background: #0f172a;
  border: 1px dashed #334155;
  border-radius: 8px;
  color: #475569;
  font-size: 0.875rem;
}

.logo-placeholder i {
  font-size: 2rem;
}

.warning-dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  text-align: center;
}

.warning-icon {
  font-size: 3rem;
  color: #f59e0b;
}

.warning-dialog p {
  color: #475569;
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.5;
}

.warning-note {
  font-weight: 600;
  color: #1e293b !important;
}

.w-full {
  width: 100% !important;
}

.categories-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #334155;
}

.empty-categories {
  text-align: center;
  padding: 2rem;
  color: #475569;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-categories i {
  font-size: 2rem;
}
.empty-categories p {
  font-size: 0.875rem;
  margin: 0;
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
}

.drag-handle {
  color: #475569;
  cursor: grab;
  font-size: 0.875rem;
}
.category-name {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: #f1f5f9;
}
.category-actions {
  display: flex;
  gap: 0.25rem;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem 0;
}

/* ── Plugins ── */
.plugin-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1.25rem;
}

.plugin-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.plugin-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.plugin-icon {
  font-size: 2rem;
  flex-shrink: 0;
}
.plugin-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.plugin-name {
  font-size: 1rem;
  font-weight: 600;
  color: #f1f5f9;
}
.plugin-version {
  font-size: 0.75rem;
  color: #64748b;
}

.plugin-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.plugin-section-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #465974;
  margin: 0;
  padding-top: 0.5rem;
  border-top: 1px solid #334155;
}

.plugin-section:first-child .plugin-section-title {
  border-top: none;
  padding-top: 0;
}

.plugin-section-desc {
  font-size: 0.8rem;
  color: #64748b;
  margin: -0.5rem 0 0;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
}

.status-badge.installed {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.plugin-desc {
  font-size: 0.875rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}
.plugin-features {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.plugin-feature {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #64748b;
}
.plugin-feature .pi {
  color: #22c55e;
  font-size: 0.75rem;
}
.plugin-actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #334155;
}

.empty-plugins {
  text-align: center;
  padding: 3rem;
  color: #475569;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.empty-plugins i {
  font-size: 3rem;
}

/* ── Config ── */
.config-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.5rem 0;
}
.config-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.config-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #cbd5e1;
  margin: 0;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.config-tag {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #334155;
  color: #f1f5f9;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
}

.tag-remove {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
}

.tag-remove:hover {
  color: #ef4444;
}
.tag-add-row {
  display: flex;
  gap: 0.5rem;
}
.tag-input {
  flex: 1;
}

/* ── Loyalty ── */
.loyalty-toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
}

.loyalty-toggle-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: #f1f5f9;
}
.loyalty-toggle-desc {
  display: block;
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 0.2rem;
}

.toggle-btn {
  width: 48px;
  height: 26px;
  border-radius: 13px;
  background: #334155;
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-btn.active {
  background: #3b82f6;
}

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s;
}

.toggle-btn.active .toggle-knob {
  transform: translateX(22px);
}

.loyalty-section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding-top: 0.25rem;
  border-top: 1px solid #334155;
}

.loyalty-preview {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.loyalty-preview-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.loyalty-preview-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #94a3b8;
}

.preview-result {
  color: #f1f5f9;
}
.preview-result strong {
  color: #22c55e;
}

/* ── Audit Log ── */
.audit-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding-top: 1.25rem;
}

.audit-summary-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.audit-summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audit-summary-label {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.audit-filters {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-top: 0.25rem;
}

.audit-filter-select {
  width: 180px;
}

.audit-date-input {
  padding: 0.5rem 0.75rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f1f5f9;
  font-size: 0.875rem;
}

.audit-date-input:focus {
  outline: none;
  border-color: #3b82f6;
}
.date-sep {
  color: #64748b;
  font-size: 0.875rem;
}

.audit-log-list {
  display: flex;
  flex-direction: column;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
}

.audit-log-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #334155;
}

.audit-log-item:last-child {
  border-bottom: none;
}

.audit-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 0.35rem;
}

.audit-dot-green {
  background: #22c55e;
}
.audit-dot-red {
  background: #ef4444;
}
.audit-dot-blue {
  background: #3b82f6;
}
.audit-dot-yellow {
  background: #f59e0b;
}
.audit-dot-grey {
  background: #64748b;
}

.audit-log-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.audit-log-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.audit-time {
  font-size: 0.8rem;
  color: #64748b;
  min-width: 100px;
}
.audit-user {
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
}

.audit-action-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.audit-badge-green {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}
.audit-badge-red {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
.audit-badge-blue {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}
.audit-badge-yellow {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}
.audit-badge-grey {
  background: rgba(100, 116, 139, 0.1);
  color: #64748b;
}

.audit-description {
  font-size: 0.8rem;
  color: #475569;
}

.empty-audit {
  text-align: center;
  padding: 3rem;
  color: #475569;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.empty-audit i {
  font-size: 3rem;
}

.audit-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
}

.audit-pagination-info {
  font-size: 0.8rem;
  color: #64748b;
}
.audit-pagination-buttons {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.audit-page-indicator {
  font-size: 0.8rem;
  color: #94a3b8;
}

/* ── Notifications ── */
.notif-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #334155;
}

.notif-row:last-of-type {
  border-bottom: none;
}

.notif-icon {
  margin-right: 0.5rem;
}

.notif-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #f1f5f9;
  display: block;
}

.notif-desc {
  display: block;
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 0.2rem;
}

.status-pill {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  flex-shrink: 0;
}

.status-sent {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.status-pending {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}
</style>
