import api from './api'
import type { ApiResponse, ProductWithInventory, UpdateInventoryRequest } from '../types'

const inventoryService = {
  // GET /api/products/:id — returns product with inventory nested
  async getProductWithInventory(productId: string): Promise<ApiResponse<ProductWithInventory>> {
    const response = await api.get(`/api/products/${productId}`)
    return response.data
  },

  // GET /api/products/:id/inventory — dedicated inventory endpoint
  async getInventory(productId: string): Promise<ApiResponse<ProductWithInventory>> {
    const response = await api.get(`/api/products/${productId}/inventory`)
    return response.data
  },

  // PATCH /api/products/:id/inventory — update stock quantity
  async updateInventory(
    productId: string,
    data: UpdateInventoryRequest,
  ): Promise<ApiResponse<any>> {
    const response = await api.patch(`/api/products/${productId}/inventory`, data)
    return response.data
  },

  // GET /api/inventory
  async getInventoryList(params?: {
    search?: string
    category?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<any> {
    const response = await api.get('/api/inventory', { params })
    return response.data
  },

  // GET /api/inventory/low-stock
  async getLowStock(limit = 10): Promise<any> {
    const response = await api.get('/api/inventory/low-stock', { params: { limit } })
    return response.data
  },

  // PUT /api/inventory/:productId/reorder
  async updateReorderSettings(
    productId: string,
    data: { reorderPoint: number; reorderQuantity: number },
  ): Promise<any> {
    const response = await api.put(`/api/inventory/${productId}/reorder`, data)
    return response.data
  },
}

export default inventoryService
