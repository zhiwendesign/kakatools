'use client';

import { useState } from 'react';
import { CategoryType, FiltersMap, Resource } from '@/types';
import { Button, Icon } from '@/components/ui';
import { cn } from '@/lib/utils';
import TagDictionary from './TagDictionary';
import ManageFiltersForm from './ManageFiltersForm';

interface CategoryManagerProps {
    filters: FiltersMap;
    tagDictionary: FiltersMap;
    resources: Resource[];
    onAddFilter: (category: string, label: string, tag: string) => Promise<void>;
    onDeleteFilter: (category: string, tag: string) => Promise<void>;
    onAddTag: (category: string, label: string, tag: string) => Promise<void>;
    onDeleteTag: (category: string, tag: string) => Promise<void>;
    mode: 'menu' | 'tags';
}

const CATEGORY_OPTIONS: CategoryType[] = ['AIGC', 'UXTips', 'Learning', '星芒学社', '图库'];

export function CategoryManager({
    filters,
    tagDictionary,
    resources,
    onAddFilter,
    onDeleteFilter,
    onAddTag,
    onDeleteTag,
    mode
}: CategoryManagerProps) {
    const [activeTab, setActiveTab] = useState<CategoryType>('AIGC');

    return (
        <div className="animate-fade-in bg-white rounded-2xl border border-border/60 overflow-hidden shadow-sm">
            {/* Container Header */}
            <div className="p-8 pb-0 border-b border-border/40 bg-surface/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-1.5 bg-primary/10 rounded-lg">
                                <Icon name={mode === 'menu' ? "Filter" : "BookOpen"} size={18} className="text-primary" />
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                                {mode === 'menu' ? 'Menu Configuration' : 'Discovery'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-primary tracking-tight">
                            {mode === 'menu' ? '菜单导航设计' : '智能标签发现'}
                        </h2>
                        <p className="text-sm text-secondary mt-1 font-medium opacity-60">
                            {mode === 'menu'
                                ? '管理全站各分类的导航菜单项与过滤器'
                                : '扫描资源卡片，同步更新全站标签库'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border border-border/40 shadow-sm">
                        {CATEGORY_OPTIONS.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveTab(cat)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300",
                                    activeTab === cat
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "text-secondary hover:text-primary hover:bg-surface"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-8 min-h-[500px]">
                {mode === 'menu' ? (
                    <ManageFiltersForm
                        activeCategory={activeTab}
                        filters={filters}
                        resources={resources}
                        onAddFilter={onAddFilter}
                        onDeleteFilter={onDeleteFilter}
                    />
                ) : (
                    <TagDictionary
                        activeCategory={activeTab}
                        resources={resources}
                        tagDictionary={tagDictionary}
                        onAddTag={onAddTag}
                        onDeleteTag={onDeleteTag}
                    />
                )}
            </div>
        </div>
    );
}
