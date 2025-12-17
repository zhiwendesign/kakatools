'use client';

import { useState, useMemo } from 'react';
import { Resource, Filter, CategoryType, FiltersMap } from '@/types';
import { Button, Icon, Input } from '@/components/ui';
import { DEFAULT_FILTERS } from '@/constants';

interface ConfigEditorProps {
  resource: Resource;
  filters: FiltersMap;
  onSave: (updates: Partial<Resource>) => Promise<void>;
}

export function ConfigEditor({ resource, filters, onSave }: ConfigEditorProps) {
  const [formData, setFormData] = useState({
    title: resource.title,
    link: resource.link,
    imageUrl: resource.imageUrl,
    description: resource.description || '',
    tags: [...resource.tags],
    featured: resource.featured || false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Get available filters for this category
  const availableFilters = useMemo(() => {
    const categoryFilters = filters[resource.category] || DEFAULT_FILTERS[resource.category] || [];
    return categoryFilters.filter((f: Filter) => f.tag !== 'All');
  }, [resource.category, filters]);

  const handleTagToggle = (tag: string) => {
    setFormData((prev) => {
      if (prev.tags.includes(tag)) {
        return { ...prev, tags: prev.tags.filter((t) => t !== tag) };
      }
      if (prev.tags.length >= 3) return prev;
      return { ...prev, tags: [...prev.tags, tag] };
    });
    setSaveStatus('idle');
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveStatus('idle');
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
    setIsSaving(true);
    try {
      await onSave(formData);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-surface-highlight px-2 py-1 rounded">
            编辑 {resource.category}
          </span>
          <h2 className="text-xl font-bold text-primary mt-2">{resource.title}</h2>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          variant={saveStatus === 'saved' ? 'secondary' : 'primary'}
          className={saveStatus === 'saved' ? 'bg-green-100 text-green-700 border-green-200' : ''}
        >
          {isSaving ? '保存中...' : saveStatus === 'saved' ? '已保存！' : (
            <>
              <Icon name="save" size={16} /> 保存更改
            </>
          )}
        </Button>
      </div>

      <div className="space-y-8 max-w-2xl">
        {/* Title */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-primary flex items-center gap-2">
            <Icon name="type" size={16} className="text-secondary" /> 卡片标题
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

        {/* Featured Toggle */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-primary flex items-center gap-2">
            <Icon name="star" size={16} className="text-amber-500" /> 卡卡推荐
          </label>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
            <input
              type="checkbox"
              id="featured"
              checked={formData.featured}
              onChange={(e) => handleChange('featured', e.target.checked)}
              className="w-4 h-4 text-amber-600 bg-white border-amber-300 rounded focus:ring-amber-500"
            />
            <label htmlFor="featured" className="text-sm font-medium text-primary cursor-pointer">
              启用卡卡推荐
            </label>
            <span className="text-xs text-amber-700 flex items-center gap-1">
              <Icon name="star" size={14} className="text-amber-500" />
              推荐资源将在首页置顶显示
            </span>
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
              id="image-upload"
            />
            <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Icon name="upload" size={20} className="text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary">点击上传图片</p>
                <p className="text-xs text-secondary">支持 PNG、JPG、GIF、WebP 格式，最大 5MB</p>
              </div>
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
            {availableFilters.map((filter: Filter) => {
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
            })}
          </div>

          {formData.tags.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-primary">已选择的标签：</label>
              <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-green-50/50 border border-green-200/50">
                {formData.tags.map((tag) => {
                  const filter = availableFilters.find((f: Filter) => f.tag === tag);
                  return (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 border border-green-200"
                    >
                      {filter?.label || tag}
                      <button onClick={() => handleTagToggle(tag)} className="ml-1 text-green-600 hover:text-green-800">
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConfigEditor;

