import { apiClient } from './client';
import { User, AuthResponse } from '../types';

export const authApi = {
  register: async (email: string, password: string, name: string, role: string) => {
    try {
      console.log('📤 Register request:', { email, name, role });
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      const payload = {
        email,
        password,
        firstName,
        lastName: lastName || firstName,
        role,
      };

      console.log('📤 Registration Payload:', JSON.stringify(payload, null, 2));

      const response = await apiClient.post<any>('/auth/register', payload);
      console.log('📥 Register response:', response.data);
      // Backend returns data directly, not wrapped
      const data = response.data.data || response.data;
      return {
        user: data.user || data,
        tokens: data.tokens || { accessToken: data.accessToken, refreshToken: data.refreshToken },
      };
    } catch (error) {
      console.error('Register API error:', error);
      throw error;
    }
  },

  login: async (email: string, password: string) => {
    try {
      console.log('📤 Login request:', { email });
      const response = await apiClient.post<any>('/auth/login', {
        email,
        password,
      });
      console.log('📥 Login response:', response.data);

      // Backend returns data directly, not wrapped
      const data = response.data.data || response.data;
      console.log('📦 Extracted data:', {
        hasUser: !!data.user,
        hasTokens: !!data.tokens,
        hasAccessToken: !!data.accessToken,
        hasRefreshToken: !!data.refreshToken,
      });

      return {
        user: data.user || data,
        tokens: data.tokens || { accessToken: data.accessToken, refreshToken: data.refreshToken },
      };
    } catch (error) {
      console.error('Login API error:', error);
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      console.log('📤 Get current user request');
      const response = await apiClient.get<any>('/auth/me');
      console.log('📥 Get current user response:', response.data);
      // Backend returns data directly, not wrapped
      return response.data.data || response.data;
    } catch (error) {
      console.error('Get current user API error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      console.log('📤 Logout request');
      await apiClient.clearTokens();
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('Logout API error:', error);
      throw error;
    }
  },

  updateProfile: async (data: { firstName?: string; lastName?: string; phoneNumber?: string; fcmToken?: string }) => {
    try {
      const response = await apiClient.put<User>('/auth/me', data);
      return response.data;
    } catch (error) {
      console.error('Update profile API error:', error);
      throw error;
    }
  },
};
