import { api, apiUtils } from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  profile_picture?: string | null;
  is_admin: boolean;
  is_approved: boolean;
  last_ip?: string;
  created_at?: string;
  updated_at?: string;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  token: string;
  user: User;
  needsPhoneVerification?: boolean;
}

interface CurrentUserResponse {
  success: boolean;
  message?: string;
  user: User;
}

export const authService = {
  // Login user
  async login(credentials: { email: string; password: string }): Promise<{ user: User; token: string; needsPhoneVerification?: boolean }> {
    try {
      console.log('🔐 Attempting login with:', { email: credentials.email, passwordLength: credentials.password.length });
      
      
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      
      if (response && response.token && response.user) {
        // Store token and user data
        apiUtils.setAuthToken(response.token);
        apiUtils.setUserData(response.user);
        
        // Store phone verification status
        if (response.needsPhoneVerification) {
          sessionStorage.setItem('needsPhoneVerification', 'true');
        } else {
          sessionStorage.removeItem('needsPhoneVerification');
        }
        
        console.log('👤 Login successful for user:', response.user.name, 'needsPhone:', response.needsPhoneVerification);
        return {
          user: response.user,
          token: response.token,
          needsPhoneVerification: response.needsPhoneVerification
        };
      }
      
      console.error('❌ Login failed - invalid response structure:', response);
      throw new Error('Login failed');
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint to invalidate session and set ban
      await api.post('/auth/logout', {});
      console.log('👋 Logout API call successful');
    } catch (error) {
      console.error('❌ Logout API error (continuing with local logout):', error);
    } finally {
      // Always clear local auth data even if API call fails
      apiUtils.removeAuthToken();
      console.log('👋 User logged out locally');
    }
  },

  // Get current user info
  async getCurrentUser(): Promise<User | null> {
    try {
      // First check localStorage for user data to avoid unnecessary API calls
      const cachedUser = apiUtils.getUserData();
      if (cachedUser) {
        console.log('👤 Using cached user data');
        return cachedUser;
      }
      
      console.log('🔍 Fetching current user from API');
      const response = await api.get<CurrentUserResponse>('/auth/me');
      
      if (response && response.success && response.user) {
        // Cache the user data
        apiUtils.setUserData(response.user);
        return response.user;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching current user:', error);
      // Clear potentially invalid token on error
      apiUtils.removeAuthToken();
      return null;
    }
  },

  // Register user
  async register(userData: { name: string; email: string; phone?: string; password: string }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post<{ success: boolean; message: string }>('/auth/register', userData);
      return {
        success: response.success,
        message: response.message || 'Registration successful'
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  }
};