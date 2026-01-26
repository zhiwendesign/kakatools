'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { CategoryType, Filter } from '@/types';
import { CATEGORY_INFO, DEFAULT_FILTERS } from '@/constants';
import { Icon } from '@/components/ui';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  activeCategory: CategoryType;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTagFilter: string;
  setSelectedTagFilter: (tag: string) => void;
  filters: Record<CategoryType, Filter[]>;
  availableTags: string[];
  categorySubtitles?: Record<string, string | null>;
  resources?: any[]; // 添加 resources 用于动态生成菜单
}

export function HeroSection({
  activeCategory,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  selectedTagFilter,
  setSelectedTagFilter,
  filters,
  availableTags,
  categorySubtitles = {},
  resources = [],
}: HeroSectionProps) {
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);
  const tagFilterRef = useRef<HTMLDivElement>(null);
  const categoryInfo = CATEGORY_INFO[activeCategory];
  const allFilters = filters[activeCategory] || DEFAULT_FILTERS[activeCategory] || [];
  
  // 使用配置的副标题，如果没有则使用默认副标题
  const subtitle = categorySubtitles[activeCategory] || categoryInfo.subtitle;

  // 从实际资源中动态获取使用的二级菜单（基于 menu 字段）
  const usedMenus = useMemo(() => {
    const menuSet = new Set<string>();
    resources
      .filter((r) => r.category === activeCategory && r.menu && r.menu.trim() !== '')
      .forEach((r) => menuSet.add(r.menu));
    return Array.from(menuSet);
  }, [resources, activeCategory]);

  // 构建菜单列表：固定显示"全部"和"卡卡推荐"，然后显示实际使用的二级菜单
  const categoryFilters = useMemo(() => {
    // 固定菜单项
    const fixedFilters: Filter[] = [
      { label: '全部', tag: 'All' },
      { label: '卡卡推荐', tag: '卡卡推荐' },
    ];

    // 从实际使用的 menu 值中生成菜单项
    const menuFilters: Filter[] = usedMenus.map((menuTag) => {
      // 从 filters 配置中查找对应的 label
      const filterConfig = allFilters.find((f) => f.tag === menuTag);
      return {
        label: filterConfig?.label || menuTag,
        tag: menuTag,
      };
    });

    // 合并：固定菜单项 + 实际使用的二级菜单
    return [...fixedFilters, ...menuFilters];
  }, [allFilters, usedMenus]);

  // 检查是否有实际使用的二级菜单（除了固定的两个）
  const hasOtherFilters = useMemo(() => {
    return usedMenus.length > 0;
  }, [usedMenus]);

  // 始终显示菜单栏（至少显示"全部"和"卡卡推荐"）
  const shouldShowMenu = true;

  // 点击外部关闭标签筛选器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagFilterRef.current && !tagFilterRef.current.contains(event.target as Node)) {
        setIsTagFilterOpen(false);
      }
    };

    if (isTagFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTagFilterOpen]);

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4" style={{ marginBottom: '48px' }}>
        <div className="space-y-2">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-primary leading-tight">
            {categoryInfo.title}
          </h2>
          <p className="text-sm md:text-base text-secondary/90 leading-relaxed">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className={`flex flex-col md:flex-row items-start md:items-center gap-5 w-full ${shouldShowMenu ? 'justify-between' : 'justify-end'}`}>
        {/* Filter Tabs (Scrollable on Mobile) - 始终显示菜单栏 */}
        {shouldShowMenu && (
          <div className="w-full md:w-auto overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-2.5 min-w-max">
              {categoryFilters.map((filter) => (
                <button
                  key={filter.tag}
                  onClick={() => {
                    setActiveFilter(filter.tag);
                    setSearchQuery('');
                    // 不清除标签筛选，让菜单筛选和标签筛选可以同时使用
                  }}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border backdrop-blur-sm',
                    activeFilter === filter.tag && !searchQuery
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white/90 text-secondary border-border/60 hover:border-primary/30 hover:text-primary hover:bg-white'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Box & Tag Filter */}
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative md:w-40" ref={tagFilterRef}>
            <button
              type="button"
              onClick={() => setIsTagFilterOpen(!isTagFilterOpen)}
              className="w-full bg-white/90 backdrop-blur-sm border border-border/60 focus:bg-white focus:border-primary/40 rounded-lg pl-2 pr-2 py-1.5 text-xs focus:outline-none transition-all text-secondary shadow-sm hover:shadow focus:shadow-md flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Icon
                  name="Filter"
                  size={14}
                  className="text-secondary"
                />
                <span>{selectedTagFilter || '全部标签'}</span>
              </div>
              <Icon
                name={isTagFilterOpen ? "ChevronUp" : "ChevronDown"}
                size={14}
                className="text-secondary"
              />
            </button>
            
            {isTagFilterOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-border/60 shadow-lg z-50 max-h-60 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTagFilter('');
                    setIsTagFilterOpen(false);
                  }}
                  className={cn(
                    "w-full pl-2 pr-2 py-2 text-left text-xs flex items-center gap-2 hover:bg-surface-highlight transition-colors",
                    !selectedTagFilter ? "bg-primary/5 text-primary font-medium" : "text-secondary"
                  )}
                >
                  <Icon
                    name={!selectedTagFilter ? "Check" : "Circle"}
                    size={14}
                    className={!selectedTagFilter ? "text-primary" : "text-transparent"}
                  />
                  <span>全部标签</span>
                </button>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSelectedTagFilter(tag);
                      setIsTagFilterOpen(false);
                    }}
                    className={cn(
                      "w-full pl-2 pr-2 py-2 text-left text-xs flex items-center gap-2 hover:bg-surface-highlight transition-colors",
                      selectedTagFilter === tag ? "bg-primary/5 text-primary font-medium" : "text-secondary"
                    )}
                  >
                    <Icon
                      name={selectedTagFilter === tag ? "Check" : "Circle"}
                      size={14}
                      className={selectedTagFilter === tag ? "text-primary" : "text-transparent"}
                    />
                    <span>{tag}</span>
                  </button>
                ))}
                {availableTags.length === 0 && (
                  <div className="px-2 py-2 text-xs text-secondary/70">暂无标签</div>
                )}
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:w-64 group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <Icon
                name="Search"
                size={14}
                className="text-secondary group-focus-within:text-primary transition-colors"
              />
            </div>
            <input
              type="text"
              placeholder="搜索工具..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) {
                  setActiveFilter('All');
                }
              }}
              className="w-full bg-white/90 backdrop-blur-sm border border-border/60 focus:bg-white focus:border-primary/40 rounded-lg pl-8 pr-10 py-1.5 text-xs focus:outline-none transition-all placeholder:text-secondary/60 shadow-sm hover:shadow focus:shadow-md relative z-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-primary transition-colors"
              >
                <Icon name="X" size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroSection;
