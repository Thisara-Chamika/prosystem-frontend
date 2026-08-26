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
  // GET /api/admin/support-tickets
  async getTickets(status?: string): Promise<any> {
    const response = await api.get('/api/admin/support-tickets', {
      params: status ? { status } : {},
    })
    return response.data
  },
  // GET /api/admin/support-tickets/:ticketId
  async getTicket(ticketId: string): Promise<any> {
    const response = await api.get(`/api/admin/support-tickets/${ticketId}`)
    return response.data
  },
  // POST /api/admin/support-tickets/:ticketId/messages
  async sendMessage(ticketId: string, message: string): Promise<any> {
    const response = await api.post(`/api/admin/support-tickets/${ticketId}/messages`, { message })
    return response.data
  },
  // PUT /api/admin/support-tickets/:ticketId/status
  async updateTicketStatus(ticketId: string, status: string): Promise<any> {
    const response = await api.put(`/api/admin/support-tickets/${ticketId}/status`, { status })
    return response.data
  },
}

export default adminService
