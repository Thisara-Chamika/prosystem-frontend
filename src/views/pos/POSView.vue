<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import productService from '../../services/productService'
import posService from '../../services/posService'
import type { CartItem, CreateTransactionRequest } from '../../types'
import inventoryService from '../../services/inventoryService'

// PrimeVue components
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'

const toast = useToast()

// ── Product Search State ───────────────────────────
const searchQuery = ref('')
const products = ref<any[]>([])
const loadingProducts = ref(false)

// ── Cart State ─────────────────────────────────────
const cart = ref<CartItem[]>([])

// ── Payment State ──────────────────────────────────
const paymentMethod = ref<'cash' | 'card' | 'online' | 'mixed'>('cash')
const overallDiscount = ref(0)
const notes = ref('')
const processingCheckout = ref(false)

// ── Receipt Dialog ─────────────────────────────────
const showReceipt = ref(false)
const lastTransaction = ref<any>(null)

const paymentMethods = [
  { label: 'Cash', value: 'cash' },
  { label: 'Card', value: 'card' },
  { label: 'Online', value: 'online' },
  { label: 'Mixed', value: 'mixed' },
]

// ── Computed — Cart Totals ─────────────────────────
const subtotal = computed(() =>
  cart.value.reduce((sum, item) => sum + item.price * item.quantity - item.discount, 0),
)

const taxAmount = computed(() =>
  cart.value.reduce(
    (sum, item) => sum + ((item.price * item.quantity - item.discount) * item.taxRate) / 100,
    0,
  ),
)

const totalAmount = computed(() => subtotal.value + taxAmount.value - overallDiscount.value)

const cartItemCount = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0))

// ── Methods ───────────────────────────────────────
async function searchProducts() {
  if (!searchQuery.value.trim()) {
    loadAllProducts()
    return
  }
  loadingProducts.value = true
  try {
    const response = await productService.getProducts(1, 50)
    if (response.success) {
      const query = searchQuery.value.toLowerCase()
      const activeProducts = response.data.filter(
        (p: any) =>
          p.isActive &&
          (p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query)),
      )

      // Fetch inventory for filtered products
      const withInventory = await Promise.all(
        activeProducts.map(async (product: any) => {
          try {
            const invResponse = await inventoryService.getInventory(product.productId)
            return invResponse.success ? { ...invResponse.data } : { ...product, inventory: null }
          } catch {
            return { ...product, inventory: null }
          }
        }),
      )

      // Only show in-stock products
      products.value = withInventory.filter((p: any) => (p.inventory?.quantity ?? 0) > 0)
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Search failed',
      life: 3000,
    })
  } finally {
    loadingProducts.value = false
  }
}

