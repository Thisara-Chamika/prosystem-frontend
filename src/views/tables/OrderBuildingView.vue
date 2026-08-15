<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import tableService from '../../services/tableService'
import productService from '../../services/productService'
import inventoryService from '../../services/inventoryService'
import RequestBillDialog from './RequestBillDialog.vue'

import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const tableId = route.params.tableId as string

const loading = ref(false)
const order = ref<any>(null)
const table = ref<any>(null)

const STATUS_META: Record<string, { dot: string; label: string }> = {
  available: { dot: '🟢', label: 'Available' },
  occupied: { dot: '🔴', label: 'Occupied' },
  needs_cleaning: { dot: '🟡', label: 'Cleaning' },
  reserved: { dot: '🔵', label: 'Reserved' },
}

const KITCHEN_STATUS_META: Record<string, { icon: string; label: string; class: string }> = {
  pending: { icon: '⚪', label: 'Pending', class: 'status-pending' },
  preparing: { icon: '⏳', label: 'Preparing', class: 'status-preparing' },
  ready: { icon: '✅', label: 'Ready', class: 'status-ready' },
  served: { icon: '🍽️', label: 'Served', class: 'status-served' },
}

// ── Products ────────────────────────────────────────
const searchQuery = ref('')
const products = ref<any[]>([])
const loadingProducts = ref(false)

async function loadProducts() {
  loadingProducts.value = true
  try {
    const res = await productService.getProducts(1, 50)
    if (res.success) {
      const query = searchQuery.value.trim().toLowerCase()
      const active = res.data.filter(
        (p: any) =>
          p.isActive &&
          (!query || p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query)),
      )
      const withInventory = await Promise.all(
        active.map(async (product: any) => {
          try {
            const invRes = await inventoryService.getInventory(product.productId)
            return invRes.success ? { ...invRes.data } : { ...product, inventory: null }
          } catch {
            return { ...product, inventory: null }
          }
        }),
      )
      products.value = withInventory.filter(
        (p: any) => p.productType === 'service' || (p.inventory?.quantity ?? 0) > 0,
      )
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load products',
      life: 3000,
    })
  } finally {
    loadingProducts.value = false
  }
}

// ── Order + table lookup ─────────────────────────────
async function loadOrder() {
  loading.value = true
  try {
    const [orderRes, tablesRes] = await Promise.all([
      tableService.getOrder(tableId),
      tableService.getTables(),
    ])
    if (orderRes.success) order.value = orderRes.data
    if (tablesRes.success) {
      table.value = tablesRes.data.find((t: any) => t.tableId === tableId) ?? null
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load order', life: 3000 })
  } finally {
    loading.value = false
  }
}

const subtotal = computed(() => {
  if (!order.value) return 0
  return order.value.items
    .filter((i: any) => i.isActive)
    .reduce((sum: number, i: any) => sum + parseFloat(i.unitPrice) * i.quantity, 0)
})

const hasPendingItems = computed(() =>
  order.value?.items.some((i: any) => i.isActive && i.kitchenStatus === 'pending'),
)

const elapsedMinutes = computed(() => {
  if (!order.value?.openedAt) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(order.value.openedAt).getTime()) / 60000))
})

// ── Add item dialog ──────────────────────────────────
const showAddDialog = ref(false)
const addingProduct = ref<any>(null)
const addQuantity = ref(1)
const addSpecialRequests = ref('')
const savingItem = ref(false)

function openAddDialog(product: any) {
  addingProduct.value = product
  addQuantity.value = 1
  addSpecialRequests.value = ''
  showAddDialog.value = true
}

async function confirmAddItem() {
  if (!addingProduct.value || !order.value) return
  savingItem.value = true
  try {
    const res = await tableService.addOrderItem(order.value.orderId, {
      productId: addingProduct.value.productId,
      quantity: addQuantity.value,
      specialRequests: addSpecialRequests.value || undefined,
    })
    if (res.success) {
      showAddDialog.value = false
      await loadOrder()
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to add item',
      life: 3000,
    })
  } finally {
    savingItem.value = false
  }
}

// ── Remove item ───────────────────────────────────────
async function removeItem(orderItemId: string) {
  if (!order.value) return
  try {
    const res = await tableService.removeOrderItem(order.value.orderId, orderItemId)
    if (res.success) await loadOrder()
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to remove item',
      life: 3000,
    })
  }
}

// ── Send to kitchen ───────────────────────────────────
const sendingToKitchen = ref(false)

async function sendToKitchen() {
  if (!order.value) return
  sendingToKitchen.value = true
  try {
    const res = await tableService.sendToKitchen(order.value.orderId)
    if (res.success) {
      toast.add({
        severity: 'success',
        summary: 'Sent',
        detail: 'Order sent to kitchen',
        life: 2000,
      })
      await loadOrder()
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to send to kitchen',
      life: 3000,
    })
  } finally {
    sendingToKitchen.value = false
  }
}

