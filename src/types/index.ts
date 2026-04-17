// API response wrapper - matches your backend's response format
// { success: true, message: '...', data: {...} }
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

// The logged-in user's info
export interface User {
  userId: string
  shopId: string
  email: string
  firstName: string
  lastName: string
  role: 'super_admin' | 'shop_owner' | 'shop_manager' | 'cashier'
}

// What we send TO the backend when logging in
export interface LoginRequest {
  email: string
  password: string
}

// What we get BACK from the backend after login
export interface LoginResponse {
  token: string
  user: User
}
