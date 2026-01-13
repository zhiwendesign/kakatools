'use client';

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
}: HeroSectionProps) {
  const categoryInfo = CATEGORY_INFO[activeCategory];
  const categoryFilters = filters[activeCategory] || DEFAULT_FILTERS[activeCategory] || [];
  
  // 使用配置的副标题，如果没有则使用默认副标题
  const subtitle = categorySubtitles[activeCategory] || categoryInfo.subtitle;

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4" style={{ marginBottom: '48px' }}>
        <div className="space-y-2">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-primary leading-tight">
            {categoryInfo.title}
          </h2>
          <p className="text-sm md:text-base text-secondary/90 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 w-full">
        {/* Filter Tabs (Scrollable on Mobile) */}
        <div className="w-full md:w-auto overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex gap-2.5 min-w-max">
            {categoryFilters.map((filter) => (
              <button
                key={filter.tag}
                onClick={() => {
                  setActiveFilter(filter.tag);
                  setSearchQuery('');
                  setSelectedTagFilter('');
                }}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border backdrop-blur-sm',
                  activeFilter === filter.tag && !searchQuery && !selectedTagFilter
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white/90 text-secondary border-border/60 hover:border-primary/30 hover:text-primary hover:bg-white'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Box & Tag Filter */}
        <div className="flex gap-3 w-full md:w-auto">
          {/* Tag Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedTagFilter}
              onChange={(e) => {
                setSelectedTagFilter(e.target.value);
                setActiveFilter('All');
              }}
              className="bg-white/90 backdrop-blur-sm border border-border/60 focus:bg-white focus:border-primary/40 rounded-lg pl-3 pr-7 py-1.5 text-xs focus:outline-none transition-all appearance-none cursor-pointer text-secondary hover:text-primary min-w-[120px] shadow-sm hover:shadow"
            >
              <option value="">全部标签</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon name="ChevronDown" size={12} className="text-secondary" />
            </div>
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

