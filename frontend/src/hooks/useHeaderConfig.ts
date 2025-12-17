'use client';

import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, DEFAULT_HEADER_CONFIG } from '@/constants';
import { HeaderConfig } from '@/types';
import { getStorageItem, setStorageItem, removeStorageItem } from '@/lib/utils';

interface UseHeaderConfigReturn {
  headerConfig: HeaderConfig;
  contactImage: string | null;
  cooperationImage: string | null;
  updateHeaderConfig: (updates: Partial<HeaderConfig>) => void;
  saveHeaderConfig: () => void;
  setContactImage: (image: string | null) => void;
  setCooperationImage: (image: string | null) => void;
  saveContactImages: () => void;
}

export function useHeaderConfig(): UseHeaderConfigReturn {
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(DEFAULT_HEADER_CONFIG);
  const [contactImage, setContactImage] = useState<string | null>(null);
  const [cooperationImage, setCooperationImage] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setHeaderConfig({
      avatar: getStorageItem(STORAGE_KEYS.HEADER_AVATAR) || DEFAULT_HEADER_CONFIG.avatar,
      avatarImage: getStorageItem(STORAGE_KEYS.HEADER_AVATAR_IMAGE),
      title: getStorageItem(STORAGE_KEYS.HEADER_TITLE) || DEFAULT_HEADER_CONFIG.title,
    });
    setContactImage(getStorageItem(STORAGE_KEYS.CONTACT_IMAGE));
    setCooperationImage(getStorageItem(STORAGE_KEYS.COOPERATION_IMAGE));
  }, []);

  const updateHeaderConfig = useCallback((updates: Partial<HeaderConfig>) => {
    setHeaderConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const saveHeaderConfig = useCallback(() => {
    setStorageItem(STORAGE_KEYS.HEADER_AVATAR, headerConfig.avatar);
    setStorageItem(STORAGE_KEYS.HEADER_TITLE, headerConfig.title);
    
    if (headerConfig.avatarImage) {
      setStorageItem(STORAGE_KEYS.HEADER_AVATAR_IMAGE, headerConfig.avatarImage);
    } else {
      removeStorageItem(STORAGE_KEYS.HEADER_AVATAR_IMAGE);
    }
  }, [headerConfig]);

  const saveContactImages = useCallback(() => {
    if (contactImage) {
      setStorageItem(STORAGE_KEYS.CONTACT_IMAGE, contactImage);
    } else {
      removeStorageItem(STORAGE_KEYS.CONTACT_IMAGE);
    }

    if (cooperationImage) {
      setStorageItem(STORAGE_KEYS.COOPERATION_IMAGE, cooperationImage);
    } else {
      removeStorageItem(STORAGE_KEYS.COOPERATION_IMAGE);
    }
  }, [contactImage, cooperationImage]);

  return {
    headerConfig,
    contactImage,
    cooperationImage,
    updateHeaderConfig,
    saveHeaderConfig,
    setContactImage,
    setCooperationImage,
    saveContactImages,
  };
}

export default useHeaderConfig;

