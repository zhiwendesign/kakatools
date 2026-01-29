'use client';

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_HEADER_CONFIG } from '@/constants';
import { HeaderConfig } from '@/types';
import { fetchHeaderConfig } from '@/lib/api';

interface UseHeaderConfigReturn {
  headerConfig: HeaderConfig;
  contactImage: string | null;
  cooperationImage: string | null;
  categorySubtitles: Record<string, string | null>;
  updateHeaderConfig: (updates: Partial<HeaderConfig>) => void;
  saveHeaderConfig: () => void;
  setContactImage: (image: string | null) => void;
  setCooperationImage: (image: string | null) => void;
  saveContactImages: () => void;
  isLoading: boolean;
  reloadConfig: () => Promise<void>;
}

export function useHeaderConfig(): UseHeaderConfigReturn {
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(DEFAULT_HEADER_CONFIG);
  const [contactImage, setContactImage] = useState<string | null>(null);
  const [cooperationImage, setCooperationImage] = useState<string | null>(null);
  const [categorySubtitles, setCategorySubtitles] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load from backend API on mount
  const loadConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchHeaderConfig();
      if (response.success && response.config) {
        setHeaderConfig({
          avatar: response.config.avatar || DEFAULT_HEADER_CONFIG.avatar,
          avatarImage: response.config.avatarImage || null,
          title: response.config.title || DEFAULT_HEADER_CONFIG.title,
        });
        setContactImage(response.config.contactImage || null);
        setCooperationImage(response.config.cooperationImage || null);
        setCategorySubtitles(response.config.categorySubtitles || {});
      }
    } catch (error) {
      console.error('Failed to load header config:', error);
      // 失败时使用默认配置
      setHeaderConfig(DEFAULT_HEADER_CONFIG);
      setContactImage(null);
      setCooperationImage(null);
      setCategorySubtitles({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    
    // 监听配置更新事件
    const handleConfigUpdate = () => {
      loadConfig();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('headerConfigUpdated', handleConfigUpdate);
      return () => {
        window.removeEventListener('headerConfigUpdated', handleConfigUpdate);
      };
    }
  }, [loadConfig]);

  const updateHeaderConfig = useCallback((updates: Partial<HeaderConfig>) => {
    setHeaderConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const saveHeaderConfig = useCallback(() => {
    // 这个方法现在只用于本地状态更新，实际保存由 HeaderConfig 组件调用 API
    // 保留此方法以保持接口兼容性
  }, []);

  const saveContactImages = useCallback(() => {
    // 这个方法现在只用于本地状态更新，实际保存由 HeaderConfig 组件调用 API
    // 保留此方法以保持接口兼容性
  }, [contactImage, cooperationImage]);

  return {
    headerConfig,
    contactImage,
    cooperationImage,
    categorySubtitles,
    updateHeaderConfig,
    saveHeaderConfig,
    setContactImage,
    setCooperationImage,
    saveContactImages,
    isLoading,
    reloadConfig: loadConfig,
  };
}

export default useHeaderConfig;

