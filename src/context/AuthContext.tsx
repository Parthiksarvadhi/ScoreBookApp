import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthTokens } from '../types';
import { authApi } from '../api/auth';
import { apiClient } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { firstName?: string; lastName?: string; phoneNumber?: string; fcmToken?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      console.log('🚀 Bootstrapping auth...');
      const token = await apiClient.getAccessToken();
      if (token) {
        console.log('🔑 Found existing token, fetching user...');
        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
          console.log('✅ User restored:', currentUser.email);
        } catch (error) {
          console.warn('⚠️ Token invalid or expired, clearing...');
          await apiClient.clearTokens();
        }
      } else {
        console.log('ℹ️ No existing token found');
      }
    } catch (error) {
      console.error('❌ Failed to restore token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext: Starting login...');
      const { user: userData, tokens } = await authApi.login(email, password);
      console.log('✅ AuthContext: Login successful');
      console.log('📦 Tokens received:', {
        accessToken: tokens.accessToken?.substring(0, 20) + '...',
        refreshToken: tokens.refreshToken?.substring(0, 20) + '...',
      });
      await apiClient.setTokens(tokens.accessToken, tokens.refreshToken);
      console.log('✅ AuthContext: Tokens stored, setting user...');
      setUser(userData);
      console.log('✅ AuthContext: User set, login complete');
    } catch (error) {
      console.error('❌ AuthContext: Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    try {
      const { user: userData, tokens } = await authApi.register(email, password, name, role);
      await apiClient.setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const updateProfile = async (data: { firstName?: string; lastName?: string; phoneNumber?: string; fcmToken?: string }) => {
    try {
      const updatedUser = await authApi.updateProfile(data);
      setUser(updatedUser);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isSignedIn: !!user,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
