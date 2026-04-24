// API response wrapper - matches your backend's response format
// { success: true, message: '...', data: {...} }
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

// The logged-in user's info
export interface User {
  userId: string
  shopId: string
  email: string
  firstName: string
  lastName: string
  role: 'super_admin' | 'shop_owner' | 'shop_manager' | 'cashier'
  phone?: string
  isActive?: boolean
}

// What we send TO the backend when logging in
export interface LoginRequest {
  email: string
  password: string
}

// What we get BACK from the backend after login
export interface LoginResponse {
  token: string
  user: User
}

// Product from backend
export interface Product {
  productId: string
  shopId: string
  sku: string
  barcode: string | null
  name: string
  description: string | null
  category: string | null
  price: number
  cost: number | null
  taxRate: number
  trackInventory: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// What we send to create a product
export interface CreateProductRequest {
  sku: string
  barcode?: string
  name: string
  description?: string
  category?: string
  price: number
  cost?: number
  taxRate?: number
  trackInventory?: boolean
  initialStock?: number
}

// What we send to update a product
export interface UpdateProductRequest {
  name?: string
  description?: string
  category?: string
  price?: number
  cost?: number
  taxRate?: number
  barcode?: string
  trackInventory?: boolean
  active?: boolean
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
  }
}

export interface Inventory {
  inventoryId: string
  productId: string
  shopId: string
  quantity: number
  reserved: number
  reorderPoint: number
  reorderQuantity: number
  updatedAt: string
}

export interface ProductWithInventory extends Product {
  inventory: Inventory | null
}

export interface UpdateInventoryRequest {
  quantity: number
  reorderPoint?: number
  reorderQuantity?: number
}
