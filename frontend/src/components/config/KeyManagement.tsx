'use client';

import { useState, useEffect } from 'react';
import { AccessKey } from '@/types';
import { Button, Icon, Input } from '@/components/ui';
import { fetchAccessKeys, generateAccessKey, revokeAccessKey, renameAccessKey } from '@/lib/api';
import { STORAGE_KEYS } from '@/constants';

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

  const handleSave = async () => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
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

  return (
    <div className="bg-white p-3 rounded-lg border border-border flex justify-between items-center group hover:border-primary/20 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium text-primary tracking-wider">{keyData.code}</span>
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
        <div className="text-xs text-secondary mt-0.5">
          过期时间: {new Date(keyData.expiresAt).toLocaleDateString('zh-CN')}
        </div>
      </div>
      <button
        onClick={() => onRevoke(keyData.code)}
        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
        title="撤销密钥"
      >
        <Icon name="trash" size={14} />
      </button>
    </div>
  );
}

export function KeyManagement({ isAuthenticated, onTokenRequired }: KeyManagementProps) {
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(30);
  const [username, setUsername] = useState('');
  const [generatedKey, setGeneratedKey] = useState<AccessKey | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const loadKeys = async () => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
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
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return;

    setIsGenerating(true);
    try {
      const data = await generateAccessKey(token, duration, username || 'Anonymous');
      if (data.success && data.key) {
        setGeneratedKey(data.key);
        setUsername('');
        loadKeys();
      }
    } catch (err) {
      alert('生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeKey = async (code: string) => {
    if (!window.confirm(`确定要撤销密钥 ${code} 吗？`)) return;

    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
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
    <div className="space-y-6">
      {/* Generate New Key */}
      <div className="bg-white p-4 rounded-lg border border-border">
        <h4 className="font-bold text-primary mb-4 flex items-center gap-2">
          <Icon name="plus" size={16} /> 生成新密钥
        </h4>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-secondary block mb-1">用户名 / 持有者</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="如：学员姓名"
            />
          </div>
          <div className="w-32">
            <label className="text-xs text-secondary block mb-1">有效期 (天)</label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
              min={1}
            />
          </div>
          <Button onClick={handleGenerateKey} disabled={isGenerating}>
            {isGenerating ? '生成中...' : '生成'}
          </Button>
        </div>

        {generatedKey && (
          <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-lg border border-green-200">
            <p className="text-xs font-bold mb-1">新密钥已生成 - {generatedKey.username}:</p>
            <div className="text-xl font-mono tracking-widest select-all">{generatedKey.code}</div>
            <p className="text-[10px] mt-1 opacity-75">
              过期时间: {new Date(generatedKey.expiresAt).toLocaleDateString('zh-CN')}
            </p>
          </div>
        )}
      </div>

      {/* Active Keys List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h4 className="font-bold text-primary">活跃密钥 ({filteredKeys.length})</h4>
          <div className="relative w-48">
            <Input
              type="text"
              placeholder="搜索密钥..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs"
            />
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-secondary">
              <Icon name="search" size={12} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4 text-secondary">加载中...</div>
        ) : filteredKeys.length === 0 ? (
          <div className="text-center py-4 text-secondary text-sm">暂无密钥</div>
        ) : (
          <div className="space-y-2">
            {filteredKeys.map((key) => (
              <KeyItem key={key.code} keyData={key} onRevoke={handleRevokeKey} onRename={loadKeys} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default KeyManagement;

