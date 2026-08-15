import api from './api'

const tableService = {
  async getTables(): Promise<any> {
    const response = await api.get('/api/plugins/table-management/tables')
    return response.data
  },

  async startOrder(tableId: string, customerId?: string): Promise<any> {
    const response = await api.post(
      `/api/plugins/table-management/tables/${tableId}/order`,
      customerId ? { customerId } : {},
    )
    return response.data
  },

  async updateTableStatus(tableId: string, status: string): Promise<any> {
    const response = await api.put(`/api/plugins/table-management/tables/${tableId}`, { status })
    return response.data
  },

  async getOrder(tableId: string): Promise<any> {
    const response = await api.get(`/api/plugins/table-management/tables/${tableId}/order`)
    return response.data
  },

  async addOrderItem(
    orderId: string,
    data: { productId: string; quantity: number; specialRequests?: string },
  ): Promise<any> {
    const response = await api.post(`/api/plugins/table-management/orders/${orderId}/items`, data)
    return response.data
  },

  async removeOrderItem(orderId: string, orderItemId: string): Promise<any> {
    const response = await api.delete(
      `/api/plugins/table-management/orders/${orderId}/items/${orderItemId}`,
    )
    return response.data
  },

  async sendToKitchen(orderId: string): Promise<any> {
    const response = await api.patch(
      `/api/plugins/table-management/orders/${orderId}/send-to-kitchen`,
      {},
    )
    return response.data
  },

  async checkoutOrder(
    orderId: string,
    data: {
      paymentMethod: 'cash' | 'card' | 'online' | 'mixed'
      stripePaymentIntentId?: string
      discount?: number
      splitCount?: number
    },
  ): Promise<any> {
    const response = await api.post(
      `/api/plugins/table-management/orders/${orderId}/checkout`,
      data,
    )
    return response.data
  },
}

export default tableService
