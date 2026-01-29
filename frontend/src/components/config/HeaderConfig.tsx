'use client';

import { useState, useEffect } from 'react';
import { HeaderConfig as HeaderConfigType, CategoryType } from '@/types';
import { Button, Icon, Input } from '@/components/ui';
import { fetchHeaderConfig } from '@/lib/api';
import { CATEGORY_INFO, API_BASE_URL } from '@/constants';
import { cn } from '@/lib/utils';

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
      const msg = error?.message || error?.toString() || '网络错误，请稍后重试';
      setErrorMessage(msg);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  return (
    <div className="animate-fade-in bg-white rounded-2xl border border-border/60 overflow-hidden shadow-sm mb-12">
      {/* Removed standardized header per requirement */}

      <div className="p-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Basic Info Section */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <div className="w-1 h-3 bg-primary/30 rounded-full" />
              基础站点信息
            </h3>

            <div className="space-y-6">
              {/* Avatar Image Upload */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest opacity-60">站点图标 / 头像</label>
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-surfaceHighlight bg-surfaceHighlight shadow-inner flex items-center justify-center transition-all group-hover:border-primary/20">
                      {headerConfig.avatarImage ? (
                        <img
                          src={headerConfig.avatarImage}
                          alt="头像"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-secondary">{headerConfig.avatar || 'K'}</span>
                      )}
                    </div>
                    {headerConfig.avatarImage && (
                      <button
                        onClick={() => setHeaderConfig((prev) => ({ ...prev, avatarImage: null }))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-md z-10"
                      >
                        <Icon name="X" size={12} />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
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
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-surfaceHighlight border border-border rounded-lg text-xs font-semibold cursor-pointer hover:bg-white hover:border-primary/20 transition-all shadow-sm"
                    >
                      <Icon name="UploadCloud" size={14} className="text-primary" />
                      <span>{headerConfig.avatarImage ? '更换图片' : '上传图片'}</span>
                    </label>
                    <p className="text-[10px] text-secondary leading-relaxed opacity-60">
                      推荐 1:1 比例，JPG/PNG，≤2MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Character Avatar */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest opacity-60">字符头像 (备用)</label>
                <Input
                  type="text"
                  maxLength={2}
                  value={headerConfig.avatar}
                  onChange={(e) => setHeaderConfig((prev) => ({ ...prev, avatar: e.target.value }))}
                  placeholder="如: K"
                  className="bg-surfaceHighlight border-transparent focus:bg-white focus:border-primary/20 transition-all text-sm h-10"
                />
              </div>

              {/* Title Config */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest opacity-60">站点名称 / 标题</label>
                <Input
                  value={headerConfig.title}
                  onChange={(e) => setHeaderConfig((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="如: 卡卡AI知识库"
                  className="bg-surfaceHighlight border-transparent focus:bg-white focus:border-primary/20 transition-all text-sm h-10 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Media & Interaction Section */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <div className="w-1 h-3 bg-blue-400/30 rounded-full" />
              媒体与互动码
            </h3>

            <div className="grid grid-cols-2 gap-6">
              {/* Contact Image */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest opacity-60">联系我二维码</label>
                <div className="relative group aspect-square">
                  <div className="w-full h-full rounded-xl overflow-hidden border-2 border-dashed border-border/60 bg-surfaceHighlight flex items-center justify-center transition-all group-hover:border-primary/20 shadow-inner">
                    {contactImage ? (
                      <img src={contactImage} alt="Contact" className="w-full h-full object-cover" />
                    ) : (
                      <Icon name="QrCode" size={24} className="text-secondary/30" />
                    )}
                  </div>
                  {contactImage && (
                    <button
                      onClick={() => setContactImage(null)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md z-10"
                    >
                      <Icon name="Trash2" size={12} />
                    </button>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setContactImage)}
                    className="hidden"
                    id="contact-upload"
                  />
                  <label
                    htmlFor="contact-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl backdrop-blur-[2px]"
                  >
                    <Icon name="edit-2" size={18} />
                  </label>
                </div>
              </div>

              {/* Cooperation Image */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest opacity-60">合作交流二维码</label>
                <div className="relative group aspect-square">
                  <div className="w-full h-full rounded-xl overflow-hidden border-2 border-dashed border-border/60 bg-surfaceHighlight flex items-center justify-center transition-all group-hover:border-primary/20 shadow-inner">
                    {cooperationImage ? (
                      <img src={cooperationImage} alt="Cooperation" className="w-full h-full object-cover" />
                    ) : (
                      <Icon name="Users" size={24} className="text-secondary/30" />
                    )}
                  </div>
                  {cooperationImage && (
                    <button
                      onClick={() => setCooperationImage(null)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md z-10"
                    >
                      <Icon name="Trash2" size={12} />
                    </button>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setCooperationImage)}
                    className="hidden"
                    id="cooperation-upload"
                  />
                  <label
                    htmlFor="cooperation-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl backdrop-blur-[2px]"
                  >
                    <Icon name="edit-2" size={18} />
                  </label>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-secondary leading-tight opacity-50 italic">
              建议使用 1:1 正方形图，将展示在底栏或导航栏。
            </p>
          </div>
        </div>

        {/* Category Subtitles Section */}
        <div className="space-y-6 border-t border-border/40 pt-10">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <div className="w-1 h-3 bg-green-400/30 rounded-full" />
            各分类副标题自定义
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6">
            {(['AIGC', 'UXTips', 'Learning', '星芒学社', '图库'] as CategoryType[]).map((category) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-widest opacity-60">
                    {category}
                  </label>
                </div>
                <Input
                  type="text"
                  value={categorySubtitles[category] || ''}
                  onChange={(e) => setCategorySubtitles((prev) => ({
                    ...prev,
                    [category]: e.target.value,
                  }))}
                  placeholder={`如: ${CATEGORY_INFO[category].subtitle}`}
                  className="bg-surfaceHighlight border-transparent focus:bg-white focus:border-primary/20 transition-all text-xs h-9"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save Action Area Area */}
      <div className="px-8 py-6 bg-surface/30 border-t border-border/40">
        <div className="flex flex-col gap-3">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 animate-in fade-in slide-in-from-bottom-2">
              <Icon name="alert-circle" size={14} className="inline mr-2" />
              {errorMessage}
            </div>
          )}
          <Button
            onClick={handleSave}
            className={cn(
              "h-11 w-full text-sm font-bold transition-all shadow-md active:scale-[0.98]",
              saveStatus === 'saved' ? "bg-green-500 hover:bg-green-600" : ""
            )}
            variant={saveStatus === 'saved' ? 'secondary' : 'gradient'}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? (
              <div className="flex items-center gap-3">
                <Icon name="Loader2" size={18} className="animate-spin" />
                <span>正在保存...</span>
              </div>
            ) : saveStatus === 'saved' ? (
              <div className="flex items-center gap-2">
                <Icon name="CheckCircle2" size={18} />
                <span>已同步至云端</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Icon name="Save" size={18} />
                <span>立即保存全局配置</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default HeaderConfig;
