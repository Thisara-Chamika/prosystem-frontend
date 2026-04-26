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
}

export default customerService