async function loadAllProducts() {
  loadingProducts.value = true
  try {
    const response = await productService.getProducts(1, 50)
    if (response.success) {
      const activeProducts = response.data.filter((p: any) => p.isActive)

      // Fetch inventory for each product
      const withInventory = await Promise.all(
        activeProducts.map(async (product: any) => {
          try {
            const invResponse = await inventoryService.getInventory(product.productId)
            return invResponse.success ? { ...invResponse.data } : { ...product, inventory: null }
          } catch {
            return { ...product, inventory: null }
          }
        }),
      )

      // Only show products with stock > 0
      products.value = withInventory.filter((p: any) => (p.inventory?.quantity ?? 0) > 0)
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

function addToCart(product: any) {
  const availableStock = product.inventory?.quantity ?? 0
  const existing = cart.value.find((item) => item.productId === product.productId)
  const currentQty = existing?.quantity ?? 0

  // Check if adding one more would exceed stock
  if (currentQty >= availableStock) {
    toast.add({
      severity: 'warn',
      summary: 'Stock Limit Reached',
      detail: `Only ${availableStock} units available for ${product.name}`,
      life: 3000,
    })
    return
  }

  if (existing) {
    existing.quantity++
  } else {
    cart.value.push({
      productId: product.productId,
      productName: product.name,
      productSku: product.sku,
      price: parseFloat(product.price),
      taxRate: parseFloat(product.taxRate),
      quantity: 1,
      discount: 0,
      availableStock: availableStock,
    })
  }
  toast.add({
    severity: 'success',
    summary: 'Added',
    detail: `${product.name} added to cart`,
    life: 1500,
  })
}

function removeFromCart(productId: string) {
  cart.value = cart.value.filter((item) => item.productId !== productId)
}

function updateQuantity(productId: string, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(productId)
    return
  }
  const item = cart.value.find((i) => i.productId === productId)
  if (!item) return

  const product = products.value.find((p: any) => p.productId === productId)
  const availableStock = product?.inventory?.quantity ?? 0

  if (quantity > availableStock) {
    toast.add({
      severity: 'warn',
      summary: 'Stock Limit',
      detail: `Only ${availableStock} units available`,
      life: 3000,
    })
    return
  }
  item.quantity = quantity
}

function clearCart() {
  cart.value = []
  overallDiscount.value = 0
  notes.value = ''
  paymentMethod.value = 'cash'
}

async function processCheckout() {
  if (cart.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'Empty Cart',
      detail: 'Please add items to cart first',
      life: 3000,
    })
    return
  }

  processingCheckout.value = true
  try {
    const request: CreateTransactionRequest = {
      paymentMethod: paymentMethod.value,
      discount: overallDiscount.value,
      notes: notes.value || undefined,
      items: cart.value.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        discount: item.discount,
      })),
    }

    const response = await posService.createTransaction(request)
    if (response.success) {
      lastTransaction.value = response.data
      showReceipt.value = true
      clearCart()

      // Reload products with fresh stock data
      await loadAllProducts()

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: `Transaction ${response.data.transaction.transactionNumber} completed!`,
        life: 5000,
      })
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Checkout Failed',
      detail: error.response?.data?.message || 'Failed to process transaction',
      life: 5000,
    })
  } finally {
    processingCheckout.value = false
  }
}

onMounted(() => {
  loadAllProducts()
})
</script>

