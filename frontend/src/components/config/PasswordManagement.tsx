'use client';

import { useState } from 'react';
import { Button, Icon, Input } from '@/components/ui';
import { updatePassword } from '@/lib/api';
import { STORAGE_KEYS } from '@/constants';

interface PasswordManagementProps {
  isAuthenticated: boolean;
  onTokenRequired: () => void;
}

export function PasswordManagement({ isAuthenticated, onTokenRequired }: PasswordManagementProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleUpdatePassword = async () => {
    // 验证输入
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: '请填写所有字段' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码长度至少6位' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的新密码不一致' });
      return;
    }

    if (currentPassword === newPassword) {
      setMessage({ type: 'error', text: '新密码不能与当前密码相同' });
      return;
    }

    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) {
      onTokenRequired();
      return;
    }

    setIsUpdating(true);
    setMessage(null);

    try {
      const result = await updatePassword(token, currentPassword, newPassword);
      
      if (result.success) {
        setMessage({ type: 'success', text: '密码更新成功！' });
        // 清空表单
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: result.message || '密码更新失败' });
      }
    } catch (error) {
      console.error('Update password error:', error);
      setMessage({ type: 'error', text: '网络错误，请稍后重试' });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 text-center text-secondary">
        请先登录以管理密码
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-border">
        <h4 className="font-bold text-primary mb-6 flex items-center gap-2">
          <Icon name="lock" size={20} /> 更改管理员密码
        </h4>

        <div className="space-y-4 max-w-md">
          {/* 当前密码 */}
          <div>
            <label className="text-sm font-medium text-primary block mb-2">
              当前密码
            </label>
            <div className="relative">
              <Input
                type={showPasswords.current ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="请输入当前密码"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-primary transition-colors"
              >
                <Icon name={showPasswords.current ? 'eye-off' : 'eye'} size={16} />
              </button>
            </div>
          </div>

          {/* 新密码 */}
          <div>
            <label className="text-sm font-medium text-primary block mb-2">
              新密码
            </label>
            <div className="relative">
              <Input
                type={showPasswords.new ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少6位）"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-primary transition-colors"
              >
                <Icon name={showPasswords.new ? 'eye-off' : 'eye'} size={16} />
              </button>
            </div>
            <p className="text-xs text-secondary mt-1">密码长度至少6位字符</p>
          </div>

          {/* 确认新密码 */}
          <div>
            <label className="text-sm font-medium text-primary block mb-2">
              确认新密码
            </label>
            <div className="relative">
              <Input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-primary transition-colors"
              >
                <Icon name={showPasswords.confirm ? 'eye-off' : 'eye'} size={16} />
              </button>
            </div>
          </div>

          {/* 消息提示 */}
          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 提交按钮 */}
          <Button
            onClick={handleUpdatePassword}
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? (
              <>
                <Icon name="loader" size={16} className="animate-spin" /> 更新中...
              </>
            ) : (
              <>
                <Icon name="save" size={16} /> 更新密码
              </>
            )}
          </Button>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Icon name="alert-circle" size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-800">
              <p className="font-medium mb-1">安全提示：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>请使用强密码，包含字母、数字和特殊字符</li>
                <li>定期更换密码以提高安全性</li>
                <li>密码更新后，当前登录会话仍然有效</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PasswordManagement;

