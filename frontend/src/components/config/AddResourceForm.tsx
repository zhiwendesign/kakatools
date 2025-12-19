'use client';

import { useState, useMemo } from 'react';
import { CategoryType, Filter, FiltersMap } from '@/types';
import { Button, Icon, Input } from '@/components/ui';
import { DEFAULT_FILTERS, CATEGORY_INFO } from '@/constants';

interface AddResourceFormProps {
  filters: FiltersMap;
  onSave: (resource: {
    id: string;
    title: string;
    description: string;
    category: CategoryType;
    tags: string[];
    imageUrl: string;
    link: string;
    featured: boolean;
  }) => Promise<void>;
  onCancel: () => void;
}

const CATEGORY_OPTIONS: CategoryType[] = ['AiCC', 'UXLib', 'Learning', 'Starlight Academy'];

export function AddResourceForm({ filters, onSave, onCancel }: AddResourceFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    link: '',
    imageUrl: '',
    description: '',
    category: 'AiCC' as CategoryType,
    tags: [] as string[],
    featured: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const availableFilters = useMemo(() => {
    const categoryFilters = filters[formData.category] || DEFAULT_FILTERS[formData.category] || [];
    return categoryFilters.filter((f: Filter) => f.tag !== 'All');
  }, [formData.category, filters]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (category: CategoryType) => {
    setFormData((prev) => ({ ...prev, category, tags: [] }));
  };

  const handleTagToggle = (tag: string) => {
    setFormData((prev) => {
      if (prev.tags.includes(tag)) {
        return { ...prev, tags: prev.tags.filter((t) => t !== tag) };
      }
      if (prev.tags.length >= 3) return prev;
      return { ...prev, tags: [...prev.tags, tag] };
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('请选择有效的图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      handleChange('imageUrl', e.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('请输入标题');
      return;
    }

    setIsSaving(true);
    try {
      const newResource = {
        id: `${formData.category.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        ...formData,
      };
      await onSave(newResource);
    } catch (error) {
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded">
            新增资源
          </span>
          <h2 className="text-xl font-bold text-primary mt-2">添加新卡片</h2>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !formData.title.trim()}>
            {isSaving ? '保存中...' : (
              <>
                <Icon name="plus" size={16} /> 创建卡片
              </>
            )}
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
                onClick={() => handleCategoryChange(cat)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium border transition-all
                  ${formData.category === cat
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-secondary border-border hover:border-accent'}
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-primary flex items-center gap-2">
            <Icon name="type" size={16} className="text-secondary" /> 卡片标题 *
          </label>
          <Input
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="请输入标题..."
          />
        </div>

        {/* Description */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-primary flex items-center gap-2">
            <Icon name="fileText" size={16} className="text-secondary" /> 描述
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="请输入描述..."
            rows={3}
            className="w-full bg-surface-highlight border border-transparent focus:bg-white focus:border-accent rounded-xl px-4 py-3 text-sm focus:outline-none transition-all resize-none"
          />
        </div>

        {/* Featured */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-primary flex items-center gap-2">
            <Icon name="star" size={16} className="text-amber-500" /> 卡卡推荐
          </label>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
            <input
              type="checkbox"
              id="featured-new"
              checked={formData.featured}
              onChange={(e) => handleChange('featured', e.target.checked)}
              className="w-4 h-4 text-amber-600 bg-white border-amber-300 rounded"
            />
            <label htmlFor="featured-new" className="text-sm font-medium text-primary cursor-pointer">
              启用卡卡推荐
            </label>
          </div>
        </div>

        {/* Link */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-primary flex items-center gap-2">
            <Icon name="link" size={16} className="text-secondary" /> 跳转链接
          </label>
          <Input
            value={formData.link}
            onChange={(e) => handleChange('link', e.target.value)}
            placeholder="https://..."
            className="font-mono text-xs"
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-primary flex items-center gap-2">
            <Icon name="image" size={16} className="text-secondary" /> 上传图片
          </label>

          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center bg-surface-highlight/30 hover:bg-surface-highlight/50 transition-all">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload-new"
            />
            <label htmlFor="image-upload-new" className="cursor-pointer flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Icon name="upload" size={20} className="text-primary" />
              </div>
              <p className="text-sm font-medium text-primary">点击上传图片</p>
              <p className="text-xs text-secondary">支持 PNG、JPG、GIF、WebP 格式，最大 5MB</p>
            </label>
          </div>

          {formData.imageUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary">图片预览</span>
                <button
                  onClick={() => handleChange('imageUrl', '')}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Icon name="x" size={12} /> 移除
                </button>
              </div>
              <img
                src={formData.imageUrl}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg border border-border"
              />
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-primary">过滤标签 (最多3个)</label>
            <span className={`text-xs ${formData.tags.length === 3 ? 'text-amber-600' : 'text-secondary'}`}>
              {formData.tags.length}/3 已选择
            </span>
          </div>

          <div className="flex flex-wrap gap-2 p-4 rounded-xl border border-border/50 bg-surface-highlight/30">
            {availableFilters.length === 0 ? (
              <p className="text-sm text-secondary">该分类暂无可用标签</p>
            ) : (
              availableFilters.map((filter: Filter) => {
                const isActive = formData.tags.includes(filter.tag);
                const isDisabled = !isActive && formData.tags.length >= 3;

                return (
                  <button
                    key={filter.tag}
                    onClick={() => !isDisabled && handleTagToggle(filter.tag)}
                    disabled={isDisabled}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                      ${isActive
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-secondary border-border hover:border-accent'}
                      ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {filter.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddResourceForm;

