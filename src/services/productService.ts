import api from './api'
import type { ApiResponse, Product, CreateProductRequest, UpdateProductRequest } from '../types'

export interface ProductsApiResponse {
  data: Product[]
  pagination: {
    page: number
    limit: number
  }
}

const productService = {
  // GET /api/products
  async getProducts(page = 1, limit = 10): Promise<any> {
    const response = await api.get(
      `/api/products?page=${page}&limit=${limit}&sort=createdAt&order=desc`,
    )
    return response.data
  },

  // GET /api/products/:id
  async getProduct(id: string): Promise<ApiResponse<{ product: Product }>> {
    const response = await api.get(`/api/products/${id}`)
    return response.data
  },

  // POST /api/products
  async createProduct(data: CreateProductRequest): Promise<ApiResponse<{ product: Product }>> {
    const response = await api.post('/api/products', data)
    return response.data
  },

  // PUT /api/products/:id
  async updateProduct(
    id: string,
    data: UpdateProductRequest,
  ): Promise<ApiResponse<{ product: Product }>> {
    const response = await api.put(`/api/products/${id}`, data)
    return response.data
  },

  // DELETE /api/products/:id
  async deleteProduct(id: string): Promise<ApiResponse<null>> {
    const response = await api.delete(`/api/products/${id}`)
    return response.data
  },
}

export default productService
