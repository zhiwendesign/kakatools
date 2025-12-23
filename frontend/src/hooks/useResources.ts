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
    isAuthenticated: boolean
  ) => Resource[];
  getAvailableTags: (
    category: CategoryType,
    activeFilter: string
  ) => string[];
}

export function useResources(options?: UseResourcesOptions): UseResourcesReturn {
  const { authToken } = options || {};
  const [resources, setResources] = useState<Resource[]>([]);
  const [filters, setFilters] = useState<FiltersMap>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data function
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const categoriesToLoad: CategoryType[] = [...CATEGORIES];
      const data = await fetchAllCategoriesData(categoriesToLoad, authToken);

      const mergedResources: Resource[] = [];
      const mergedFilters: FiltersMap = { ...DEFAULT_FILTERS };

      Object.entries(data).forEach(([category, categoryData]) => {
        const cat = category as CategoryType;
        
        // Ensure categoryData has the expected structure
        if (!categoryData || typeof categoryData !== 'object') {
          console.warn(`Invalid data for category ${cat}:`, categoryData);
          return;
        }

        const resources = categoryData.resources || [];
        const categoryFilters = categoryData.filters || [];
        
        // Add resources with category
        resources.forEach((resource) => {
          if (resource && resource.id) {
            mergedResources.push({
              ...resource,
              category: cat, // Ensure category is set correctly
            });
          } else {
            console.warn(`Invalid resource in category ${cat}:`, resource);
          }
        });

        // Merge filters
        if (categoryFilters.length > 0) {
          mergedFilters[cat] = categoryFilters;
        }
      });

      console.log(`Loaded ${mergedResources.length} resources across ${Object.keys(data).length} categories`);
      setResources(mergedResources);
      setFilters(mergedFilters);
      setError(null);
    } catch (err) {
      console.error('Failed to load resources:', err);
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
      isAuthenticated: boolean
    ): Resource[] => {
      // Learning is admin-only
      if (category === 'Learning' && !isAuthenticated) {
        return [];
      }
      
      // First, filter by category
      let items = resources.filter((item) => item.category === category);

      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[getFilteredResources] Category: ${category}, Total resources: ${resources.length}, Category resources: ${items.length}`);
      }

      // Apply button filter (activeFilter)
      if (activeFilter !== 'All') {
        if (activeFilter === '卡卡推荐') {
          items = items.filter((item) => item.featured === true);
        } else {
          items = items.filter((item) =>
            item.tags.some((t) => t === activeFilter || t.includes(activeFilter))
          );
        }
        if (process.env.NODE_ENV === 'development') {
          console.log(`[getFilteredResources] After activeFilter "${activeFilter}": ${items.length} items`);
        }
      }

      // Apply tag filter from dropdown (additional refinement)
      if (tagFilter && tagFilter !== 'All') {
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
    (category: CategoryType, activeFilter: string): string[] => {
      let categoryResources = resources.filter(
        (item) => item.category === category
      );

      if (activeFilter !== 'All' && activeFilter !== '卡卡推荐') {
        categoryResources = categoryResources.filter((item) =>
          item.tags.some((t) => t === activeFilter || t.includes(activeFilter))
        );
      } else if (activeFilter === '卡卡推荐') {
        categoryResources = categoryResources.filter((item) => item.featured === true);
      }

      const tagSet = new Set<string>();
      categoryResources.forEach((item) => {
        item.tags.forEach((tag) => tagSet.add(tag));
      });

      const configuredFilters = (filters[category] || []).map((f) => f.tag);
      configuredFilters
        .filter((t) => t !== 'All' && t !== '卡卡推荐')
        .forEach((t) => tagSet.add(t));

      return Array.from(tagSet).sort();
    },
    [resources, filters]
  );

  // Reload data from server
  const reload = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    resources,
    filters,
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
