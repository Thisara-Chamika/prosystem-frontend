<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import shopService from '../../services/shopService'
import { useAuthStore } from '../../stores/authStore'
import categoryService from '../../services/categoryService'
import type { Category } from '../../types'
import pluginService from '../../services/pluginService'

import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
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

async function onDragEnd(event: any) {
  const reordered = categories.value.map((cat, index) => ({
    categoryId: cat.categoryId,
    sortOrder: index + 1,
  }))
  try {
    await categoryService.reorderCategories(reordered)
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save order', life: 3000 })
  }
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
      // Reload shop data so activePlugins updates and sidebar reacts
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

onBeforeUnmount(() => {
  document.documentElement.style.setProperty('--ps-primary', originalColor.value)
})

onMounted(() => {
  loadSettings()
  loadCategories()
  loadPlugins()
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
          <Tab value="4">Audit Log</Tab>
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

                <!-- Live Preview -->
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
                      <i class="pi pi-home" />
                      <span>Dashboard</span>
                    </div>
                    <div class="preview-nav-item">
                      <i class="pi pi-shopping-cart" />
                      <span>POS</span>
                    </div>
                    <div class="preview-nav-item">
                      <i class="pi pi-box" />
                      <span>Products</span>
                    </div>
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

              <div class="plugin-list" v-else>
                <div v-for="plugin in plugins" :key="plugin.id" class="plugin-card">
                  <div class="plugin-header">
                    <div class="plugin-icon">{{ plugin.icon }}</div>
                    <div class="plugin-info">
                      <span class="plugin-name">{{ plugin.name }}</span>
                      <span class="plugin-version">v{{ plugin.version }}</span>
                    </div>
                    <div class="plugin-status">
                      <span v-if="plugin.isInstalled" class="status-badge installed">
                        <i class="pi pi-check-circle" /> Installed
                      </span>
                    </div>
                  </div>

                  <p class="plugin-desc">{{ plugin.description }}</p>

                  <div class="plugin-features">
                    <div v-for="feature in plugin.features" :key="feature" class="plugin-feature">
                      <i class="pi pi-check" />
                      <span>{{ feature }}</span>
                    </div>
                  </div>

                  <div class="plugin-actions">
                    <template v-if="plugin.isInstalled">
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
                    </template>
                    <template v-else>
                      <Button
                        label="Install"
                        icon="pi pi-download"
                        size="small"
                        :loading="installingPlugin === plugin.id"
                        @click="confirmInstall(plugin)"
                      />
                    </template>
                  </div>
                </div>

                <div v-if="plugins.length === 0" class="empty-plugins">
                  <i class="pi pi-puzzle" />
                  <p>No plugins available</p>
                </div>
              </div>
            </div>
          </TabPanel>

          <!-- ── Tab 5: Audit Log ── -->
          <TabPanel value="4">
            <div class="tab-content">
              <div class="coming-soon">
                <i class="pi pi-shield coming-soon-icon" />
                <h3>Coming Soon</h3>
                <p>Audit log viewer will be available in the next update.</p>
                <p class="coming-soon-desc">
                  Track all changes made to your shop — staff actions, settings changes, and more.
                </p>
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

.coming-soon {
  text-align: center;
  padding: 4rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.coming-soon-icon {
  font-size: 3rem;
  color: #334155;
}

.coming-soon h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #64748b;
  margin: 0;
}

.coming-soon p {
  color: #475569;
  margin: 0;
  font-size: 0.875rem;
}

.coming-soon-desc {
  color: #334155 !important;
  max-width: 300px;
  line-height: 1.5;
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
</style>
