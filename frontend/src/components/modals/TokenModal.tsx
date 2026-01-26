'use client';

import { useState, FormEvent } from 'react';
import { Modal, Button, Input, Icon } from '@/components/ui';
import { login } from '@/lib/api';

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (token: string) => void;
  onLogin?: (password: string) => Promise<boolean>;
}

export function TokenModal({ isOpen, onClose, onSuccess, onLogin }: TokenModalProps) {
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
      // Support both onLogin (returns boolean) and onSuccess (receives token)
      if (onLogin) {
        const success = await onLogin(password);
        if (success) {
          setPassword('');
        } else {
          setError('密码错误，请重试');
        }
      } else {
        const data = await login(password);

        if (data.success && data.token) {
          onSuccess?.(data.token);
          setPassword('');
        } else {
          setError(data.message || '登录失败，请重试');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('网络错误，请检查服务器连接');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md w-full h-[600px] p-8 shadow-2xl border border-white/20 relative overflow-hidden flex flex-col"
    >
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />

      <div className="flex-1 flex flex-col pt-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Lock" size={32} className="text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-primary mb-2">管理员验证</h3>
          <p className="text-secondary text-sm">
            请输入管理员密码以访问配置功能
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider block text-center">
                管理员密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surfaceHighlight border-2 border-transparent focus:bg-white focus:border-purple-500 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest transition-all outline-none placeholder-gray-300"
                placeholder="请输入管理员密码"
                autoFocus
                disabled={isLoading}
                autoComplete="current-password"
              />
              {error && (
                <p className="text-red-500 text-xs text-center mt-2">{error}</p>
              )}
            </div>

            <p className="text-xs text-secondary text-center">
              身份验证成功后，您将获得限时的管理访问权限
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-auto">
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!password.trim()}
              className="w-full py-3.5 shadow-lg hover:shadow-xl"
            >
              <Icon name="Lock" size={16} />
              {isLoading ? '验证中...' : '开始校验'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="w-full py-2 hover:bg-surfaceHighlight"
            >
              取消
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-8 text-center text-[10px] text-gray-400">
        如果您忘记了密码，请查看后端配置文件或联系系统维护员
      </div>
    </Modal>
  );
}

export default TokenModal;

