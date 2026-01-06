'use client';

import { useState, useEffect } from 'react';
import { CategoryType, Filter, FiltersMap, Resource } from '@/types';
import { Button, Icon, Input } from '@/components/ui';
import { DEFAULT_FILTERS } from '@/constants';
import * as XLSX from 'xlsx';

interface ManageFiltersFormProps {
  filters: FiltersMap;
  resources?: Resource[];
  onAddFilter: (category: string, label: string, tag: string) => Promise<void>;
  onDeleteFilter: (category: string, tag: string) => Promise<void>;
  onCancel: () => void;
}

const CATEGORY_OPTIONS: CategoryType[] = ['AiCC', 'UXTips', 'Learning', '星芒学社', '图库'];

export function ManageFiltersForm({ filters, resources = [], onAddFilter, onDeleteFilter, onCancel }: ManageFiltersFormProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryType>('AiCC');
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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
      alert('不能删除 "All" 菜单');
      return;
    }

    if (!window.confirm(`确定要删除菜单 "${tag}" 吗？这可能会影响现有的资源菜单。`)) return;

    setDeletingTag(tag);
    try {
      await onDeleteFilter(activeCategory, tag);
    } catch (error) {
      alert('删除失败');
    } finally {
      setDeletingTag(null);
    }
  };

  const handleExportToExcel = () => {
    setIsExporting(true);
    try {
      // 获取当前分类下的所有资源
      const categoryResources = resources.filter((r) => r.category === activeCategory);

      if (categoryResources.length === 0) {
        alert('当前分类下没有资源，无法导出');
        setIsExporting(false);
        return;
      }

      // 准备Excel数据
      const excelData = categoryResources.map((resource) => {
        return {
          标题: resource.title || '',
          分类: resource.category || '',
          描述: resource.description || '',
          标签: resource.tags ? resource.tags.join(',') : '',
          图片链接: resource.imageUrl || '',
          跳转链接: resource.link || '',
          卡卡推荐: resource.featured ? '是' : '否',
          内容类型: resource.contentType === 'document' ? 'document' : 'link',
          文档内容: resource.content || '',
        };
      });

      // 创建工作表
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '资源列表');

      // 生成文件名
      const fileName = `${activeCategory}_资源列表_${new Date().toISOString().split('T')[0]}.xlsx`;

      // 下载文件
      XLSX.writeFile(workbook, fileName);

      alert(`成功导出 ${categoryResources.length} 条资源到 ${fileName}`);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-surface-highlight px-2 py-1 rounded">
            菜单管理
          </span>
          <h2 className="text-xl font-bold text-primary mt-2">管理菜单</h2>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            disabled={isExporting || resources.filter((r) => r.category === activeCategory).length === 0}
          >
            {isExporting ? (
              <>
                <Icon name="loader" size={16} className="animate-spin" /> 导出中...
              </>
            ) : (
              <>
                <Icon name="download" size={16} /> 导出Excel
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            关闭
          </Button>
        </div>
      </div>

      <div className="space-y-8 max-w-2xl">
        {/* Category Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-primary">选择分类</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium border transition-all
                  ${activeCategory === cat
                    ? cat === '星芒学社'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-primary text-white border-primary/80'
                    : 'bg-white text-secondary border-border hover:border-primary/20'}
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Add New Tag */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-primary">添加新菜单</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1">显示名称</label>
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
                <Icon name="plus" size={16} /> 添加菜单
              </>
            )}
          </Button>
        </div>

        {/* Existing Tags */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-primary">现有菜单 ({currentFilters.length})</label>
          <div className="space-y-2">
            {currentFilters.length === 0 ? (
              <p className="text-sm text-secondary py-4 text-center">该分类暂无菜单</p>
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
            <p>删除菜单可能会影响现有资源卡片的显示。建议先检查哪些资源使用了该菜单。</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageFiltersForm;
