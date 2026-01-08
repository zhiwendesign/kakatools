'use client';

import { useState, useMemo } from 'react';
import { Resource, Filter, CategoryType, FiltersMap } from '@/types';
import { Button, Icon, Input } from '@/components/ui';
import { DEFAULT_FILTERS, STORAGE_KEYS, API_BASE_URL } from '@/constants';
import { useAuth } from '@/hooks';
import { MarkdownEditor } from './MarkdownEditor';

interface ConfigEditorProps {
  resource: Resource;
  filters: FiltersMap;
  onSave: (updates: Partial<Resource>) => Promise<void>;
}

export function ConfigEditor({ resource, filters, onSave }: ConfigEditorProps) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    title: resource.title,
    link: resource.link || '',
    imageUrl: resource.imageUrl,
    description: resource.description || '',
    tags: [...resource.tags],
    featured: resource.featured || false,
    contentType: resource.contentType || 'link',
    content: resource.content || '',
    category: resource.category, // 添加分类字段
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    // 如果是图片类型，上传到服务器
    if (formData.contentType === 'image') {
      try {
        const formDataToUpload = new FormData();
        formDataToUpload.append('image', file);
        
        // 使用 useAuth hook 获取的 token，如果没有则从 localStorage 获取
        const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (!authToken) {
          alert('请先登录');
          return;
        }

        const uploadUrl = `${API_BASE_URL}/api/upload/image`;
        console.log('[Upload] 上传图片到:', uploadUrl);
        console.log('[Upload] Token:', authToken ? '已设置' : '未设置');

        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            // 注意：不要设置 Content-Type，让浏览器自动设置（包含 boundary）
          },
          body: formDataToUpload,
        });

        console.log('[Upload] 响应状态:', response.status, response.statusText);

        if (response.ok) {
          const data = await response.json();
          console.log('[Upload] 响应数据:', data);
          if (data.success && data.url) {
            handleChange('content', data.url);
            handleChange('imageUrl', data.url); // 同时更新封面图
            console.log('[Upload] 上传成功，图片URL:', data.url);
          } else {
            const errorMsg = data.message || '未知错误';
            console.error('[Upload] 上传失败:', errorMsg);
            alert('上传失败：' + errorMsg);
          }
        } else {
          const errorText = await response.text();
          console.error('[Upload] 服务器错误:', response.status, errorText);
          let errorMsg = '上传失败，请重试';
          try {
            const errorData = JSON.parse(errorText);
            errorMsg = errorData.message || errorMsg;
          } catch (e) {
            // 如果不是JSON，使用原始文本
            errorMsg = errorText || errorMsg;
          }
          alert(errorMsg);
        }
      } catch (error) {
        console.error('[Upload] 网络错误:', error);
        alert('上传失败：' + (error instanceof Error ? error.message : '网络连接错误'));
      }
    } else {
      // 其他类型，使用 base64
      const reader = new FileReader();
      reader.onload = (e) => {
        handleChange('imageUrl', e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
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
            className="w-full bg-white/90 backdrop-blur-sm border border-border/60 rounded-xl px-4 py-3 text-sm text-primary placeholder:text-secondary/60 focus:bg-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all resize-none shadow-sm"
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

        {/* Content Type Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-primary flex items-center gap-2">
            <Icon name="fileText" size={16} className="text-secondary" /> 内容类型
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => handleChange('contentType', 'link')}
              className={`
                flex-1 px-4 py-3 rounded-lg text-sm font-medium border transition-all
                ${formData.contentType === 'link'
                  ? 'bg-primary text-white border-primary/80'
                  : 'bg-white text-secondary border-border hover:border-primary/20'}
              `}
            >
              <Icon name="link" size={16} className="inline mr-2" />
              跳转链接
            </button>
            <button
              onClick={() => handleChange('contentType', 'document')}
              className={`
                flex-1 px-4 py-3 rounded-lg text-sm font-medium border transition-all
                ${formData.contentType === 'document'
                  ? 'bg-primary text-white border-primary/80'
                  : 'bg-white text-secondary border-border hover:border-primary/20'}
              `}
            >
              <Icon name="fileText" size={16} className="inline mr-2" />
              文档内容
            </button>
            <button
              onClick={() => handleChange('contentType', 'image')}
              className={`
                flex-1 px-4 py-3 rounded-lg text-sm font-medium border transition-all
                ${formData.contentType === 'image'
                  ? 'bg-primary text-white border-primary/80'
                  : 'bg-white text-secondary border-border hover:border-primary/20'}
              `}
            >
              <Icon name="image" size={16} className="inline mr-2" />
              上传图片
            </button>
          </div>
        </div>

        {/* Link, Document or Image Content */}
        {formData.contentType === 'link' ? (
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
        ) : formData.contentType === 'document' ? (
          <div className="space-y-3">
            <label className="text-sm font-medium text-primary flex items-center gap-2">
              <Icon name="fileText" size={16} className="text-secondary" /> 文档内容
            </label>
            <MarkdownEditor
              value={formData.content}
              onChange={(value) => handleChange('content', value)}
              placeholder="请输入文档内容（支持 Markdown 格式）..."
              rows={12}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-sm font-medium text-primary flex items-center gap-2">
              <Icon name="image" size={16} className="text-secondary" /> 图片链接
            </label>
            <Input
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="https://... 或上传图片后自动填充"
              className="font-mono text-xs"
            />
            <p className="text-xs text-secondary">
              提示：上传图片后，图片链接会自动填充到上方输入框
            </p>
          </div>
        )}

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

        {/* Move to Other Category - Only for Learning */}
        {resource.category === 'Learning' && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-primary flex items-center gap-2">
              <Icon name="ArrowRight" size={16} className="text-secondary" /> 移动到其他菜单
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value as CategoryType)}
              className="w-full bg-white/90 backdrop-blur-sm border border-border/60 rounded-xl px-4 py-3 text-sm text-primary focus:bg-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all shadow-sm"
            >
              <option value="Learning">Learning（当前）</option>
              <option value="AiCC">AiCC</option>
              <option value="UXTips">UXTips</option>
              <option value="星芒学社">星芒学社</option>
              <option value="图库">图库</option>
            </select>
            <p className="text-xs text-secondary">
              选择目标分类后，点击"保存更改"即可将资源移动到新分类
            </p>
          </div>
        )}

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
                      ? 'bg-primary text-white border-primary/80 shadow-sm'
                      : 'bg-white text-secondary border-border hover:border-primary/20'}
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

