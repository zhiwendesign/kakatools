'use client';

import { Resource, FiltersMap, CategoryType } from '@/types';
import { Icon } from '@/components/ui';
import { cn } from '@/lib/utils';

interface ConfigCardProps {
    item?: Resource;
    tagDictionary?: FiltersMap;
    isPlaceholder?: boolean;
    onClick?: () => void;
    onDelete?: (id: string, e: React.MouseEvent) => void;
    isActive?: boolean;
}

export function ConfigCard({ item, tagDictionary, isPlaceholder, onClick, onDelete, isActive }: ConfigCardProps) {
    if (isPlaceholder) {
        return (
            <div
                onClick={onClick}
                className="group relative aspect-[4/3] rounded-2xl border-2 border-dashed border-border/60 bg-white/50 hover:bg-white hover:border-primary/40 transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
            >
                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name="Plus" size={24} className="text-secondary group-hover:text-primary" />
                </div>
                <span className="text-sm font-medium text-secondary group-hover:text-primary">新增卡片</span>
            </div>
        );
    }

    if (!item) return null;

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden hover:shadow-xl hover:shadow-primary/5",
                isActive ? "border-primary shadow-lg shadow-primary/5" : "border-border/60"
            )}
        >
            {/* Card Image */}
            <div className="aspect-video relative overflow-hidden bg-surface">
                {item.imageUrl ? (
                    <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Icon name="Image" size={32} className="text-secondary/20" />
                    </div>
                )}

                {/* Featured Star */}
                {item.featured && (
                    <div className="absolute top-3 right-3 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm">
                        <Icon name="Star" size={14} className="text-amber-500 fill-amber-500" />
                    </div>
                )}
            </div>

            {/* Card Info */}
            <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-primary truncate flex-1 leading-tight">{item.title}</h3>
                    <button
                        onClick={(e) => onDelete?.(item.id, e)}
                        className="p-1.5 text-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="删除"
                    >
                        <Icon name="Trash" size={14} />
                    </button>
                </div>
                <p className="text-xs text-secondary line-clamp-2 leading-relaxed min-h-[2.5em]">
                    {item.description || "暂无描述内容"}
                </p>

                {/* Tags Preview */}
                <div className="mt-3 flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((tag, idx) => {
                        const registeredTags = tagDictionary?.[item.category as CategoryType] || [];
                        const dictionaryEntry = registeredTags.find((f: any) => f.tag === tag);
                        const displayLabel = dictionaryEntry ? dictionaryEntry.label : tag;
                        return (
                            <span key={idx} className="px-1.5 py-0.5 bg-surfaceHighlight/50 border border-border/40 rounded text-[9px] text-secondary/70">
                                {displayLabel}
                            </span>
                        );
                    })}
                    {item.tags.length > 2 && (
                        <span className="text-[9px] text-secondary/50">+{item.tags.length - 2}</span>
                    )}
                </div>
            </div>

            {/* Active Indicator Overlay */}
            {isActive && (
                <div className="absolute inset-0 border-2 border-primary rounded-2xl pointer-events-none" />
            )}
        </div>
    );
}