<template>
  <div class="pos-screen">
    <Toast />

    <!-- Left Panel — Product Search -->
    <div class="products-panel">
      <div class="search-bar">
        <IconField class="w-full">
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="searchQuery"
            placeholder="Search by name or SKU..."
            class="w-full"
            @input="searchProducts"
          />
        </IconField>
      </div>

      <!-- Product Grid -->
      <div class="product-grid" v-if="!loadingProducts">
        <div
          v-for="product in products"
          :key="product.productId"
          class="product-card"
          @click="addToCart(product)"
        >
          <div class="product-card-top">
            <div class="product-card-icon">
              <i class="pi pi-box" />
            </div>
            <span
              class="stock-badge"
              :class="{
                'stock-low': (product.inventory?.quantity ?? 0) <= 10,
                'stock-ok': (product.inventory?.quantity ?? 0) > 10,
              }"
            >
              {{ product.inventory?.quantity ?? 0 }} left
            </span>
          </div>
          <div class="product-card-info">
            <span class="product-card-name">{{ product.name }}</span>
            <span class="product-card-sku">{{ product.sku }}</span>
            <span class="product-card-price"> ${{ parseFloat(product.price).toFixed(2) }} </span>
          </div>
        </div>

        <div v-if="products.length === 0" class="no-products">
          <i class="pi pi-search" />
          <p>No products found</p>
        </div>
      </div>

      <div class="loading-products" v-else>
        <i class="pi pi-spin pi-spinner" />
        <p>Loading products...</p>
      </div>
    </div>

    <!-- Right Panel — Cart -->
    <div class="cart-panel">
      <!-- Cart Header -->
      <div class="cart-header">
        <span class="cart-title">
          <i class="pi pi-shopping-cart" />
          Cart
        </span>
        <Tag :value="`${cartItemCount} items`" severity="secondary" />
        <Button
          v-if="cart.length > 0"
          icon="pi pi-trash"
          severity="danger"
          size="small"
          text
          @click="clearCart"
        />
      </div>

      <!-- Cart Items -->
      <div class="cart-items">
        <div v-if="cart.length === 0" class="empty-cart">
          <i class="pi pi-shopping-cart" />
          <p>Cart is empty</p>
          <span>Click on a product to add it</span>
        </div>

        <div v-for="item in cart" :key="item.productId" class="cart-item">
          <div class="cart-item-info">
            <span class="cart-item-name">{{ item.productName }}</span>
            <span class="cart-item-sku">{{ item.productSku }}</span>
          </div>

          <div class="cart-item-controls">
            <Button
              icon="pi pi-minus"
              size="small"
              severity="secondary"
              text
              @click="updateQuantity(item.productId, item.quantity - 1)"
            />
            <span class="cart-item-qty">{{ item.quantity }}</span>
            <Button
              icon="pi pi-plus"
              size="small"
              severity="secondary"
              text
              @click="updateQuantity(item.productId, item.quantity + 1)"
            />
          </div>

          <div class="cart-item-total">${{ (item.price * item.quantity).toFixed(2) }}</div>

          <Button
            icon="pi pi-times"
            size="small"
            severity="danger"
            text
            @click="removeFromCart(item.productId)"
          />
        </div>
      </div>

      <!-- Cart Totals -->
      <div class="cart-totals">
        <div class="total-row">
          <span>Subtotal</span>
          <span>${{ subtotal.toFixed(2) }}</span>
        </div>
        <div class="total-row">
          <span>Tax</span>
          <span>${{ taxAmount.toFixed(2) }}</span>
        </div>
        <div class="total-row">
          <span>Discount</span>
          <div class="discount-input">
            <InputNumber
              v-model="overallDiscount"
              prefix="$"
              :min="0"
              :max="subtotal"
              :minFractionDigits="2"
              :maxFractionDigits="2"
              class="discount-field"
            />
          </div>
        </div>
        <div class="total-row grand-total">
          <span>Total</span>
          <span>${{ totalAmount.toFixed(2) }}</span>
        </div>
      </div>

      <!-- Payment Method -->
      <div class="payment-section">
        <label class="payment-label">Payment Method</label>
        <div class="payment-buttons">
          <button
            v-for="method in paymentMethods"
            :key="method.value"
            class="payment-btn"
            :class="{ active: paymentMethod === method.value }"
            @click="paymentMethod = method.value as any"
          >
            <i
              :class="{
                'pi pi-wallet': method.value === 'cash',
                'pi pi-credit-card': method.value === 'card',
                'pi pi-globe': method.value === 'online',
                'pi pi-arrows-h': method.value === 'mixed',
              }"
            />
            {{ method.label }}
          </button>
        </div>
      </div>

      <!-- Notes -->
      <div class="notes-section">
        <InputText v-model="notes" placeholder="Add notes (optional)..." class="w-full" />
      </div>

      <!-- Checkout Button -->
      <Button
        label="Process Payment"
        icon="pi pi-check-circle"
        :loading="processingCheckout"
        :disabled="cart.length === 0"
        class="checkout-btn w-full"
        size="large"
        @click="processCheckout"
      />
    </div>

    <!-- Receipt Dialog -->
    <Dialog
      v-model:visible="showReceipt"
      header="Transaction Complete"
      :style="{ width: '420px' }"
      modal
    >
      <div class="receipt" v-if="lastTransaction">
        <div class="receipt-header">
          <i class="pi pi-check-circle receipt-icon" />
          <h3>Payment Successful!</h3>
          <p class="txn-number">{{ lastTransaction.transaction.transactionNumber }}</p>
        </div>

        <div class="receipt-items">
          <div v-for="item in lastTransaction.items" :key="item.itemId" class="receipt-item">
            <span>{{ item.productName }} x{{ item.quantity }}</span>
            <span>${{ parseFloat(item.total).toFixed(2) }}</span>
          </div>
        </div>

        <div class="receipt-totals">
          <div class="receipt-row">
            <span>Subtotal</span>
            <span>${{ parseFloat(lastTransaction.transaction.subtotal).toFixed(2) }}</span>
          </div>
          <div class="receipt-row">
            <span>Tax</span>
            <span>${{ parseFloat(lastTransaction.transaction.tax).toFixed(2) }}</span>
          </div>
          <div class="receipt-row">
            <span>Discount</span>
            <span>-${{ parseFloat(lastTransaction.transaction.discount).toFixed(2) }}</span>
          </div>
          <div class="receipt-row grand">
            <span>Total Paid</span>
            <span>${{ parseFloat(lastTransaction.transaction.total).toFixed(2) }}</span>
          </div>
          <div class="receipt-row">
            <span>Payment Method</span>
            <span>{{ lastTransaction.transaction.paymentMethod.toUpperCase() }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <Button
          label="New Sale"
          icon="pi pi-plus"
          @click="
            () => {
              showReceipt = false
              loadAllProducts()
            }
          "
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.pos-screen {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 1rem;
  height: calc(100vh - 60px - 3rem);
  min-width: 0;
}

/* ── Left Panel ── */
.products-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
}