const showBillDialog = ref(false)
const showReceiptDialog = ref(false)
const lastCheckout = ref<any>(null)

function requestBill() {
  showBillDialog.value = true
}

function onCheckoutSuccess(data: any) {
  lastCheckout.value = data
  showReceiptDialog.value = true
}

function closeReceiptAndReturn() {
  showReceiptDialog.value = false
  router.push('/tables')
}

onMounted(() => {
  loadOrder()
  loadProducts()
})
</script>

<template>
  <div class="order-screen">
    <Toast />

    <div class="order-header">
      <Button icon="pi pi-arrow-left" severity="secondary" text @click="router.push('/tables')" />
      <span class="table-name">Table {{ table?.tableNumber ?? '' }}</span>
      <span class="table-status" v-if="table">
        {{ STATUS_META[table.status]?.dot }} {{ STATUS_META[table.status]?.label }}
      </span>
      <span class="table-elapsed" v-if="order">{{ elapsedMinutes }} min</span>
    </div>

    <div class="order-body">
      <!-- Products panel -->
      <div class="products-panel">
        <IconField class="w-full">
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="searchQuery"
            placeholder="Search products..."
            class="w-full"
            @input="loadProducts"
          />
        </IconField>

        <div class="product-grid" v-if="!loadingProducts">
          <div
            v-for="product in products"
            :key="product.productId"
            class="product-card"
            @click="openAddDialog(product)"
          >
            <span class="product-card-name">{{ product.name }}</span>
            <span class="product-card-price">
              {{ authStore.formatCurrency(parseFloat(product.price)) }}
            </span>
          </div>
          <div v-if="products.length === 0" class="no-products">
            <i class="pi pi-search" />
            <p>No products found</p>
          </div>
        </div>
        <div class="loading-products" v-else>
          <i class="pi pi-spin pi-spinner" />
        </div>
      </div>

      <!-- Current order panel -->
      <div class="order-panel">
        <div class="order-panel-header">
          <span>Current Order</span>
        </div>

        <div class="order-items" v-if="!loading && order">
          <div v-if="order.items.filter((i: any) => i.isActive).length === 0" class="empty-order">
            <i class="pi pi-shopping-cart" />
            <p>No items yet</p>
          </div>

          <div
            v-for="item in order.items.filter((i: any) => i.isActive)"
            :key="item.orderItemId"
            class="order-item"
          >
            <div class="order-item-info">
              <span class="order-item-name">{{ item.productName }} x{{ item.quantity }}</span>
              <span class="order-item-special" v-if="item.specialRequests">
                "{{ item.specialRequests }}"
              </span>
            </div>
            <span class="kitchen-badge" :class="KITCHEN_STATUS_META[item.kitchenStatus]?.class">
              {{ KITCHEN_STATUS_META[item.kitchenStatus]?.icon }}
              {{ KITCHEN_STATUS_META[item.kitchenStatus]?.label }}
            </span>
            <Button
              v-if="item.kitchenStatus === 'pending'"
              icon="pi pi-trash"
              severity="danger"
              text
              size="small"
              @click="removeItem(item.orderItemId)"
            />
            <span class="order-item-total">
              {{ authStore.formatCurrency(parseFloat(item.unitPrice) * item.quantity) }}
            </span>
          </div>
        </div>

        <div class="order-loading" v-else-if="loading">
          <i class="pi pi-spin pi-spinner" />
        </div>

        <div class="order-totals" v-if="order">
          <span>Subtotal</span>
          <span>{{ authStore.formatCurrency(subtotal) }}</span>
        </div>

        <div class="order-actions">
          <Button
            label="Send to Kitchen"
            icon="pi pi-send"
            :disabled="!hasPendingItems"
            :loading="sendingToKitchen"
            class="flex-1"
            @click="sendToKitchen"
          />
          <Button
            label="Request Bill"
            icon="pi pi-file"
            severity="secondary"
            class="flex-1"
            @click="requestBill"
          />
        </div>
      </div>
    </div>

    <!-- Request Bill dialog -->
    <RequestBillDialog
      v-model:visible="showBillDialog"
      :order="order"
      :tableNumber="table?.tableNumber ?? ''"
      @success="onCheckoutSuccess"
    />

    <!-- Receipt dialog -->
    <Dialog
      v-model:visible="showReceiptDialog"
      header="Order Complete"
      :style="{ width: '420px' }"
      modal
      :closable="false"
    >
      <div class="receipt" v-if="lastCheckout">
        <div class="receipt-header">
          <i class="pi pi-check-circle receipt-icon" />
          <h3>Payment Successful!</h3>
          <p class="txn-number">{{ lastCheckout.transaction.transactionNumber }}</p>
        </div>
        <div class="receipt-items">
          <div
            v-for="item in lastCheckout.items"
            :key="item.itemId ?? item.productName"
            class="receipt-item"
          >
            <span>{{ item.productName }} x{{ item.quantity }}</span>
            <span>{{ authStore.formatCurrency(parseFloat(item.total)) }}</span>
          </div>
        </div>
        <div class="receipt-totals">
          <div class="receipt-row">
            <span>Subtotal</span>
            <span>{{
              authStore.formatCurrency(parseFloat(lastCheckout.transaction.subtotal))
            }}</span>
          </div>
          <div class="receipt-row">
            <span>Tax</span>
            <span>{{ authStore.formatCurrency(parseFloat(lastCheckout.transaction.tax)) }}</span>
          </div>
          <div class="receipt-row grand">
            <span>Total Paid</span>
            <span>{{ authStore.formatCurrency(parseFloat(lastCheckout.transaction.total)) }}</span>
          </div>
          <div class="receipt-row">
            <span>Payment Method</span>
            <span>{{ lastCheckout.transaction.paymentMethod.toUpperCase() }}</span>
          </div>
          <div class="receipt-row" v-if="lastCheckout.amountPerPerson">
            <span>Split ({{ lastCheckout.splitCount }} people)</span>
            <span>{{ authStore.formatCurrency(lastCheckout.amountPerPerson) }} each</span>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Back to Tables" icon="pi pi-arrow-left" @click="closeReceiptAndReturn" />
      </template>
    </Dialog>
    <!-- Add item dialog -->
    <Dialog
      v-model:visible="showAddDialog"
      :header="addingProduct?.name"
      :style="{ width: '360px' }"
      modal
    >
      <div class="add-dialog">
        <div class="field">
          <label>Quantity</label>
          <InputNumber v-model="addQuantity" :min="1" showButtons class="w-full" />
        </div>
        <div class="field">
          <label>Special Requests (optional)</label>
          <Textarea
            v-model="addSpecialRequests"
            rows="2"
            class="w-full"
            placeholder="e.g. extra spicy"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showAddDialog = false" />
        <Button
          label="Add to Order"
          icon="pi pi-check"
          :loading="savingItem"
          @click="confirmAddItem"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.order-screen {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  height: calc(100vh - 60px - 1rem);
}

