'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchAllCategoriesData } from '@/lib/api';
import { DEFAULT_FILTERS } from '@/constants';
import {
  Resource,
  Filter,
  CategoryType,
  FiltersMap,
  CATEGORIES,
} from '@/types';
import { filterResources, sortResources } from '@/lib/utils';

interface UseResourcesOptions {
  authToken?: string | null;
}

interface UseResourcesReturn {
  resources: Resource[];
  filters: FiltersMap;
  tagDictionary: FiltersMap;
  isLoading: boolean;
  error: string | null;
  // Actions
  updateResource: (id: string, updates: Partial<Resource>) => void;
  addResource: (resource: Omit<Resource, 'id'> | Resource) => void;
  deleteResource: (id: string) => void;
  setFilters: (filters: FiltersMap) => void;
  reload: () => Promise<void>;
  // Filtered data
  getFilteredResources: (
    category: CategoryType,
    activeFilter: string,
    searchQuery: string,
    tagFilter: string,
    isAuthenticated: boolean,
    percentage?: number
  ) => Resource[];
  getAvailableTags: (
    category: CategoryType,
    activeFilter: string,
    searchQuery: string,
    isAuthenticated: boolean,
    percentage?: number
  ) => string[];
}

export function useResources(options?: UseResourcesOptions): UseResourcesReturn {
  const { authToken } = options || {};
  const [resources, setResources] = useState<Resource[]>([]);
  const [filters, setFilters] = useState<FiltersMap>(DEFAULT_FILTERS);
  const [tagDictionary, setTagDictionary] = useState<FiltersMap>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data function
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const categoriesToLoad: CategoryType[] = [...CATEGORIES];
      console.log('[useResources] Loading data with authToken:', authToken ? 'present' : 'none');
      const data = await fetchAllCategoriesData(categoriesToLoad, authToken);

      const mergedResources: Resource[] = [];
      const mergedFilters: FiltersMap = { ...DEFAULT_FILTERS };
      const mergedTagDictionary: FiltersMap = { ...DEFAULT_FILTERS };

      Object.entries(data).forEach(([category, categoryData]) => {
        const cat = category as CategoryType;

        // Ensure categoryData has the expected structure
        if (!categoryData || typeof categoryData !== 'object') {
          console.warn(`Invalid data for category ${cat}:`, categoryData);
          return;
        }

        const resources = categoryData.resources || [];
        const categoryFilters = categoryData.filters || [];
        const categoryTagDict = categoryData.tagDictionary || [];

        // Add resources with category
        resources.forEach((resource) => {
          if (resource && resource.id) {
            mergedResources.push({
              ...resource,
              category: cat, // Ensure category is set correctly
              menu: resource.menu || '', // Ensure menu is never undefined
            });
          } else {
            console.warn(`Invalid resource in category ${cat}:`, resource);
          }
        });

        // Merge filters
        if (categoryFilters.length > 0) {
          mergedFilters[cat] = categoryFilters;
        }

        // Merge tag dictionary
        if (categoryTagDict.length > 0) {
          mergedTagDictionary[cat] = categoryTagDict;
        }
      });

      console.log(`[useResources] Loaded ${mergedResources.length} resources across ${Object.keys(data).length} categories`);
      setResources(mergedResources);
      setFilters(mergedFilters);
      setTagDictionary(mergedTagDictionary);
      setError(null);
    } catch (err) {
      console.error('[useResources] Failed to load resources:', err);
      setError('资源数据加载失败，请刷新页面重试');
      // Keep existing resources if available, don't clear them on error
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  // Load data on mount and when auth token changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Resource actions
  const updateResource = useCallback((id: string, updates: Partial<Resource>) => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  const addResource = useCallback((resource: Omit<Resource, 'id'> | Resource) => {
    const newResource: Resource = 'id' in resource && resource.id
      ? resource as Resource
      : {
        ...resource,
        id: Date.now().toString(),
      };
    setResources((prev) => [...prev, newResource]);
  }, []);

  const deleteResource = useCallback((id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Get filtered resources
  const getFilteredResources = useCallback(
    (
      category: CategoryType,
      activeFilter: string,
      searchQuery: string,
      tagFilter: string,
      isAuthenticated: boolean,
      percentage?: number
    ): Resource[] => {
      // Learning is admin-only
      if (category === 'Learning' && !isAuthenticated) {
        return [];
      }

      // First, filter by category
      let items = resources.filter((item) => item.category === category);

      // Apply percentage limit for percentage-controlled categories (星芒学社 and 图库)
      // Note: AIGC and UXTips always pass undefined (100% visible)
      // Only 星芒学社 and 图库 can have percentage restrictions
      if (percentage !== undefined && percentage < 100) {
        const totalCount = items.length;
        const visibleCount = Math.ceil((totalCount * percentage) / 100);
        // 保持排序，只取前 visibleCount 个
        items = items.slice(0, visibleCount);
        if (process.env.NODE_ENV === 'development') {
          console.log(`[getFilteredResources] ${category} percentage filter: ${totalCount} total, ${visibleCount} visible (${percentage}%)`);
        }
      }

      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[getFilteredResources] Category: ${category}, Total resources: ${resources.length}, Category resources: ${items.length}`);
      }

      // Apply button filter (activeFilter) - 处理菜单筛选（基于 menu 字段）
      // 菜单按钮处理"全部"、"卡卡推荐"和二级菜单筛选
      if (activeFilter !== 'All') {
        if (activeFilter === '卡卡推荐') {
          items = items.filter((item) => item.featured === true);
        } else {
          // 二级菜单筛选：根据资源的 menu 字段筛选
          items = items.filter((item) => item.menu === activeFilter);
        }
        if (process.env.NODE_ENV === 'development') {
          console.log(`[getFilteredResources] After activeFilter "${activeFilter}": ${items.length} items`);
        }
      }

      // Apply tag filter - 标签筛选器只筛选资源的tags，不影响菜单
      if (tagFilter && tagFilter !== 'All' && tagFilter !== '') {
        const beforeCount = items.length;
        items = items.filter((item) =>
          item.tags.some((t) => t === tagFilter)
        );
        if (process.env.NODE_ENV === 'development') {
          console.log(`[getFilteredResources] After tagFilter "${tagFilter}": ${items.length} items (was ${beforeCount})`);
        }
      }

      // Apply search query
      if (searchQuery && searchQuery.trim()) {
        const beforeCount = items.length;
        items = filterResources(items, searchQuery);
        if (process.env.NODE_ENV === 'development') {
          console.log(`[getFilteredResources] After searchQuery "${searchQuery}": ${items.length} items (was ${beforeCount})`);
        }
      }

      // Sort: featured first, then alphabetically
      const sorted = sortResources(items);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[getFilteredResources] Final result: ${sorted.length} items`);
      }
      return sorted;
    },
    [resources]
  );

  // Get available tags for current filter state
  const getAvailableTags = useCallback(
    (
      category: CategoryType,
      activeFilter: string,
      searchQuery: string,
      isAuthenticated: boolean,
      percentage?: number
    ): string[] => {
      // 基于“当前可见的资源”计算可用标签：应用分类、菜单、百分比与搜索，但不应用标签筛选
      const visibleResources = getFilteredResources(
        category,
        'All',
        searchQuery,
        '', // 不使用标签筛选
        isAuthenticated,
        percentage
      );

      const tagSet = new Set<string>();
      visibleResources.forEach((item) => {
        item.tags.forEach((tag) => {
          const trimmed = (tag || '').trim();
          if (trimmed) tagSet.add(trimmed);
        });
      });

      return Array.from(tagSet).sort();
    },
    [resources, getFilteredResources]
  );

  // Reload data from server
  const reload = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    resources,
    filters,
    tagDictionary,
    isLoading,
    error,
    updateResource,
    addResource,
    deleteResource,
    setFilters,
    reload,
    getFilteredResources,
    getAvailableTags,
  };
}

export default useResources;
