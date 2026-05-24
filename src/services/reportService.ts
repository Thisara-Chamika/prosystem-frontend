import api from './api'

const reportService = {
  async getSummary(params?: { fromDate?: string; toDate?: string }): Promise<any> {
    const response = await api.get('/api/reports/summary', { params })
    return response.data
  },

  async getDailySales(params?: { fromDate?: string; toDate?: string }): Promise<any> {
    const response = await api.get('/api/reports/daily-sales', { params })
    return response.data
  },

  async getTopProducts(params?: {
    fromDate?: string
    toDate?: string
    limit?: number
  }): Promise<any> {
    const response = await api.get('/api/reports/top-products', { params })
    return response.data
  },

  async getPaymentMethods(params?: { fromDate?: string; toDate?: string }): Promise<any> {
    const response = await api.get('/api/reports/payment-methods', { params })
    return response.data
  },

  async getCashierSummary(params?: { fromDate?: string; toDate?: string }): Promise<any> {
    const response = await api.get('/api/reports/cashier-summary', { params })
    return response.data
  },
}

export default reportService
