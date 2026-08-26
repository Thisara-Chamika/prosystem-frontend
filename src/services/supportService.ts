import api from './api'

const supportService = {
  // GET /api/support-tickets
  async getTickets(): Promise<any> {
    const response = await api.get('/api/support-tickets')
    return response.data
  },
  // POST /api/support-tickets
  async createTicket(subject: string, message: string): Promise<any> {
    const response = await api.post('/api/support-tickets', { subject, message })
    return response.data
  },
  // GET /api/support-tickets/:ticketId
  async getTicket(ticketId: string): Promise<any> {
    const response = await api.get(`/api/support-tickets/${ticketId}`)
    return response.data
  },
  // POST /api/support-tickets/:ticketId/messages
  async sendMessage(ticketId: string, message: string): Promise<any> {
    const response = await api.post(`/api/support-tickets/${ticketId}/messages`, { message })
    return response.data
  },
}

export default supportService
