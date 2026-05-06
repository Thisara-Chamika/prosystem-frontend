import api from './api'
import type { ApiResponse, Staff, CreateStaffRequest, UpdateStaffRequest } from '../types'

const staffService = {
  // GET /api/staff
  async getStaff(params?: {
    role?: 'shop_manager' | 'cashier'
    isActive?: boolean
    page?: number
    limit?: number
  }): Promise<any> {
    const response = await api.get('/api/staff', { params })
    return response.data
  },

  // GET /api/staff/:staffId
  async getStaffMember(staffId: string): Promise<ApiResponse<Staff>> {
    const response = await api.get(`/api/staff/${staffId}`)
    return response.data
  },

  // POST /api/staff
  async createStaff(data: CreateStaffRequest): Promise<ApiResponse<Staff>> {
    const response = await api.post('/api/staff', data)
    return response.data
  },

  // PUT /api/staff/:staffId
  async updateStaff(staffId: string, data: UpdateStaffRequest): Promise<ApiResponse<Staff>> {
    const response = await api.put(`/api/staff/${staffId}`, data)
    return response.data
  },

  // DELETE /api/staff/:staffId
  async deleteStaff(staffId: string): Promise<ApiResponse<null>> {
    const response = await api.delete(`/api/staff/${staffId}`)
    return response.data
  },
}

export default staffService
