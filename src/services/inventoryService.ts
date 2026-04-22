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

  // PUT /api/products/:id/inventory — update stock quantity
  async updateInventory(
    productId: string,
    data: UpdateInventoryRequest,
  ): Promise<ApiResponse<{ inventory: import('../types').Inventory }>> {
    const response = await api.put(`/api/products/${productId}/inventory`, data)
    return response.data
  },
}

export default inventoryService
