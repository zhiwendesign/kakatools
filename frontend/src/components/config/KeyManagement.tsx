'use client';

import { useState, useEffect } from 'react';
import { AccessKey } from '@/types';
import { Button, Icon, Input } from '@/components/ui';
import { fetchAccessKeys, generateAccessKey, revokeAccessKey, renameAccessKey } from '@/lib/api';
import { STORAGE_KEYS } from '@/constants';
import { getStorageItem } from '@/lib/utils';

interface KeyManagementProps {
  isAuthenticated: boolean;
  onTokenRequired: () => void;
}

function KeyItem({
  keyData,
  onRevoke,
  onRename
}: {
  keyData: AccessKey;
  onRevoke: (code: string) => void;
  onRename: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(keyData.username || keyData.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    const token = getStorageItem(STORAGE_KEYS.AUTH_TOKEN, true);
    if (!token) return;

    setIsSaving(true);
    try {
      const res = await renameAccessKey(token, keyData.code, name);
      if (res.success) {
        setIsEditing(false);
        onRename();
      } else {
        alert('更新失败');
      }
    } catch (e) {
      alert('连接错误');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(keyData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea');
      textArea.value = keyData.code;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        alert('复制失败，请手动复制');
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-border/60 flex justify-between items-center group hover:border-primary/25 transition-colors shadow-sm">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium text-primary tracking-wider">{keyData.code}</span>
          {keyData.userType === 'admin' && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full border border-primary/20">
              超级管理员
            </span>
          )}
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-2 py-1 bg-surface-highlight rounded text-xs border border-border focus:outline-none focus:border-accent"
                placeholder="用户名"
              />
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="text-xs text-green-600 hover:text-green-700"
              >
                {isSaving ? '...' : '保存'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="text-xs text-secondary hover:text-primary"
              >
                取消
              </button>
            </div>
          ) : (
            <span
              className="text-xs text-secondary font-medium px-2 py-0.5 bg-surface-highlight rounded-full cursor-pointer hover:bg-primary/10"
              onClick={() => setIsEditing(true)}
              title="点击编辑"
            >
              {keyData.username || keyData.name || 'Anonymous'}
            </span>
          )}
        </div>
        <div className="text-xs text-secondary mt-0.5 flex items-center gap-3 flex-wrap">
          <span>过期时间: {new Date(keyData.expiresAt).toLocaleDateString('zh-CN')}</span>
          <span className="text-primary">
            星芒学社/图库可见度: {keyData.percentage !== undefined ? keyData.percentage : 100}%
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handleCopy}
          className="p-1.5 text-secondary hover:text-primary hover:bg-surfaceHighlight rounded transition-colors opacity-0 group-hover:opacity-100"
          title={copied ? '已复制' : '复制密钥'}
        >
          {copied ? (
            <Icon name="check" size={14} className="text-green-500" />
          ) : (
            <Icon name="copy" size={14} />
          )}
        </button>
        <button
          onClick={() => onRevoke(keyData.code)}
          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
          title="撤销密钥"
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
    </div>
  );
}

