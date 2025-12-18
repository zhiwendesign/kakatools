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
  addResource: (resource: Omit<Resource, 'id'>) => void;
  deleteResource: (id: string) => void;
  setFilters: (filters: FiltersMap) => void;
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

  // Load data on mount and when auth token changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const categoriesToLoad: CategoryType[] = [...CATEGORIES];
        const data = await fetchAllCategoriesData(categoriesToLoad, authToken);

        const mergedResources: Resource[] = [];
        const mergedFilters: FiltersMap = { ...DEFAULT_FILTERS };

        Object.entries(data).forEach(([category, categoryData]) => {
          const cat = category as CategoryType;
          
          // Add resources with category
          categoryData.resources.forEach((resource) => {
            mergedResources.push({
              ...resource,
              category: cat,
            });
          });

          // Merge filters
          if (categoryData.filters.length > 0) {
            mergedFilters[cat] = categoryData.filters;
          }
        });

        setResources(mergedResources);
        setFilters(mergedFilters);
        setError(null);
      } catch (err) {
        console.error('Failed to load resources:', err);
        setError('资源数据加载失败，已使用内置默认数据');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [authToken]);

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
      
      let items = resources.filter((item) => item.category === category);

      // Apply tag filter from dropdown
      if (tagFilter) {
        items = items.filter((item) =>
          item.tags.some((t) => t === tagFilter)
        );
      } else if (activeFilter !== 'All' && !searchQuery) {
        // Apply button filter
        if (activeFilter === '卡卡推荐') {
          items = items.filter((item) => item.featured === true);
        } else {
          items = items.filter((item) =>
            item.tags.some((t) => t === activeFilter || t.includes(activeFilter))
          );
        }
      }

      // Apply search
      if (searchQuery) {
        items = filterResources(items, searchQuery);
      }

      // Sort: featured first, then alphabetically
      return sortResources(items);
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

  return {
    resources,
    filters,
    isLoading,
    error,
    updateResource,
    addResource,
    deleteResource,
    setFilters,
    getFilteredResources,
    getAvailableTags,
  };
}

export default useResources;
