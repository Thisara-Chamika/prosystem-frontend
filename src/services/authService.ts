import api from './api'
import type { ApiResponse, LoginRequest, LoginResponse, User } from '../types'

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
}

export default authService