export function KeyManagement({ isAuthenticated, onTokenRequired }: KeyManagementProps) {
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(30);
  const [username, setUsername] = useState('');
  const [userType, setUserType] = useState<'user' | 'admin'>('user');
  const [percentage, setPercentage] = useState(100);
  const [generatedKey, setGeneratedKey] = useState<AccessKey | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const loadKeys = async () => {
    const token = getStorageItem(STORAGE_KEYS.AUTH_TOKEN, true);
    if (!token) return;

    setLoading(true);
    try {
      const data = await fetchAccessKeys(token);
      if (data.success) {
        setKeys(data.keys);
      }
    } catch (err) {
      console.error('Failed to fetch keys', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadKeys();
  }, [isAuthenticated]);

  const handleGenerateKey = async () => {
    const token = getStorageItem(STORAGE_KEYS.AUTH_TOKEN, true);
    if (!token) {
      if (onTokenRequired) onTokenRequired();
      alert('需要管理员登录后才能生成密钥');
      return;
    }

    setIsGenerating(true);
    try {
      // 确保 percentage 是数字类型
      const percentageValue = typeof percentage === 'string' ? parseInt(percentage, 10) : percentage;
      console.log('[KeyManagement] 生成密钥，percentage:', percentageValue);
      const data = await generateAccessKey(token, duration, username || 'Anonymous', userType, percentageValue);
      if (data.success && data.key) {
        setGeneratedKey(data.key);
        setUsername('');
        setUserType('user'); // 重置为默认值
        setPercentage(100); // 重置为默认值
        loadKeys();
      } else {
        alert(data.message || '生成失败，请稍后重试');
      }
    } catch (err) {
      alert('生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeKey = async (code: string) => {
    if (!window.confirm(`确定要撤销密钥 ${code} 吗？`)) return;

    const token = getStorageItem(STORAGE_KEYS.AUTH_TOKEN, true);
    if (!token) return;

    try {
      const res = await revokeAccessKey(token, code);
      if (res.success) loadKeys();
    } catch (err) {
      alert('撤销失败');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 text-center text-secondary">
        请先登录以管理密钥
      </div>
    );
  }

  const filteredKeys = keys.filter((k) =>
    k.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (k.username && k.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (k.name && k.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="animate-fade-in bg-white rounded-2xl border border-border/60 overflow-hidden shadow-sm mb-12">
      {/* Removed standardized header per requirement */}

      <div className="p-8 space-y-10">
        {/* Generate New Key Section */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-primary flex items-center gap-2">
            <div className="w-1 h-3 bg-yellow-400/30 rounded-full" />
            快速生成新密钥
          </h3>

          <div className="bg-surfaceHighlight/50 p-6 rounded-2xl border border-border/40 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1 opacity-60">持有者姓名</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="如: 学员甲"
                  className="bg-white border-border/40 text-xs h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1 opacity-60">角色权限</label>
                <select
                  value={userType}
                  onChange={(e) => setUserType(e.target.value as 'user' | 'admin')}
                  className="w-full bg-white border border-border/40 focus:border-primary/30 rounded-xl px-4 py-2 text-xs focus:outline-none transition-all text-primary h-10 shadow-sm"
                >
                  <option value="user">普通用户 (核心分类)</option>
                  <option value="admin">超级管理员 (全部可见)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1 opacity-60">有效期 (天)</label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                  min={1}
                  className="bg-white border-border/40 text-xs h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1 opacity-60">星芒/图库权重</label>
                <select
                  value={percentage}
                  onChange={(e) => setPercentage(parseInt(e.target.value))}
                  className="w-full bg-white border border-border/40 focus:border-primary/30 rounded-xl px-4 py-2 text-xs focus:outline-none transition-all text-primary h-10 shadow-sm"
                >
                  <option value={20}>20% 预览</option>
                  <option value={50}>50% 中等</option>
                  <option value={100}>100% 全量</option>
                </select>
              </div>
              <div className="col-span-1 md:col-span-2 lg:col-span-4">
                <Button
                  onClick={handleGenerateKey}
                  disabled={isGenerating}
                  className="w-full h-11 text-sm font-bold shadow-md shadow-primary/10"
                  variant="gradient"
                >
                  {isGenerating ? (
                    <Icon name="Loader2" size={18} className="animate-spin" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Icon name="Plus" size={18} />
                      <span>立即生成访问密钥</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {generatedKey && (
            <div className="mt-4 p-4 bg-green-500/5 text-green-700 rounded-2xl border border-green-500/20 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">密钥生成成功: {generatedKey.username}</p>
                <p className="text-[10px] font-medium opacity-60">有效期至: {new Date(generatedKey.expiresAt).toLocaleDateString()}</p>
              </div>
              <div className="text-3xl font-mono tracking-[0.2em] font-black select-all text-center py-2 bg-white rounded-xl border border-green-200/40 shadow-sm leading-relaxed">
                {generatedKey.code}
              </div>
            </div>
          )}
        </section>

        {/* Active Keys List Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-primary flex items-center gap-2">
              <div className="w-1 h-3 bg-blue-400/30 rounded-full" />
              当前活跃密钥 ({filteredKeys.length})
            </h3>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-60">
              <Icon name="Loader2" size={24} className="animate-spin text-primary" />
              <p className="text-xs font-medium">同步云端数据...</p>
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-surfaceHighlight/30 rounded-3xl border border-dashed border-border/60">
              <div className="p-4 bg-white rounded-full shadow-sm">
                <Icon name="SearchX" size={32} className="text-secondary/20" />
              </div>
              <p className="text-xs font-bold text-secondary/40 uppercase tracking-widest">未找到匹配的密钥</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredKeys.map((key) => (
                <KeyItem
                  key={key.code}
                  keyData={key}
                  onRevoke={handleRevokeKey}
                  onRename={loadKeys}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default KeyManagement;
