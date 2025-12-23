'use client';

import { useState, useEffect } from 'react';
import { HeaderConfig as HeaderConfigType } from '@/types';
import { Button, Icon, Input } from '@/components/ui';
import { STORAGE_KEYS } from '@/constants';

interface HeaderConfigProps {
  onSave: () => void;
}

export function HeaderConfig({ onSave }: HeaderConfigProps) {
  const [headerConfig, setHeaderConfig] = useState<HeaderConfigType>({
    avatar: 'K',
    avatarImage: null,
    title: 'Al Creative Commons',
  });
  const [contactImage, setContactImage] = useState<string | null>(null);
  const [cooperationImage, setCooperationImage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  // Load from localStorage on mount
  useEffect(() => {
    setHeaderConfig({
      avatar: localStorage.getItem(STORAGE_KEYS.HEADER_AVATAR) || 'K',
      avatarImage: localStorage.getItem(STORAGE_KEYS.HEADER_AVATAR_IMAGE),
      title: localStorage.getItem(STORAGE_KEYS.HEADER_TITLE) || 'Al Creative Commons',
    });
    setContactImage(localStorage.getItem(STORAGE_KEYS.CONTACT_IMAGE));
    setCooperationImage(localStorage.getItem(STORAGE_KEYS.COOPERATION_IMAGE));
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

  const handleSave = () => {
    // Save header config
    localStorage.setItem(STORAGE_KEYS.HEADER_AVATAR, headerConfig.avatar);
    localStorage.setItem(STORAGE_KEYS.HEADER_TITLE, headerConfig.title);
    if (headerConfig.avatarImage) {
      localStorage.setItem(STORAGE_KEYS.HEADER_AVATAR_IMAGE, headerConfig.avatarImage);
    } else {
      localStorage.removeItem(STORAGE_KEYS.HEADER_AVATAR_IMAGE);
    }

    // Save contact image
    if (contactImage) {
      localStorage.setItem(STORAGE_KEYS.CONTACT_IMAGE, contactImage);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CONTACT_IMAGE);
    }

    // Save cooperation image
    if (cooperationImage) {
      localStorage.setItem(STORAGE_KEYS.COOPERATION_IMAGE, cooperationImage);
    } else {
      localStorage.removeItem(STORAGE_KEYS.COOPERATION_IMAGE);
    }

    setSaveStatus('saved');
    onSave();
    setTimeout(() => setSaveStatus('idle'), 2000);
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
            placeholder="如: Al Creative Commons"
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
                  <span className="inline-block px-4 py-2 bg-surface-highlight border border-border rounded-lg text-sm text-secondary hover:text-primary hover:border-accent transition-colors cursor-pointer">
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
                  <span className="inline-block px-4 py-2 bg-surface-highlight border border-border rounded-lg text-sm text-secondary hover:text-primary hover:border-accent transition-colors cursor-pointer">
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

        {/* Save Button */}
        <div className="pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            className="w-full"
            variant={saveStatus === 'saved' ? 'secondary' : 'primary'}
          >
            {saveStatus === 'saved' ? (
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

