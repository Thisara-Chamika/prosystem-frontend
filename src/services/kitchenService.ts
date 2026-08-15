import api from './api'

const kitchenService = {
  async getQueue(): Promise<any> {
    const response = await api.get('/api/plugins/kitchen-display/queue')
    return response.data
  },

  async updateItemStatus(orderItemId: string, status: 'ready' | 'served'): Promise<any> {
    const response = await api.patch(`/api/plugins/kitchen-display/items/${orderItemId}/status`, {
      status,
    })
    return response.data
  },
}

export default kitchenService
