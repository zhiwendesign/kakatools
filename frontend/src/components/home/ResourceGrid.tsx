'use client';

import { Resource } from '@/types';
import { ResourceCard } from '@/components/cards';
import { Icon } from '@/components/ui';

interface ResourceGridProps {
  resources: Resource[];
  isLoading: boolean;
  error: string | null;
  activeFilter: string;
  onClearFilters: () => void;
}

export function ResourceGrid({
  resources,
  isLoading,
  error,
  activeFilter,
  onClearFilters,
}: ResourceGridProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-secondary text-sm">
        数据加载中...
      </div>
    );
  }

  // Empty state
  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 border border-dashed border-border rounded-2xl bg-surfaceHighlight/30">
        <div className="p-4 bg-surface rounded-full mb-4 shadow-sm">
          {activeFilter === '卡卡推荐' ? (
            <Icon name="Star" size={24} className="text-amber-500/50" />
          ) : (
            <Icon name="Search" size={24} className="text-secondary/50" />
          )}
        </div>
        <p className="text-secondary text-sm font-medium text-center">
          {activeFilter === '卡卡推荐'
            ? '当前分类暂无卡卡推荐资源'
            : error || '没有找到匹配的资源。'}
        </p>
        <button
          onClick={onClearFilters}
          className="mt-2 text-xs text-primary underline underline-offset-4 hover:text-accent"
        >
          清除所有过滤器
        </button>
      </div>
    );
  }

  // Resource grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
      {resources.map((item) => (
        <ResourceCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export default ResourceGrid;

