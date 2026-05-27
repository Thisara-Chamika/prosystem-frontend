import api from './api'
import type { ApiResponse, Shop } from '../types'

const shopService = {
  // GET /api/shops/me
  async getShop(): Promise<ApiResponse<Shop>> {
    const response = await api.get('/api/shops/me')
    return response.data
  },

  // PUT /api/shops/business-type
  async setBusinessType(businessType: string): Promise<ApiResponse<Shop>> {
    const response = await api.put('/api/shops/business-type', { businessType })
    return response.data
  },

  // GET /api/shops/available-plugins
  async getAvailablePlugins(): Promise<any> {
    const response = await api.get('/api/shops/available-plugins')
    return response.data
  },

  // PUT /api/shops/plugins
  async togglePlugin(plugin: string, action: 'add' | 'remove'): Promise<any> {
    const response = await api.put('/api/shops/plugins', { plugin, action })
    return response.data
  },

  // PUT /api/shops/configuration
  async updateConfiguration(data: {
    primaryColor?: string
    currency?: string
    timezone?: string
    logoUrl?: string
  }): Promise<ApiResponse<Shop>> {
    const response = await api.put('/api/shops/configuration', data)
    return response.data
  },

  // POST /api/shops/complete-onboarding
  async completeOnboarding(): Promise<ApiResponse<Shop>> {
    const response = await api.post('/api/shops/complete-onboarding', {})
    return response.data
  },
  // GET /api/shops/settings
  async getSettings(): Promise<any> {
    const response = await api.get('/api/shops/settings')
    return response.data
  },

  // PUT /api/shops/settings
  async updateSettings(data: {
    name?: string
    currency?: string
    timezone?: string
    configuration?: {
      primaryColor?: string
      logoUrl?: string | null
    }
  }): Promise<any> {
    const response = await api.put('/api/shops/settings', data)
    return response.data
  },
}

export default shopService
