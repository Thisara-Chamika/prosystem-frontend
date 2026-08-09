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
}

export default tableService
