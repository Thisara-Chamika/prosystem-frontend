import api from './api'

const pluginService = {
  // GET /api/plugins
  async getPlugins(): Promise<any> {
    const response = await api.get('/api/plugins')
    return response.data
  },

  // POST /api/plugins/:pluginId/install
  async installPlugin(pluginId: string): Promise<any> {
    const response = await api.post(`/api/plugins/${pluginId}/install`)
    return response.data
  },

  // DELETE /api/plugins/:pluginId/uninstall
  async uninstallPlugin(pluginId: string): Promise<any> {
    const response = await api.delete(`/api/plugins/${pluginId}/uninstall`)
    return response.data
  },

  // GET /api/plugins/:pluginId/config
  async getPluginConfig(pluginId: string): Promise<any> {
    const response = await api.get(`/api/plugins/${pluginId}/config`)
    return response.data
  },

  // PUT /api/plugins/:pluginId/config
  async updatePluginConfig(pluginId: string, configuration: any): Promise<any> {
    const response = await api.put(`/api/plugins/${pluginId}/config`, { configuration })
    return response.data
  },

  // GET /api/plugins/fashion/products/:productId/variants
  async getVariants(productId: string): Promise<any> {
    const response = await api.get(`/api/plugins/product-variants/products/${productId}/variants`)
    return response.data
  },

  // GET /api/plugins/fashion/products/:productId/variants/available
  async getAvailableVariants(productId: string): Promise<any> {
    const response = await api.get(
      `/api/plugins/product-variants/products/${productId}/variants/available`,
    )
    return response.data
  },

  // POST /api/plugins/fashion/products/:productId/variants
  async createVariant(
    productId: string,
    data: {
      customAttributes: Record<string, string>
      quantity: number
      skuVariant: string
      priceAdjustment: number
    },
  ): Promise<any> {
    const response = await api.post(
      `/api/plugins/product-variants/products/${productId}/variants`,
      data,
    )
    return response.data
  },

  // PUT /api/plugins/fashion/variants/:variantId
  async updateVariant(
    variantId: string,
    data: {
      customAttributes?: Record<string, string>
      quantity?: number
      priceAdjustment?: number
    },
  ): Promise<any> {
    const response = await api.put(`/api/plugins/product-variants/variants/${variantId}`, data)
    return response.data
  },

  // DELETE /api/plugins/fashion/variants/:variantId
  async deleteVariant(variantId: string): Promise<any> {
    const response = await api.delete(`/api/plugins/product-variants/variants/${variantId}`)
    return response.data
  },
}

export default pluginService
