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
}: HeroSectionProps) {
  const categoryInfo = CATEGORY_INFO[activeCategory];
  const categoryFilters = filters[activeCategory] || DEFAULT_FILTERS[activeCategory] || [];

  return (
    <div className="mb-12 border-b border-border pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="space-y-4">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-primary whitespace-nowrap">
            {categoryInfo.title}
          </h2>
          <p className="text-sm md:text-base text-secondary max-w-2xl mx-auto leading-relaxed animate-slide-up">
            {categoryInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
        {/* Filter Tabs (Scrollable on Mobile) */}
        <div className="w-full md:w-auto overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex gap-2 min-w-max">
            {categoryFilters.map((filter) => (
              <button
                key={filter.tag}
                onClick={() => {
                  setActiveFilter(filter.tag);
                  setSearchQuery('');
                  setSelectedTagFilter('');
                }}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 border',
                  activeFilter === filter.tag && !searchQuery && !selectedTagFilter
                    ? 'bg-primary text-white border-primary shadow-md'
                    : 'bg-white text-secondary border-border hover:border-accent hover:text-primary'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Box & Tag Filter */}
        <div className="flex gap-2 w-full md:w-auto">
          {/* Tag Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedTagFilter}
              onChange={(e) => {
                setSelectedTagFilter(e.target.value);
                setActiveFilter('All');
              }}
              className="bg-surfaceHighlight border border-transparent focus:bg-white focus:border-border rounded-full pl-4 pr-8 py-2 text-xs focus:outline-none transition-all appearance-none cursor-pointer text-secondary hover:text-primary min-w-[120px]"
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
            <Icon
              name="Search"
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-primary transition-colors"
            />
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
              className="w-full bg-surfaceHighlight border border-transparent focus:bg-white focus:border-border rounded-full pl-9 pr-4 py-2 text-xs focus:outline-none transition-all placeholder:text-secondary/70"
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