.search-bar {
  position: relative;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.product-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.product-card:hover {
  border-color: #3b82f6;
  background: #1e3a5f;
  transform: translateY(-2px);
}

.product-card-icon {
  width: 40px;
  height: 40px;
  background: #334155;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.product-card-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #f1f5f9;
  line-height: 1.3;
  display: block;
}

.product-card-sku {
  font-size: 0.75rem;
  color: #64748b;
  display: block;
}

.product-card-price {
  font-size: 1rem;
  font-weight: 700;
  color: #3b82f6;
  display: block;
}

.product-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.stock-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
}

.stock-ok {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.stock-low {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.no-products,
.loading-products {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
  color: #475569;
}

.no-products i,
.loading-products i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  display: block;
}

/* ── Right Panel — Cart ── */
.cart-panel {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cart-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #334155;
}

.cart-title {
  font-size: 1rem;
  font-weight: 600;
  color: #f1f5f9;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.empty-cart {
  text-align: center;
  padding: 2rem;
  color: #475569;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.empty-cart i {
  font-size: 2.5rem;
}
.empty-cart p {
  font-weight: 600;
  color: #64748b;
  margin: 0;
}
.empty-cart span {
  font-size: 0.8rem;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  background: #0f172a;
  border-radius: 8px;
  border: 1px solid #334155;
}

.cart-item-info {
  flex: 1;
  min-width: 0;
}

.cart-item-name {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cart-item-sku {
  font-size: 0.7rem;
  color: #64748b;
}

.cart-item-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.cart-item-qty {
  font-weight: 600;
  color: #f1f5f9;
  min-width: 24px;
  text-align: center;
  font-size: 0.875rem;
}

.cart-item-total {
  font-weight: 600;
  color: #3b82f6;
  font-size: 0.875rem;
  min-width: 60px;
  text-align: right;
}

/* ── Totals ── */
.cart-totals {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid #334155;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: #94a3b8;
}

.total-row.grand-total {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f1f5f9;
  padding-top: 0.5rem;
  border-top: 1px solid #334155;
  margin-top: 0.25rem;
}

.discount-input {
  display: flex;
  justify-content: flex-end;
}

.discount-field {
  width: 110px;
}

/* ── Payment ── */
.payment-section {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid #334155;
}

.payment-label {
  font-size: 0.8rem;
  color: #94a3b8;
  display: block;
  margin-bottom: 0.5rem;
}

.payment-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.payment-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #0f172a;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.payment-btn:hover {
  border-color: #3b82f6;
  color: #f1f5f9;
}

.payment-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

/* ── Notes ── */
.notes-section {
  padding: 0.5rem 1.25rem;
}

/* ── Checkout ── */
.checkout-btn {
  margin: 0.75rem 1.25rem 1.25rem;
  height: 48px;
  font-size: 1rem;
  font-weight: 700;
}

/* ── Receipt ── */
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

.w-full {
  width: 100% !important;
}
</style>
