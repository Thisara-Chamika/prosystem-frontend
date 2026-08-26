import api from './api'

const adminService = {
  async getMetrics(): Promise<any> {
    const response = await api.get('/api/admin/metrics')
    return response.data
  },
}

export default adminService
