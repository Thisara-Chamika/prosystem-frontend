import api from './api'
import type {
  ApiResponse,
  Transaction,
  CreateTransactionRequest,
  ProcessReturnRequest,
  ReturnResponse,
} from '../types'

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

  // GET /api/pos with filters
  async getTransactionsFiltered(params: {
    page?: number
    limit?: number
    status?: string
    paymentMethod?: string
    fromDate?: string
    toDate?: string
  }): Promise<any> {
    const response = await api.get('/api/pos', {
      params: { ...params, _t: Date.now() },
    })
    return response.data
  },

  // POST /api/transactions/:transactionId/return
  async processReturn(
    transactionId: string,
    data: ProcessReturnRequest,
  ): Promise<ApiResponse<ReturnResponse>> {
    const response = await api.post(`/api/transactions/${transactionId}/return`, data)
    return response.data
  },

  // GET /api/pos/return-lookup
  async returnLookup(search: string): Promise<any> {
    const response = await api.get('/api/pos/return-lookup', {
      params: { search },
    })
    return response.data
  },

  // GET /api/dashboard/cashier-summary
  async getCashierSummary(): Promise<any> {
    const response = await api.get('/api/dashboard/cashier-summary')
    return response.data
  },
}

export default posService
