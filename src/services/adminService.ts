import api from './api'

const adminService = {
  // GET /api/admin/metrics
  async getMetrics(): Promise<any> {
    const response = await api.get('/api/admin/metrics')
    return response.data
  },
  // GET /api/admin/shops
  async getShops(params: { search?: string; page?: number; limit?: number }): Promise<any> {
    const response = await api.get('/api/admin/shops', { params })
    return response.data
  },
  // PUT /api/admin/shops/:shopId/status
  async updateShopStatus(shopId: string, isActive: boolean): Promise<any> {
    const response = await api.put(`/api/admin/shops/${shopId}/status`, { isActive })
    return response.data
  },
}

export default adminService
