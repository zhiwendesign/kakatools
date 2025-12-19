'use client';

import { useState, useEffect, useCallback } from 'react';
import { logout as apiLogout, verifyToken } from '@/lib/api';
import { STORAGE_KEYS } from '@/constants';
import { AccessKeyInfo } from '@/types';
import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  getStorageJSON,
  setStorageJSON,
} from '@/lib/utils';

interface UseStarlightAccessReturn {
  hasAccess: boolean;
  keyInfo: AccessKeyInfo | null;
  isLoading: boolean;
  grantAccess: (token: string, keyInfo: AccessKeyInfo) => void;
  revokeAccess: () => Promise<void>;
}

export function useStarlightAccess(): UseStarlightAccessReturn {
  const [hasAccess, setHasAccess] = useState(false);
  const [keyInfo, setKeyInfo] = useState<AccessKeyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check stored access on mount - verify with backend
  useEffect(() => {
    const checkAccess = async () => {
      const storedToken = getStorageItem(STORAGE_KEYS.STARLIGHT_TOKEN);
      const storedKeyInfo = getStorageJSON<AccessKeyInfo | null>(
        STORAGE_KEYS.STARLIGHT_KEY_INFO,
        null
      );

      if (storedToken && storedKeyInfo) {
        // First check local expiry
        if (storedKeyInfo.expiresAt <= Date.now()) {
          // Key expired locally, clean up
          removeStorageItem(STORAGE_KEYS.STARLIGHT_TOKEN);
          removeStorageItem(STORAGE_KEYS.STARLIGHT_KEY_INFO);
          setIsLoading(false);
          return;
        }

        // Verify token with backend for security
        try {
          const result = await verifyToken(storedToken);
          if (result.success) {
            setHasAccess(true);
            setKeyInfo(storedKeyInfo);
          } else {
            // Token invalid on backend, clean up
            removeStorageItem(STORAGE_KEYS.STARLIGHT_TOKEN);
            removeStorageItem(STORAGE_KEYS.STARLIGHT_KEY_INFO);
          }
        } catch {
          // Network error - allow access based on local data for offline support
          // but this is a security trade-off
          removeStorageItem(STORAGE_KEYS.STARLIGHT_TOKEN);
          removeStorageItem(STORAGE_KEYS.STARLIGHT_KEY_INFO);
        }
      }

      setIsLoading(false);
    };

    checkAccess();
  }, []);

  const grantAccess = useCallback((token: string, info: AccessKeyInfo) => {
    setStorageItem(STORAGE_KEYS.STARLIGHT_TOKEN, token);
    setStorageJSON(STORAGE_KEYS.STARLIGHT_KEY_INFO, info);
    setHasAccess(true);
    setKeyInfo(info);
  }, []);

  const revokeAccess = useCallback(async () => {
    const token = getStorageItem(STORAGE_KEYS.STARLIGHT_TOKEN);

    if (token) {
      try {
        await apiLogout(token);
      } catch (error) {
        console.error('Starlight logout error:', error);
      }
    }

    removeStorageItem(STORAGE_KEYS.STARLIGHT_TOKEN);
    removeStorageItem(STORAGE_KEYS.STARLIGHT_KEY_INFO);
    setHasAccess(false);
    setKeyInfo(null);
  }, []);

  return {
    hasAccess,
    keyInfo,
    isLoading,
    grantAccess,
    revokeAccess,
  };
}

export default useStarlightAccess;

