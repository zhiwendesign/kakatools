'use client';

import { useState, useEffect } from 'react';
import { HeaderConfig as HeaderConfigType, CategoryType } from '@/types';
import { Button, Icon, Input } from '@/components/ui';
import { fetchHeaderConfig } from '@/lib/api';
import { CATEGORY_INFO, API_BASE_URL } from '@/constants';

interface HeaderConfigProps {
  onSave: () => void;
  token: string | null;
}

export function HeaderConfig({ onSave, token }: HeaderConfigProps) {
  const [headerConfig, setHeaderConfig] = useState<HeaderConfigType>({
    avatar: 'K',
    avatarImage: null,
    title: '卡卡AI知识库',
  });
  const [contactImage, setContactImage] = useState<string | null>(null);
  const [cooperationImage, setCooperationImage] = useState<string | null>(null);
  const [categorySubtitles, setCategorySubtitles] = useState<Record<string, string | null>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load from backend API on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetchHeaderConfig();
        if (response.success && response.config) {
          setHeaderConfig({
            avatar: response.config.avatar || 'K',
            avatarImage: response.config.avatarImage || null,
            title: response.config.title || '卡卡AI知识库',
          });
          setContactImage(response.config.contactImage || null);
          setCooperationImage(response.config.cooperationImage || null);
          setCategorySubtitles(response.config.categorySubtitles || {});
        }
      } catch (error) {
        console.error('Failed to load header config:', error);
      }
    };
    loadConfig();
  }, []);

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string | null) => void
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('请选择有效的图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setter(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!token) {
      setErrorMessage('需要管理员权限才能保存配置');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    setSaveStatus('saving');
    setErrorMessage('');

    try {
      // 直接调用 API，避免 Webpack 编译问题
      const response = await fetch(`${API_BASE_URL}/api/config/header`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          avatar: headerConfig.avatar,
          avatarImage: headerConfig.avatarImage,
          title: headerConfig.title,
          contactImage: contactImage,
          cooperationImage: cooperationImage,
          categorySubtitles: categorySubtitles,
        }),
      }).then(res => res.json());

      if (response.success) {
        setSaveStatus('saved');
        onSave();
        setTimeout(() => setSaveStatus('idle'), 2000);
        
        // 通知所有页面重新加载配置（通过自定义事件）
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('headerConfigUpdated'));
        }
      } else {
        setErrorMessage(response.message || '保存失败');
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error: any) {
      console.error('Failed to save header config:', error);
      const errorMessage = error?.message || error?.toString() || '网络错误，请稍后重试';
      setErrorMessage(errorMessage);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8 pb-4 border-b border-border">
        <h3 className="text-xl font-bold text-primary flex items-center gap-2">
          <Icon name="layout" size={24} className="text-purple-500" />
          头部配置
        </h3>
        <p className="text-sm text-secondary mt-1">配置全局头部设置和联系信息</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Avatar Config */}
        <div className="bg-white rounded-lg p-6 border border-border">
          <h4 className="text-sm font-medium text-primary mb-4">头像配置</h4>

          {/* Avatar Image Upload */}
          <div className="mb-6">
            <label className="block text-xs text-secondary mb-2">头像图片</label>
            <div className="space-y-3">
              {headerConfig.avatarImage && (
                <div className="relative inline-block">
                  <img
                    src={headerConfig.avatarImage}
                    alt="头像预览"
                    className="w-20 h-20 rounded-full object-cover border-2 border-border shadow-sm"
                  />
                  <button
                    onClick={() => setHeaderConfig((prev) => ({ ...prev, avatarImage: null }))}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-sm"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleImageUpload(e, (val) =>
                      setHeaderConfig((prev) => ({ ...prev, avatarImage: val }))
                    )
                  }
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className="px-4 py-2 bg-surface-highlight border border-border rounded-lg text-xs cursor-pointer hover:bg-surface-highlight/80 transition-colors flex items-center gap-2"
                >
                  <Icon name="upload" size={14} />
                  {headerConfig.avatarImage ? '更换图片' : '上传图片'}
                </label>
              </div>
              <p className="text-xs text-secondary">支持 JPG、PNG 格式，文件大小不超过 2MB</p>
            </div>
          </div>

          {/* Character Avatar */}
          <div>
            <label className="block text-xs text-secondary mb-2">字符头像（无图片时使用）</label>
            <Input
              type="text"
              maxLength={2}
              value={headerConfig.avatar}
              onChange={(e) => setHeaderConfig((prev) => ({ ...prev, avatar: e.target.value }))}
              placeholder="如: K, A"
            />
          </div>
        </div>

        {/* Title Config */}
        <div className="bg-white rounded-lg p-6 border border-border">
          <h4 className="text-sm font-medium text-primary mb-4">标题配置</h4>
          <label className="block text-xs text-secondary mb-2">页面标题</label>
          <Input
            value={headerConfig.title}
            onChange={(e) => setHeaderConfig((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="如: 卡卡AI知识库"
          />
        </div>

        {/* Contact Image Config */}
        <div className="bg-white rounded-lg p-6 border border-border">
          <h4 className="text-sm font-medium text-primary mb-4">联系我图片配置</h4>
          <p className="text-xs text-secondary mb-3">配置底部"联系我"hover时显示的图片（1:1比例）</p>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {contactImage ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                  <img src={contactImage} alt="联系我图片" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-surface-highlight">
                  <Icon name="image" size={24} className="text-secondary" />
                </div>
              )}

              <div className="flex-1 space-y-2">
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setContactImage)}
                    className="hidden"
                    id="contact-image-upload"
                  />
                  <span className="inline-block px-4 py-2 bg-surface-highlight border border-border rounded-lg text-sm text-secondary hover:text-primary hover:border-primary/20 transition-colors cursor-pointer">
                    {contactImage ? '更换图片' : '上传图片'}
                  </span>
                </label>

                {contactImage && (
                  <button
                    onClick={() => setContactImage(null)}
                    className="px-4 py-2 text-xs text-red-500 hover:text-red-700 transition-colors block"
                  >
                    删除图片
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cooperation Image Config */}
        <div className="bg-white rounded-lg p-6 border border-border">
          <h4 className="text-sm font-medium text-primary mb-4">合作交流图片配置</h4>
          <p className="text-xs text-secondary mb-3">配置顶部导航栏hover时展示的二维码/图片</p>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {cooperationImage ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                  <img src={cooperationImage} alt="合作交流图片" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-surface-highlight">
                  <Icon name="image" size={24} className="text-secondary" />
                </div>
              )}

              <div className="flex-1 space-y-2">
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setCooperationImage)}
                    className="hidden"
                    id="cooperation-image-upload"
                  />
                  <span className="inline-block px-4 py-2 bg-surface-highlight border border-border rounded-lg text-sm text-secondary hover:text-primary hover:border-primary/20 transition-colors cursor-pointer">
                    {cooperationImage ? '更换图片' : '上传图片'}
                  </span>
                </label>

                {cooperationImage && (
                  <button
                    onClick={() => setCooperationImage(null)}
                    className="px-4 py-2 text-xs text-red-500 hover:text-red-700 transition-colors block"
                  >
                    删除图片
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Category Subtitles Config */}
        <div className="bg-white rounded-lg p-6 border border-border">
          <h4 className="text-sm font-medium text-primary mb-4">分类副标题配置</h4>
          <p className="text-xs text-secondary mb-4">配置每个分类Tab下方的辅助标题（副标题）</p>
          
          <div className="space-y-4">
            {(['AIGC', 'UXTips', 'Learning', '星芒学社', '图库'] as CategoryType[]).map((category) => (
              <div key={category}>
                <label className="block text-xs text-secondary mb-2">
                  {category} 副标题
                </label>
                <Input
                  type="text"
                  value={categorySubtitles[category] || ''}
                  onChange={(e) => setCategorySubtitles((prev) => ({
                    ...prev,
                    [category]: e.target.value,
                  }))}
                  placeholder={`如: ${CATEGORY_INFO[category].subtitle}`}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-border">
          {errorMessage && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMessage}
            </div>
          )}
          <Button
            onClick={handleSave}
            className="w-full"
            variant={saveStatus === 'saved' ? 'secondary' : 'primary'}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                保存中...
              </>
            ) : saveStatus === 'saved' ? (
              '✅ 配置已保存!'
            ) : (
              <>
                <Icon name="save" size={16} /> 保存配置
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default HeaderConfig;

