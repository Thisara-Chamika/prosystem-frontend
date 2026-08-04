import api from './api'

const paymentService = {
  async createIntent(amount: number): Promise<any> {
    const response = await api.post('/api/payments/create-intent', { amount })
    return response.data
  },
}

export default paymentService
