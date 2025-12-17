'use client';

import { useState, FormEvent } from 'react';
import { Modal, Button, Input, Icon } from '@/components/ui';
import { login } from '@/lib/api';

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export function TokenModal({ isOpen, onClose, onSuccess }: TokenModalProps) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await login(password);

      if (data.success && data.token) {
        onSuccess(data.token);
        setPassword('');
      } else {
        setError(data.message || '登录失败，请重试');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('网络错误，请检查服务器连接');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon name="Lock" size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary">管理员验证</h3>
            <p className="text-sm text-secondary">请输入管理员密码以访问配置功能</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="请输入管理员密码"
          label="管理员密码"
          error={error}
          autoFocus
          disabled={isLoading}
        />

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            取消
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={!password.trim()}
            className="flex-1"
          >
            <Icon name="Lock" size={16} />
            {isLoading ? '验证中...' : '验证'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default TokenModal;

