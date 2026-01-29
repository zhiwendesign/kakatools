'use client';

import { useState, useEffect, useCallback } from 'react';
import { logout as apiLogout, verifyAccessKey } from '@/lib/api';
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

  // Check stored access on mount - verify with backend - only once
  useEffect(() => {
    const checkAccess = async () => {
      const storedToken = getStorageItem(STORAGE_KEYS.STARLIGHT_TOKEN, true);
      const storedKeyInfo = getStorageJSON<AccessKeyInfo | null>(
        STORAGE_KEYS.STARLIGHT_KEY_INFO,
        null,
        true
      );

      if (storedToken && storedKeyInfo) {
        // First check local expiry
        if (storedKeyInfo.expiresAt <= Date.now()) {
          // Key expired locally, clean up
          removeStorageItem(STORAGE_KEYS.STARLIGHT_TOKEN);
          removeStorageItem(STORAGE_KEYS.STARLIGHT_KEY_INFO);
        } else {
          // Don't verify with backend - use local storage data
          // This prevents infinite loops and reduces server load
          setHasAccess(true);
          setKeyInfo(storedKeyInfo);
        }
      }

      setIsLoading(false);
    };

    checkAccess();
  }, []);

  const grantAccess = useCallback((token: string, info: AccessKeyInfo) => {
    setStorageItem(STORAGE_KEYS.STARLIGHT_TOKEN, token, true);
    setStorageJSON(STORAGE_KEYS.STARLIGHT_KEY_INFO, info, true);
    setHasAccess(true);
    setKeyInfo(info);
  }, []);

  const revokeAccess = useCallback(async () => {
    const token = getStorageItem(STORAGE_KEYS.STARLIGHT_TOKEN, true);

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

