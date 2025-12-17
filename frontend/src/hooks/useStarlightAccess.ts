'use client';

import { useState, useEffect, useCallback } from 'react';
import { logout as apiLogout } from '@/lib/api';
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
  grantAccess: (token: string, keyInfo: AccessKeyInfo) => void;
  revokeAccess: () => Promise<void>;
}

export function useStarlightAccess(): UseStarlightAccessReturn {
  const [hasAccess, setHasAccess] = useState(false);
  const [keyInfo, setKeyInfo] = useState<AccessKeyInfo | null>(null);

  // Check stored access on mount
  useEffect(() => {
    const storedToken = getStorageItem(STORAGE_KEYS.STARLIGHT_TOKEN);
    const storedKeyInfo = getStorageJSON<AccessKeyInfo | null>(
      STORAGE_KEYS.STARLIGHT_KEY_INFO,
      null
    );

    if (storedToken && storedKeyInfo) {
      // Check if key is still valid
      if (storedKeyInfo.expiresAt > Date.now()) {
        setHasAccess(true);
        setKeyInfo(storedKeyInfo);
      } else {
        // Key expired, clean up
        removeStorageItem(STORAGE_KEYS.STARLIGHT_TOKEN);
        removeStorageItem(STORAGE_KEYS.STARLIGHT_KEY_INFO);
      }
    }
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
    grantAccess,
    revokeAccess,
  };
}

export default useStarlightAccess;

