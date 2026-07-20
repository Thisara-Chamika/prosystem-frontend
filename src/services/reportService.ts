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

  async getRevenueTrends(period: 'week' | 'month' | 'quarter'): Promise<any> {
    const response = await api.get('/api/reports/revenue-trends', { params: { period } })
    return response.data
  },

  async getCustomerAnalytics(params: { fromDate: string; toDate: string }): Promise<any> {
    const response = await api.get('/api/reports/customer-analytics', { params })
    return response.data
  },

  async getInventoryValuation(): Promise<any> {
    const response = await api.get('/api/reports/inventory-valuation')
    return response.data
  },

  async getReturnsAnalysis(params: { fromDate: string; toDate: string }): Promise<any> {
    const response = await api.get('/api/reports/returns-analysis', { params })
    return response.data
  },

  async exportReport(params: {
    type: 'revenue-trends' | 'customer-analytics' | 'inventory-valuation' | 'returns-analysis'
    format: 'csv' | 'pdf'
    period?: string
    fromDate?: string
    toDate?: string
  }): Promise<Blob> {
    const response = await api.get('/api/reports/export', {
      params,
      responseType: 'blob',
    })
    return response.data
  },
}

export default reportService
