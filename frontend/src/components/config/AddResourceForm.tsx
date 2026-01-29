'use client';

import { useState, useMemo, useEffect } from 'react';
import { CategoryType, Filter, FiltersMap } from '@/types';
import { Button, Icon, Input } from '@/components/ui';
import { DEFAULT_FILTERS, CATEGORY_INFO, STORAGE_KEYS, API_BASE_URL } from '@/constants';
import { MarkdownEditor } from './MarkdownEditor';
import { BatchAddForm } from './BatchAddForm';
import { useAuth } from '@/hooks';
import { getStorageItem } from '@/lib/utils';
import { compressImage } from '@/lib/image';

interface AddResourceFormProps {
  filters: FiltersMap;
  tagDictionary: FiltersMap;
  initialCategory?: CategoryType;
  onSave: (resource: {
    id: string;
    title: string;
    description: string;
    category: CategoryType;
    tags: string[];
    imageUrl: string;
    link: string;
    featured: boolean;
    contentType?: 'link' | 'document' | 'image';
    content?: string;
    menu?: string;
  }) => Promise<void>;
  onBatchSave?: (resources: Array<{
    id: string;
    title: string;
    description: string;
    category: CategoryType;
    tags: string[];
    imageUrl: string;
    link: string;
    featured: boolean;
    contentType?: 'link' | 'document' | 'image';
    content?: string;
    menu?: string;
  }>) => Promise<void>;
  onCancel: () => void;
}

const CATEGORY_OPTIONS: CategoryType[] = ['AIGC', 'UXTips', 'Learning', '星芒学社', '图库'];

