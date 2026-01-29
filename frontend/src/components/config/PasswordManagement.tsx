'use client';

import { useState } from 'react';
import { Button, Icon, Input } from '@/components/ui';
import { updatePassword } from '@/lib/api';
import { STORAGE_KEYS } from '@/constants';
import { getStorageItem } from '@/lib/utils';

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

    const token = getStorageItem(STORAGE_KEYS.AUTH_TOKEN, true);
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
    <div className="animate-fade-in bg-white rounded-2xl border border-border/60 overflow-hidden shadow-sm mb-12">
      {/* Removed standardized header per requirement */}

      <div className="p-8 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Main Form Section */}
          <div className="lg:col-span-3 space-y-6">
            <h3 className="text-xs font-bold text-primary flex items-center gap-2">
              <div className="w-1 h-3 bg-blue-400/30 rounded-full" />
              身份验证与更新
            </h3>

            <div className="space-y-5">
              {/* 当前密码 */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1 opacity-60">
                  当前旧密码
                </label>
                <div className="relative group">
                  <Input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="请输入当前正在使用的密码"
                    className="bg-surfaceHighlight border-transparent focus:bg-white focus:border-primary/20 transition-all text-sm h-11 pr-12 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-secondary/40 hover:text-primary transition-colors"
                  >
                    <Icon name={showPasswords.current ? 'eye-off' : 'eye'} size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 新密码 */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1 opacity-60">
                    设定新密码
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="至少6位字符"
                      className="bg-surfaceHighlight border-transparent focus:bg-white focus:border-primary/20 transition-all text-sm h-11 pr-12 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-secondary/40 hover:text-primary transition-colors"
                    >
                      <Icon name={showPasswords.new ? 'eye-off' : 'eye'} size={18} />
                    </button>
                  </div>
                </div>

                {/* 确认新密码 */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1 opacity-60">
                    确认新密码
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="请再次输入以确认"
                      className="bg-surfaceHighlight border-transparent focus:bg-white focus:border-primary/20 transition-all text-sm h-11 pr-12 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-secondary/40 hover:text-primary transition-colors"
                    >
                      <Icon name={showPasswords.confirm ? 'eye-off' : 'eye'} size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 消息提示 */}
              {message && (
                <div
                  className={`p-4 rounded-xl text-xs font-medium animate-in fade-in slide-in-from-top-2 flex items-center gap-3 ${message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-100'
                    : 'bg-red-50 text-red-700 border border-red-100'
                    }`}
                >
                  <Icon name={message.type === 'success' ? 'check-circle' : 'alert-circle'} size={16} />
                  {message.text}
                </div>
              )}

              <Button
                onClick={handleUpdatePassword}
                disabled={isUpdating}
                className="w-full h-11 text-sm font-bold shadow-md shadow-primary/10 transition-all active:scale-[0.98]"
                variant="gradient"
              >
                {isUpdating ? (
                  <div className="flex items-center gap-2">
                    <Icon name="loader" size={18} className="animate-spin" />
                    <span>正在更新凭据...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Icon name="Save" size={18} />
                    <span>确认并更新密码</span>
                  </div>
                )}
              </Button>
            </div>
          </div>

          {/* Tips Section */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xs font-bold text-primary flex items-center gap-2">
              <div className="w-1 h-3 bg-yellow-400/30 rounded-full" />
              安全建议
            </h3>

            <div className="bg-surfaceHighlight/50 p-6 rounded-2xl border border-border/40 space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Icon name="ShieldCheck" size={20} className="text-green-500" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary mb-1">使用强密码</h4>
                  <p className="text-[10px] text-secondary leading-normal opacity-60">包含字母、数字及特殊字符，长度建议超过 8 位。</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Icon name="RefreshCw" size={20} className="text-blue-500" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary mb-1">定期更换</h4>
                  <p className="text-[10px] text-secondary leading-normal opacity-60">为了您的数据安全，建议每 3 - 6 个月更换一次管理密码。</p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-border/40">
                <p className="text-[10px] text-secondary/40 leading-relaxed italic">
                  注意：更新后当前登录会话仍然有效，下次登录时需使用新密码。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PasswordManagement;
