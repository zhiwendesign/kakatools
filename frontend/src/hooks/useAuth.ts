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

  // Check stored token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = getStorageItem(STORAGE_KEYS.AUTH_TOKEN);
      console.log('[useAuth] Checking stored token:', storedToken ? `${storedToken.substring(0, 8)}...` : 'none');
      
      if (storedToken) {
        try {
          console.log('[useAuth] Verifying token with backend...');
          const result = await verifyToken(storedToken);
          console.log('[useAuth] Verify result:', result);
          
          if (result.success) {
            setToken(storedToken);
            setIsAuthenticated(true);
            console.log('[useAuth] Token verified successfully');
          } else {
            console.log('[useAuth] Token invalid, removing from storage');
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
    console.log('[useAuth] Login called with token:', newToken.substring(0, 8) + '...');
    setStorageItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    console.log('[useAuth] Token stored and state updated');
  }, []);

  const logout = useCallback(async () => {
    const currentToken = getStorageItem(STORAGE_KEYS.AUTH_TOKEN);
    
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