export function AddResourceForm({ filters, tagDictionary, initialCategory, onSave, onBatchSave, onCancel }: AddResourceFormProps) {
  const { token } = useAuth();
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [formData, setFormData] = useState({
    title: '',
    link: '',
    imageUrl: '',
    description: '',
    category: (initialCategory || 'AIGC') as CategoryType,
    tags: [] as string[],
    featured: false,
    contentType: 'link' as 'link' | 'document' | 'image',
    content: '',
    menu: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // 当 initialCategory 变化时，更新表单的分类
  useEffect(() => {
    if (initialCategory) {
      setFormData((prev) => ({ ...prev, category: initialCategory, tags: [] }));
    }
  }, [initialCategory]);

  // 使用 tagDictionary（标签）而不是 filters（菜单）
  const availableTags = useMemo(() => {
    const categoryTags = tagDictionary[formData.category] || [];
    // 排除系统保留的标签
    return categoryTags.filter((f: Filter) => f.tag !== 'All' && f.tag !== '卡卡推荐');
  }, [formData.category, tagDictionary]);

  // 获取可用的二级菜单（从 filters 中获取，排除"全部"和"卡卡推荐"）
  const availableMenus = useMemo(() => {
    const categoryFilters = filters[formData.category] || [];
    return categoryFilters.filter((f: Filter) => f.tag !== 'All' && f.tag !== '卡卡推荐');
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

  const uploadImageToServer = async (file: File): Promise<string> => {
    const formDataToUpload = new FormData();
    formDataToUpload.append('image', file);

    // 优先使用 useAuth hook 返回的 token，如果不存在则从 storage 读取
    const authToken = token || getStorageItem(STORAGE_KEYS.AUTH_TOKEN, true);
    if (!authToken) {
      throw new Error('请先登录');
    }

    const uploadUrl = `${API_BASE_URL}/api/upload/image`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: formDataToUpload,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.url) {
        return data.url;
      } else {
        throw new Error(data.message || '上传失败');
      }
    } else {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || '上传失败');
      } catch (e) {
        throw new Error(errorText || '上传失败');
      }
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, isContent: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择有效的图片文件');
      return;
    }

    try {
      const toUpload = await compressImage(file, { targetMB: 20, maxDimension: 4096 });

      // 如果是图片类型的内容，上传到服务器
      if (formData.contentType === 'image' && isContent) {
        const url = await uploadImageToServer(toUpload);
        handleChange('content', url);
        handleChange('imageUrl', url); // 同时更新封面图
      } else {
        // 封面图片或其他情况，上传到服务器
        const url = await uploadImageToServer(toUpload);
        handleChange('imageUrl', url);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '上传失败');
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('请输入标题');
      return;
    }

    if (formData.contentType === 'link' && !formData.link.trim()) {
      alert('请输入跳转链接');
      return;
    }

    if (formData.contentType === 'document' && !formData.content.trim()) {
      alert('请输入文档内容');
      return;
    }

    if (formData.contentType === 'image' && !formData.content.trim()) {
      alert('请上传图片或输入图片链接');
      return;
    }

    setIsSaving(true);
    try {
      const newResource = {
        id: `${formData.category.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        ...formData,
        // 确保只保存对应类型的数据
        link: formData.contentType === 'link' ? formData.link : '',
        content: formData.contentType === 'document' || formData.contentType === 'image' ? formData.content : '',
      };
      await onSave(newResource);
    } catch (error) {
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 如果切换到批量模式且有批量保存函数，显示批量新增表单
  if (mode === 'batch' && onBatchSave) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
              批量新增
            </span>
            <h2 className="text-xl font-bold text-primary mt-2">批量导入资源</h2>
          </div>
          <Button variant="ghost" onClick={() => setMode('single')}>
            <Icon name="arrowLeft" size={16} /> 返回单个新增
          </Button>
        </div>
        <BatchAddForm
          filters={filters}
          onSave={onBatchSave}
          onCancel={() => setMode('single')}
          showHeader={false}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Content - 可滚动区域 */}
      <div className="flex-1 overflow-y-auto px-8 pt-4 pb-8">
        <div className="space-y-4 max-w-2xl">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">卡片标题 *</label>
            <Input
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="请输入标题..."
              className={!formData.title.trim() ? 'border-amber-300' : ''}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="请输入描述..."
              rows={3}
              className="w-full bg-white border border-border rounded-lg px-4 py-2.5 text-sm text-primary placeholder:text-secondary/60 focus:bg-white focus:border-primary/60 focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Featured */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">卡卡推荐</label>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="featured-new"
                checked={formData.featured}
                onChange={(e) => handleChange('featured', e.target.checked)}
                className="w-4 h-4 text-amber-600 bg-white border-amber-300 rounded focus:ring-amber-500"
              />
              <label htmlFor="featured-new" className="text-sm text-primary cursor-pointer">
                标记为卡卡推荐
              </label>
            </div>
          </div>

          {/* 二级菜单 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">二级菜单</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleChange('menu', '')}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${!formData.menu
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-secondary border-border hover:border-primary/30 hover:text-primary'}
                `}
              >
                不选择
              </button>
              {availableMenus.map((menu: Filter) => (
                <button
                  key={menu.tag}
                  onClick={() => handleChange('menu', menu.tag)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${formData.menu === menu.tag
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-secondary border-border hover:border-primary/30 hover:text-primary'}
                  `}
                >
                  {menu.label}
                </button>
              ))}
              {availableMenus.length === 0 && (
                <div className="px-3 py-1.5 text-xs text-secondary">
                  该分类暂无可用菜单
                </div>
              )}
            </div>
          </div>

          {/* Content Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">内容类型 *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleChange('contentType', 'link')}
                className={`
                  px-3 py-2.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5
                  ${formData.contentType === 'link'
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-secondary border-border hover:border-primary/30 hover:text-primary'}
                `}
              >
                <Icon name="link" size={14} />
                跳转链接
              </button>
              <button
                onClick={() => handleChange('contentType', 'document')}
                className={`
                  px-3 py-2.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5
                  ${formData.contentType === 'document'
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-secondary border-border hover:border-primary/30 hover:text-primary'}
                `}
              >
                <Icon name="fileText" size={14} />
                文档内容
              </button>
              <button
                onClick={() => handleChange('contentType', 'image')}
                className={`
                  px-3 py-2.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5
                  ${formData.contentType === 'image'
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-secondary border-border hover:border-primary/30 hover:text-primary'}
                `}
              >
                <Icon name="image" size={14} />
                上传图片
              </button>
            </div>
          </div>

          {/* Link, Document or Image Content */}
          {formData.contentType === 'link' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary">跳转链接 *</label>
              <Input
                value={formData.link}
                onChange={(e) => handleChange('link', e.target.value)}
                placeholder="https://example.com"
                className={`font-mono text-xs ${!formData.link.trim() ? 'border-amber-300' : ''}`}
              />
            </div>
          ) : formData.contentType === 'document' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary">文档内容 *</label>
              <MarkdownEditor
                value={formData.content}
                onChange={(value) => handleChange('content', value)}
                placeholder="请输入文档内容（支持 Markdown 格式）..."
                rows={10}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-sm font-medium text-primary">图片 *</label>
              <Input
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="图片链接或上传后自动填充"
                className="font-mono text-xs"
              />
              {formData.content && (
                <div className="relative group">
                  <img
                    src={formData.content}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handleChange('content', '')}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
              )}
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-surface-highlight/30 hover:bg-surface-highlight/50 transition-all">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, true)}
                  className="hidden"
                  id="image-upload-content"
                />
                <label htmlFor="image-upload-content" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Icon name="upload" size={18} className="text-primary" />
                  </div>
                  <p className="text-sm font-medium text-primary">点击上传图片</p>
                </label>
              </div>
            </div>
          )}

          {/* 封面图片区域 */}
          {(formData.contentType !== 'image' || formData.category === '图库') && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-primary">封面图片</label>
              <div className="space-y-2">
                <Input
                  value={formData.imageUrl}
                  onChange={(e) => handleChange('imageUrl', e.target.value)}
                  placeholder="封面图片链接或上传后自动填充"
                  className="font-mono text-xs"
                />
                {formData.imageUrl ? (
                  <div className="relative group">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleChange('imageUrl', '')}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center bg-surface-highlight/30 hover:bg-surface-highlight/50 transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, false)}
                      className="hidden"
                      id="cover-image-upload"
                    />
                    <label htmlFor="cover-image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                      <Icon name="upload" size={18} className="text-secondary" />
                      <p className="text-xs text-secondary">点击上传封面图片</p>
                    </label>
                  </div>
                )}
                <p className="text-xs text-secondary italic">推荐图片比例：4:3 或 3:2</p>
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-primary">资源标签 (最多3个)</label>
              <span className={`text-xs font-medium ${formData.tags.length === 3 ? 'text-amber-600' : 'text-secondary'}`}>
                {formData.tags.length}/3
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {availableTags.length === 0 ? (
                <p className="text-sm text-secondary/80">该分类暂无可用标签，请在"标签管理"中添加标签</p>
              ) : (
                availableTags.map((tag: Filter) => {
                  const isActive = formData.tags.includes(tag.tag);
                  const isDisabled = !isActive && formData.tags.length >= 3;

                  return (
                    <button
                      key={tag.tag}
                      onClick={() => !isDisabled && handleTagToggle(tag.tag)}
                      disabled={isDisabled}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                        ${isActive
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-secondary border-border hover:border-primary/30 hover:text-primary'}
                        ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {tag.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer - 固定在底部，只保留批量新增和创建卡片按钮 */}
      <div className="flex-shrink-0 p-6 bg-white/50 backdrop-blur-sm sticky bottom-0 z-10">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          {onBatchSave && (
            <Button
              variant="outline"
              onClick={() => setMode('batch')}
              className="flex-1"
            >
              <Icon name="upload" size={16} /> 批量新增
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.title.trim()}
            className="flex-1 btn-gradient"
          >
            {isSaving ? (
              <>
                <Icon name="loader" size={16} className="animate-spin" /> 保存中...
              </>
            ) : (
              <>
                <Icon name="plus" size={16} /> 创建卡片
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AddResourceForm;
