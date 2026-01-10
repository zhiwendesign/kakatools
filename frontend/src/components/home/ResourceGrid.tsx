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
  activeCategory?: string;
  percentage?: number;
}

export function ResourceGrid({
  resources,
  isLoading,
  error,
  activeFilter,
  onClearFilters,
  activeCategory,
  percentage,
}: ResourceGridProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-secondary text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span>数据加载中...</span>
        </div>
      </div>
    );
  }

  // Error state (only show if we have an error and no resources)
  if (error && resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border/60 rounded-xl bg-white/60 backdrop-blur-sm">
        <div className="p-4 bg-surface rounded-full mb-4 shadow-sm">
          <Icon name="AlertCircle" size={24} className="text-red-500/50" />
        </div>
        <p className="text-secondary text-sm font-medium text-center mb-2">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-xs text-primary underline underline-offset-4 hover:text-accent"
        >
          刷新页面
        </button>
      </div>
    );
  }

  // Empty state
  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border/60 rounded-xl bg-white/60 backdrop-blur-sm">
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
            : '没有找到匹配的资源'}
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
  // 显示百分比提示：当 percentage 有值且小于 100 时显示（适用于星芒学社和图库）
  const showPercentageTip = percentage !== undefined && percentage < 100;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {resources.map((item) => (
          <ResourceCard key={item.id} item={item} />
        ))}
      </div>
      
      {/* 可见度提示（星芒学社和图库） */}
      {showPercentageTip && (
        <div className="mt-10 flex flex-col items-center justify-center py-6 px-6 border border-dashed border-border/60 rounded-xl bg-white/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-surface rounded-full">
              <Icon name="Info" size={18} className="text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-secondary font-medium">当前可见内容</span>
              <span className="text-xl font-bold text-primary">{percentage}%</span>
            </div>
          </div>
          <p className="text-sm text-secondary text-center leading-relaxed">
            如需学习更多，<span className="text-primary font-medium">请联系管理员卡卡</span>
          </p>
        </div>
      )}
    </>
  );
}

export default ResourceGrid;

