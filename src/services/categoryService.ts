import api from './api'

const categoryService = {
  // GET /api/categories
  async getCategories(): Promise<any> {
    const response = await api.get('/api/categories')
    return response.data
  },

  // POST /api/categories
  async createCategory(data: {
    name: string
    description?: string
    sortOrder?: number
  }): Promise<any> {
    const response = await api.post('/api/categories', data)
    return response.data
  },

  // PUT /api/categories/:categoryId
  async updateCategory(
    categoryId: string,
    data: { name?: string; description?: string; sortOrder?: number },
  ): Promise<any> {
    const response = await api.put(`/api/categories/${categoryId}`, data)
    return response.data
  },

  // DELETE /api/categories/:categoryId
  async deleteCategory(categoryId: string): Promise<any> {
    const response = await api.delete(`/api/categories/${categoryId}`)
    return response.data
  },

  // PUT /api/categories/reorder
  async reorderCategories(categories: { categoryId: string; sortOrder: number }[]): Promise<any> {
    const response = await api.put('/api/categories/reorder', { categories })
    return response.data
  },
}

export default categoryService
