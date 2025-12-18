'use client';

import { useState, useEffect } from 'react';
import { CategoryType, Filter, FiltersMap } from '@/types';
import { Button, Icon, Input } from '@/components/ui';
import { DEFAULT_FILTERS } from '@/constants';

interface ManageFiltersFormProps {
  activeCategory: CategoryType;
  filters: FiltersMap;
  onAddFilter: (category: string, label: string, tag: string) => Promise<void>;
  onDeleteFilter: (category: string, tag: string) => Promise<void>;
  onCancel: () => void;
}

export function ManageFiltersForm({ activeCategory, filters, onAddFilter, onDeleteFilter, onCancel }: ManageFiltersFormProps) {
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingTag, setDeletingTag] = useState<string | null>(null);

  const currentFilters = (filters[activeCategory] || DEFAULT_FILTERS[activeCategory] || []).filter(
    (f: Filter) => f.tag !== 'All'
  );

  const handleAddTag = async () => {
    if (!newTagLabel.trim() || !newTagValue.trim()) return;

    const existing = currentFilters.find((f: Filter) => f.tag === newTagValue.trim());
    if (existing) {
      alert('该菜单值已存在');
      return;
    }

    setIsAdding(true);
    try {
      await onAddFilter(activeCategory, newTagLabel.trim(), newTagValue.trim());
      setNewTagLabel('');
      setNewTagValue('');
    } catch (error) {
      alert('添加失败');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteTag = async (tag: string) => {
    if (tag === 'All') {
      alert('不能删除 "All" 菜单项');
      return;
    }

    if (!window.confirm(`确定要删除菜单项 "${tag}" 吗？这可能会影响现有的资源标签。`)) return;

    setDeletingTag(tag);
    try {
      await onDeleteFilter(activeCategory, tag);
    } catch (error) {
      alert('删除失败');
    } finally {
      setDeletingTag(null);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-surface-highlight px-2 py-1 rounded">
            二级菜单管理
          </span>
          <h2 className="text-xl font-bold text-primary mt-2">管理二级菜单</h2>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          关闭
        </Button>
      </div>

      <div className="space-y-8 max-w-2xl">

        {/* Add New Tag */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-primary">添加菜单项</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1">菜单名称</label>
              <Input
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
                placeholder="如：图像生成"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">菜单值</label>
              <Input
                value={newTagValue}
                onChange={(e) => setNewTagValue(e.target.value)}
                placeholder="如：Image Gen"
              />
            </div>
          </div>
          <Button
            onClick={handleAddTag}
            disabled={!newTagLabel.trim() || !newTagValue.trim() || isAdding}
            className="bg-green-600 hover:bg-green-700"
          >
            {isAdding ? '添加中...' : (
              <>
                <Icon name="plus" size={16} /> 添加标签
              </>
            )}
          </Button>
        </div>

        {/* Existing Tags */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-primary">现有菜单项 ({currentFilters.length})</label>
          <div className="space-y-2">
            {currentFilters.length === 0 ? (
              <p className="text-sm text-secondary py-4 text-center">该分类暂无过滤标签</p>
            ) : (
              currentFilters.map((filter: Filter) => (
                <div
                  key={filter.tag}
                  className="flex items-center justify-between p-3 bg-surface-highlight rounded-lg border border-border/50"
                >
                  <div>
                    <span className="text-sm font-medium text-primary">{filter.label}</span>
                    <span className="text-xs text-secondary ml-2">({filter.tag})</span>
                  </div>
                  <button
                    onClick={() => handleDeleteTag(filter.tag)}
                    disabled={deletingTag === filter.tag}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="删除"
                  >
                    {deletingTag === filter.tag ? (
                      <Icon name="loader" size={14} className="animate-spin" />
                    ) : (
                      <Icon name="trash" size={14} />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex items-start gap-2 text-[11px] text-secondary bg-amber-50/50 p-3 rounded-lg">
            <Icon name="alertTriangle" size={14} className="text-amber-500 mt-0.5" />
            <p>删除菜单项可能会影响现有资源卡片的显示。建议先检查哪些资源使用了该菜单项。</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageFiltersForm;
