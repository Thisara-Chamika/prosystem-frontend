import api from './api'
import type { ApiResponse, Customer, CreateCustomerRequest } from '../types'

const customerService = {
  // GET /api/customers?search=
  async searchCustomers(search: string): Promise<any> {
    const response = await api.get(
      `/api/customers?search=${encodeURIComponent(search)}&limit=10&_t=${Date.now()}`,
    )
    return response.data
  },

  // POST /api/customers
  async createCustomer(data: CreateCustomerRequest): Promise<ApiResponse<Customer>> {
    const response = await api.post('/api/customers', data)
    return response.data
  },

  // GET /api/customers — paginated list
  async getCustomers(page = 1, limit = 10, search = ''): Promise<any> {
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : ''
    const response = await api.get(
      `/api/customers?page=${page}&limit=${limit}${searchParam}&_t=${Date.now()}`,
    )
    return response.data
  },

  // GET /api/customers/:id — single customer
  async getCustomer(customerId: string): Promise<any> {
    const response = await api.get(`/api/customers/${customerId}`)
    return response.data
  },

  // GET /api/pos?customerId= — customer transaction history
  async getCustomerTransactions(customerId: string): Promise<any> {
    const response = await api.get(`/api/pos?customerId=${customerId}&limit=50&_t=${Date.now()}`)
    return response.data
  },

  // Update customer details
  async updateCustomer(customerId: string, data: Partial<CreateCustomerRequest>): Promise<any> {
    const response = await api.put(`/api/customers/${customerId}`, data)
    return response.data
  },
}

export default customerService
