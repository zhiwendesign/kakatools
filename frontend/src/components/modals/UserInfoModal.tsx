'use client';

import { Modal, Icon } from '@/components/ui';
import { AccessKeyInfo } from '@/types';
import { formatDateTime } from '@/lib/utils';

interface UserInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyInfo: AccessKeyInfo | null;
}

export function UserInfoModal({ isOpen, onClose, keyInfo }: UserInfoModalProps) {
  if (!keyInfo) {
    return null;
  }

  // 计算剩余天数
  const getRemainingDays = () => {
    const now = Date.now();
    const expiresAt = keyInfo.expiresAt;
    const remaining = expiresAt - now;
    const days = Math.ceil(remaining / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const remainingDays = getRemainingDays();
  const isExpired = keyInfo.expiresAt <= Date.now();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md w-full p-8 shadow-2xl border border-white/20 relative overflow-hidden"
    >
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />

      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-tr from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="User" size={32} className="text-purple-600" />
        </div>
        <h3 className="text-2xl font-bold text-primary mb-2">个人信息</h3>
        <p className="text-secondary text-sm">
          查看您的账户信息
        </p>
      </div>

      <div className="space-y-6">
        {/* 学员姓名 */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
            <Icon name="User" size={14} />
            学员姓名
          </label>
          <div className="w-full bg-surfaceHighlight border-2 border-transparent rounded-xl px-4 py-3 text-sm font-medium text-primary">
            {keyInfo.name || keyInfo.username || '未设置'}
          </div>
        </div>

        {/* 访问密钥 */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
            <Icon name="Key" size={14} />
            访问密钥
          </label>
          <div className="w-full bg-surfaceHighlight border-2 border-transparent rounded-xl px-4 py-3 text-sm font-mono tracking-widest text-secondary">
            {keyInfo.code}
          </div>
        </div>

        {/* 到期时间 */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
            <Icon name="Calendar" size={14} />
            到期时间
          </label>
          <div className={`w-full border-2 rounded-xl px-4 py-3 text-sm font-medium ${
            isExpired 
              ? 'bg-red-50 border-red-200 text-red-700' 
              : remainingDays <= 7
              ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
              : 'bg-surfaceHighlight border-transparent text-primary'
          }`}>
            <div className="flex items-center justify-between">
              <span>{formatDateTime(keyInfo.expiresAt)}</span>
              {!isExpired && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  remainingDays <= 7
                    ? 'bg-yellow-200 text-yellow-800'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {remainingDays > 0 ? `剩余 ${remainingDays} 天` : '已过期'}
                </span>
              )}
            </div>
          </div>
          {isExpired && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <Icon name="AlertCircle" size={12} />
              您的访问密钥已过期，请联系管理员续期
            </p>
          )}
          {!isExpired && remainingDays <= 7 && (
            <p className="text-xs text-yellow-600 flex items-center gap-1">
              <Icon name="AlertTriangle" size={12} />
              访问密钥即将到期，请及时联系管理员续期
            </p>
          )}
        </div>

        {/* 创建时间 */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
            <Icon name="Clock" size={14} />
            创建时间
          </label>
          <div className="w-full bg-surfaceHighlight border-2 border-transparent rounded-xl px-4 py-3 text-sm text-secondary">
            {formatDateTime(keyInfo.createdAt)}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-border">
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Icon name="Check" size={16} />
          关闭
        </button>
      </div>
    </Modal>
  );
}

export default UserInfoModal;