.order-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.table-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: #f1f5f9;
}

.table-status {
  font-size: 0.875rem;
  color: #94a3b8;
}

.table-elapsed {
  font-size: 0.8rem;
  color: #64748b;
}

.order-body {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

.products-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
  overflow-y: auto;
}

.product-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 1rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  transition: all 0.2s;
}

.product-card:hover {
  border-color: #3b82f6;
}

.product-card-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f1f5f9;
}

.product-card-price {
  font-size: 0.9rem;
  font-weight: 700;
  color: #3b82f6;
}

.no-products,
.loading-products {
  grid-column: 1 / -1;
  text-align: center;
  padding: 2rem;
  color: #475569;
}

.order-panel {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.order-panel-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #334155;
  font-weight: 600;
  color: #f1f5f9;
}

.order-items {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.empty-order,
.order-loading {
  text-align: center;
  padding: 2rem;
  color: #475569;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  background: #0f172a;
  border-radius: 8px;
  flex-wrap: wrap;
}

.order-item-info {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
}

.order-item-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #f1f5f9;
}

.order-item-special {
  font-size: 0.75rem;
  color: #94a3b8;
  font-style: italic;
}

.kitchen-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  white-space: nowrap;
}

.status-pending {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}
.status-preparing {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}
.status-ready {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}
.status-served {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.order-item-total {
  font-weight: 600;
  color: #3b82f6;
  font-size: 0.85rem;
  min-width: 70px;
  text-align: right;
}

.order-totals {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid #334155;
  font-weight: 700;
  color: #f1f5f9;
}

.order-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem 1.25rem;
}

.flex-1 {
  flex: 1;
}

.add-dialog {
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

.receipt {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.receipt-header {
  text-align: center;
  padding: 1rem 0;
}
.receipt-icon {
  font-size: 3rem;
  color: #22c55e;
  display: block;
  margin-bottom: 0.5rem;
}
.receipt-header h3 {
  margin: 0 0 0.25rem;
  color: #f1f5f9;
}
.txn-number {
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0;
}
.receipt-items {
  background: #0f172a;
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.receipt-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #cbd5e1;
}
.receipt-totals {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.receipt-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #94a3b8;
}
.receipt-row.grand {
  font-size: 1rem;
  font-weight: 700;
  color: #f1f5f9;
  padding-top: 0.5rem;
  border-top: 1px solid #334155;
}
</style>
