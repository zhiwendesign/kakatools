'use client';

import { useState, useEffect, useCallback } from 'react';
import { verifyToken, logout as apiLogout } from '@/lib/api';
import { STORAGE_KEYS } from '@/constants';
import { getStorageItem, setStorageItem, removeStorageItem } from '@/lib/utils';

interface UseAuthReturn {
  isAuthenticated: boolean;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check stored token on mount - only once
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = getStorageItem(STORAGE_KEYS.AUTH_TOKEN, true);
      
      if (storedToken) {
        try {
          const result = await verifyToken(storedToken);
          
          if (result.success) {
            setToken(storedToken);
            setIsAuthenticated(true);
          } else {
            removeStorageItem(STORAGE_KEYS.AUTH_TOKEN);
          }
        } catch (error) {
          console.error('[useAuth] Token verification error:', error);
          removeStorageItem(STORAGE_KEYS.AUTH_TOKEN);
        }
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = useCallback((newToken: string) => {
    setToken(newToken);
    setIsAuthenticated(true);
    
    // 保存令牌到 localStorage（异步处理，不阻塞 UI）
    try {
      setStorageItem(STORAGE_KEYS.AUTH_TOKEN, newToken, true);
    } catch (error) {
      console.error('Failed to save token to storage:', error);
      // 令牌保存失败不影响登录状态，用户刷新页面后会重新登录
    }
  }, []);

  const logout = useCallback(async () => {
    const currentToken = getStorageItem(STORAGE_KEYS.AUTH_TOKEN, true);
    
    if (currentToken) {
      try {
        await apiLogout(currentToken);
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    removeStorageItem(STORAGE_KEYS.AUTH_TOKEN);
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  return {
    isAuthenticated,
    token,
    isLoading,
    login,
    logout,
  };
}

export default useAuth;

