import api from './api'

const auditLogService = {
  async getLogs(params?: {
    action?: string
    userId?: string
    fromDate?: string
    toDate?: string
    page?: number
    limit?: number
  }): Promise<any> {
    const response = await api.get('/api/audit-logs', { params })
    return response.data
  },

  async getSummary(): Promise<any> {
    const response = await api.get('/api/audit-logs/summary')
    return response.data
  },
}

export default auditLogService
