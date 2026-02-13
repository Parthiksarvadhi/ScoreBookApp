import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  console.log('📍 Environment API URL:', envUrl);
  console.log('📱 Platform:', Platform.OS);

  if (envUrl) {
    console.log('✅ Using environment URL:', envUrl);
    return envUrl;
  }

  // Default based on platform - use your PC IP
  const PC_IP = '192.168.2.31';

  if (Platform.OS === 'android') {
    console.log('📱 Android detected, using PC IP:', PC_IP);
    return `http://${PC_IP}:3000`;
  }

  if (Platform.OS === 'ios') {
    console.log('📱 iOS detected, using PC IP:', PC_IP);
    return `http://${PC_IP}:3000`;
  }

  console.log('📱 Web detected, using localhost');
  return 'http://localhost:3000';
};

export const API_BASE_URL = getBaseUrl();
console.log('🌐 Final API Base URL:', API_BASE_URL);

class ApiClient {
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });

    console.log('🌐 API Client initialized with base URL:', API_BASE_URL);

    this.client.interceptors.request.use(
      async (config) => {
        const token = await SecureStore.getItemAsync('accessToken');
        console.log('📤 Request to:', config.url);
        console.log('🌐 Full URL:', (config.baseURL || '') + (config.url || ''));
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('🔑 Token added to request:', token.substring(0, 20) + '...');
        } else {
          console.log('⚠️ No token found in secure storage');
        }
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log('✅ Response received:', response.status, response.config.url);
        if (response.config.url?.includes('live-score')) {
          console.log('🔍 Live-score response keys:', Object.keys(response.data || {}).join(', '));
          console.log('🔍 Has status?', 'status' in (response.data || {}));
          console.log('🔍 Has teams?', 'teams' in (response.data || {}));
          console.log('🔍 Has scorecards?', 'scorecards' in (response.data || {}));
        }
        return response;
      },
      async (error: AxiosError) => {
        console.error('❌ Response error:', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
          data: error.response?.data,
        });

        const originalRequest = error.config as any;

        // Don't retry refresh endpoint itself to avoid infinite loops
        if (error.config?.url?.includes('/auth/refresh') || error.config?.url?.includes('/auth/login')) {
          console.error('❌ Auth endpoint failed, clearing tokens');
          await this.clearTokens();
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            await this.clearTokens();
            throw refreshError;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.client.post('/auth/refresh', {
        refreshToken,
      });

      // Backend returns { accessToken } directly, not wrapped in data
      const accessToken = response.data.accessToken;
      await SecureStore.setItemAsync('accessToken', accessToken);
      return accessToken;
    })();

    try {
      return await this.refreshTokenPromise;
    } finally {
      this.refreshTokenPromise = null;
    }
  }

  async setTokens(accessToken: string, refreshToken: string) {
    try {
      console.log('💾 Storing tokens in secure storage');
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      console.log('✅ Tokens stored successfully');
    } catch (error) {
      console.error('❌ Error storing tokens:', error);
      throw error;
    }
  }

  async clearTokens() {
    try {
      console.log('🗑️ Clearing tokens from secure storage');
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      console.log('✅ Tokens cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing tokens:', error);
      throw error;
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      console.log('🔑 Retrieved access token:', token ? 'exists' : 'not found');
      return token;
    } catch (error) {
      console.error('❌ Error retrieving access token:', error);
      return null;
    }
  }

  get<T>(url: string, config?: any) {
    return this.client.get<T>(url, config);
  }

  post<T>(url: string, data?: any, config?: any) {
    return this.client.post<T>(url, data, config);
  }

  put<T>(url: string, data?: any, config?: any) {
    return this.client.put<T>(url, data, config);
  }

  patch<T>(url: string, data?: any, config?: any) {
    return this.client.patch<T>(url, data, config);
  }

  delete<T>(url: string, config?: any) {
    return this.client.delete<T>(url, config);
  }

  // Helper to access the base URL from outside
  get baseUrl() {
    return this.client.defaults.baseURL;
  }

  // Public wrapper for getAccessToken to be used by other modules
  async getToken() {
    return this.getAccessToken();
  }
}

export const apiClient = new ApiClient();
