import api from './api'
import type { ApiResponse, LoginRequest, LoginResponse, Manager, User } from '../types'

const authService = {
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await api.post<ApiResponse<LoginResponse>>('/api/auth/login', credentials)
    return response.data
  },

  async getMe(): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>('/api/auth/me')
    return response.data
  },

  logout(): void {
    localStorage.removeItem('token')
  },

  // POST /api/auth/register
  async register(data: {
    shopName: string
    shopSlug: string
    firstName: string
    lastName: string
    email: string
    password: string
    currency?: string
    timezone?: string
  }): Promise<ApiResponse<LoginResponse>> {
    const response = await api.post<ApiResponse<LoginResponse>>('/api/auth/register', data)
    return response.data
  },

  // POST /api/auth/verify-manager-pin
  async verifyManagerPin(pin: string): Promise<
    ApiResponse<{
      userId: string
      firstName: string
      lastName: string
      role: string
    }>
  > {
    const response = await api.post('/api/auth/verify-manager-pin', { pin })
    return response.data
  },

  // GET /api/auth/managers
  async getManagers(): Promise<ApiResponse<Manager[]>> {
    const response = await api.get('/api/auth/managers')
    return response.data
  },

  // PUT /api/auth/profile
  async updateProfile(data: {
    firstName?: string
    lastName?: string
    phone?: string
  }): Promise<ApiResponse<User>> {
    const response = await api.put('/api/auth/profile', data)
    return response.data
  },

  // PUT /api/auth/password
  async changePassword(data: {
    currentPassword: string
    newPassword: string
  }): Promise<ApiResponse<null>> {
    const response = await api.put('/api/auth/password', data)
    return response.data
  },

  // PUT /api/auth/manager-pin
  async setManagerPin(pin: string): Promise<ApiResponse<null>> {
    const response = await api.put('/api/auth/manager-pin', { pin })
    return response.data
  },
}

export default authService
