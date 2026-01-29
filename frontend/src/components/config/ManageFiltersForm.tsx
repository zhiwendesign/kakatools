'use client';

import { useState, useEffect } from 'react';
import { CategoryType, Filter, FiltersMap, Resource } from '@/types';
import { Button, Icon, Input, ConfirmDialog, useToast } from '@/components/ui';
import { DEFAULT_FILTERS } from '@/constants';
import * as XLSX from 'xlsx';

interface ManageFiltersFormProps {
  activeCategory: CategoryType;
  filters: FiltersMap;
  resources: Resource[];
  onAddFilter: (category: string, label: string, tag: string) => Promise<void>;
  onDeleteFilter: (category: string, tag: string) => Promise<void>;
}

export function ManageFiltersForm({ activeCategory, filters, resources, onAddFilter, onDeleteFilter }: ManageFiltersFormProps) {
  const [newTagLabel, setNewTagLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ tag: string; label: string } | null>(null);
  const toast = useToast();

  const currentFilters = (filters[activeCategory] || DEFAULT_FILTERS[activeCategory] || []).filter(
    (f: Filter) => f.tag !== 'All' && f.tag !== '卡卡推荐'
  );

  const tagUsageMap: Record<string, number> = resources
    .filter((r: Resource) => r.category === activeCategory && r.menu)
    .reduce((acc: Record<string, number>, r: Resource) => {
      const menuTag = r.menu;
      if (menuTag) {
        acc[menuTag] = (acc[menuTag] || 0) + 1;
      }
      return acc;
    }, {});

  const unusedFilters = currentFilters.filter((f) => (tagUsageMap[f.tag] || 0) === 0);

  const handleAddTag = async () => {
    if (!newTagLabel.trim()) return;

    const proposedTag = newTagLabel.trim();
    const existing = currentFilters.find((f: Filter) => f.tag === proposedTag);
    if (existing) {
      toast.warning('该菜单值已存在');
      return;
    }

    setIsAdding(true);
    try {
      await onAddFilter(activeCategory, newTagLabel.trim(), proposedTag);
      // 等待一小段时间确保数据已刷新
      await new Promise(resolve => setTimeout(resolve, 100));
      setNewTagLabel('');
      toast.success(`菜单项 "${proposedTag}" 已成功添加`);
    } catch (error: any) {
      const msg = error?.message ? String(error.message) : '添加失败，请稍后重试';
      toast.error(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteClick = (filter: Filter) => {
    if (filter.tag === 'All') {
      toast.error('不能删除 "All" 菜单');
      return;
    }
    if (filter.tag === '卡卡推荐') {
      toast.error('不能删除系统默认的"卡卡推荐"菜单');
      return;
    }

    setConfirmDelete({ tag: filter.tag, label: filter.label });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;

    setDeletingTag(confirmDelete.tag);
    try {
      await onDeleteFilter(activeCategory, confirmDelete.tag.trim());
      // 等待一小段时间确保数据已刷新
      await new Promise(resolve => setTimeout(resolve, 100));
      toast.success(`菜单项 "${confirmDelete.label}" 已删除`);
      setConfirmDelete(null);
    } catch (error) {
      toast.error('删除失败，请稍后重试');
    } finally {
      setDeletingTag(null);
    }
  };

  const handleBulkDeleteUnused = async () => {
    if (unusedFilters.length === 0) {
      toast.warning('没有未使用的菜单项');
      return;
    }
    const names = unusedFilters.map(f => f.label).join('、');
    if (!window.confirm(`确定批量删除以下未使用菜单项吗？\n${names}`)) return;
    for (const f of unusedFilters) {
      setDeletingTag(f.tag);
      try {
        await onDeleteFilter(activeCategory, f.tag.trim());
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.warn('批量删除失败', f.tag, e);
      }
    }
    setDeletingTag(null);
    toast.success('未使用菜单项已批量清理');
  };

  return (
    <>
      <div className="space-y-8 animate-fade-in px-2">
        <div className="space-y-4">
          <label className="text-sm font-bold text-primary flex items-center gap-2">
            <Icon name="Plus" size={16} className="text-primary" />
            添加新菜单项
          </label>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary ml-1">显示名称</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  value={newTagLabel}
                  onChange={(e) => setNewTagLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTagLabel.trim() && !isAdding) {
                      handleAddTag();
                    }
                  }}
                  placeholder="如：图像生成"
                  className="pl-9 bg-surface/50 border-border/40 focus:bg-white transition-all shadow-sm h-10"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
                  <Icon name="Type" size={14} />
                </div>
              </div>
              <Button
                onClick={handleAddTag}
                disabled={!newTagLabel.trim() || isAdding}
                className="h-10 btn-gradient px-4 rounded-xl font-medium active:scale-[0.98]"
              >
                {isAdding ? (
                  <>
                    <Icon name="loader" size={16} className="animate-spin" />
                    创建中...
                  </>
                ) : (
                  '创建菜单项'
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-border/40">
          <label className="text-sm font-bold text-primary flex items-center justify-between">
            <span>现有菜单列表 ({currentFilters.length})</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-normal text-secondary opacity-60 italic">点击垃圾桶图标即可删除</span>
              <Button
                variant="outline"
                onClick={handleBulkDeleteUnused}
                disabled={unusedFilters.length === 0}
                className="h-8 px-3 text-xs rounded-lg"
              >
                清理未使用菜单 ({unusedFilters.length})
              </Button>
            </div>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentFilters.length === 0 ? (
              <div className="col-span-full py-12 text-center text-secondary bg-surface/30 rounded-2xl border border-dashed border-border/40">
                <Icon name="Box" size={32} className="mx-auto mb-2 opacity-10" />
                <p className="text-sm italic">当前分类暂无菜单</p>
              </div>
            ) : (
              currentFilters.map((filter: Filter) => (
                <div
                  key={filter.tag}
                  className="group flex items-center justify-between p-3.5 bg-white rounded-xl border border-border/40 hover:border-primary/20 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-primary">{filter.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-secondary font-mono tracking-tight">{filter.tag}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface/50 border border-border/40 text-secondary">
                        使用量 {tagUsageMap[filter.tag] || 0}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteClick(filter)}
                    disabled={deletingTag === filter.tag}
                    className="p-2 text-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
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

          <div className="flex items-start gap-3 p-4 bg-amber-50/40 rounded-2xl border border-amber-100/50 mt-4">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <Icon name="AlertTriangle" size={14} className="text-amber-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-800">重要提示</h4>
              <p className="text-[11px] leading-relaxed text-amber-700/80">
                删除菜单项将导致前端顶部导航对应标签消失。关联到此菜单的资源卡片将失去该筛选项。建议在删除前先清理相关资源的归类。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
        title="确认删除菜单项"
        message={
          confirmDelete ? (
            <div className="space-y-2">
              <p>
                确定要删除菜单 <span className="font-bold text-primary">"{confirmDelete.label}"</span> 吗？
              </p>
              <p className="text-xs text-secondary">
                这可能会影响现有的资源菜单，删除后无法恢复。
              </p>
            </div>
          ) : (
            ''
          )
        }
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
        isLoading={!!deletingTag}
      />
    </>
  );
}

export default ManageFiltersForm;
