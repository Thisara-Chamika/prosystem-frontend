import api from './api'

const loyaltyService = {
  // GET /api/customers/:customerId/profile
  async getCustomerProfile(customerId: string): Promise<any> {
    const response = await api.get(`/api/customers/${customerId}/profile`)
    return response.data
  },

  // GET /api/customers/:customerId/loyalty
  async getCustomerLoyalty(customerId: string): Promise<any> {
    const response = await api.get(`/api/customers/${customerId}/loyalty`)
    return response.data
  },

  // GET /api/loyalty/settings
  async getLoyaltySettings(): Promise<any> {
    const response = await api.get('/api/loyalty/settings')
    return response.data
  },

  // PUT /api/loyalty/settings
  async updateLoyaltySettings(data: {
    isEnabled?: boolean
    pointsPer100?: number
    pointsToRedeem?: number
    redeemValue?: number
    silverThreshold?: number
    goldThreshold?: number
  }): Promise<any> {
    const response = await api.put('/api/loyalty/settings', data)
    return response.data
  },

  // POST /api/loyalty/redeem
  async redeemPoints(customerId: string, pointsToRedeem: number): Promise<any> {
    const response = await api.post('/api/loyalty/redeem', { customerId, pointsToRedeem })
    return response.data
  },
}

export default loyaltyService
