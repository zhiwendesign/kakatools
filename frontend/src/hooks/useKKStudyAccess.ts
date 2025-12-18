'use client';

import { useState, useEffect, useCallback } from 'react';
import { verifyAccessKey } from '@/lib/api';
import { STORAGE_KEYS } from '@/constants';
import { getStorageItem, setStorageItem, removeStorageItem } from '@/lib/utils';

interface KeyInfo {
  code: string;
  username: string;
  createdAt: number;
  expiresAt: number;
}

export function useKKStudyAccess() {
  const [hasAccess, setHasAccess] = useState(false);
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Check for stored key info on mount
  useEffect(() => {
    const keyInfoJson = getStorageItem(STORAGE_KEYS.KKSTUDY_KEY_INFO);
    const token = getStorageItem(STORAGE_KEYS.KKSTUDY_TOKEN);
    
    if (keyInfoJson) {
      try {
        const parsedInfo = JSON.parse(keyInfoJson);
        setKeyInfo(parsedInfo);
        setHasAccess(!!token && parsedInfo.expiresAt > Date.now());
      } catch (error) {
        console.error('Failed to parse key info:', error);
        // Clear invalid storage items
        removeStorageItem(STORAGE_KEYS.KKSTUDY_KEY_INFO);
        removeStorageItem(STORAGE_KEYS.KKSTUDY_TOKEN);
      }
    }
  }, []);
  
  const verifyKey = useCallback(async (code: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await verifyAccessKey(code);
      
      if (result.success && result.key) {
        const keyInfo = {
          code: result.key.code,
          username: result.key.username,
          createdAt: result.key.createdAt,
          expiresAt: result.key.expiresAt,
        };
        
        setStorageItem(STORAGE_KEYS.KKSTUDY_KEY_INFO, JSON.stringify(keyInfo));
        setStorageItem(STORAGE_KEYS.KKSTUDY_TOKEN, code);
        setKeyInfo(keyInfo);
        setHasAccess(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Key verification error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const logout = useCallback(() => {
    removeStorageItem(STORAGE_KEYS.KKSTUDY_KEY_INFO);
    removeStorageItem(STORAGE_KEYS.KKSTUDY_TOKEN);
    setHasAccess(false);
    setKeyInfo(null);
  }, []);
  
  return {
    hasAccess,
    keyInfo,
    isLoading,
    verifyKey,
    logout,
  };
}

export default useKKStudyAccess;