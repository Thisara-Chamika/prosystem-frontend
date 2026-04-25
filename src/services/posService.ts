import api from './api'
import type { ApiResponse, Transaction, CreateTransactionRequest } from '../types'

const posService = {
  // POST /api/pos — create transaction
  async createTransaction(
    data: CreateTransactionRequest,
  ): Promise<ApiResponse<{ transaction: Transaction; items: any[] }>> {
    const response = await api.post('/api/pos', data)
    return response.data
  },

  // GET /api/pos — get all transactions
  async getTransactions(page = 1, limit = 50): Promise<any> {
    const response = await api.get(`/api/pos?page=${page}&limit=${limit}&_t=${Date.now()}`)
    return response.data
  },

  // GET /api/pos/:id — get single transaction
  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    const response = await api.get(`/api/pos/${id}`)
    return response.data
  },
}

export default posService
