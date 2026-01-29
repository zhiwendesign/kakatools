'use client';

import { useState, FormEvent } from 'react';
import { Modal, Button, Icon } from '@/components/ui';
import { verifyAccessKey } from '@/lib/api';
import { AccessKeyInfo } from '@/types';

interface AccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (token: string, keyInfo: AccessKeyInfo) => void;
}

export function AccessModal({ isOpen, onClose, onVerify }: AccessModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError('');

    try {
      const data = await verifyAccessKey(code);

      if (data.success && data.token && data.keyInfo) {
        onVerify(data.token, data.keyInfo);
        setCode('');
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (err) {
      setError('Network error, please try again');
    } finally {
      setLoading(false);
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

      <div className="flex-1 flex flex-col">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Sparkles" size={32} className="text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-primary mb-2">星芒学社</h3>
          <p className="text-secondary text-sm">
            请联系 卡卡（微信：XingYueAiArt）获取密钥
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider block text-left">
              Access Key
            </label>
              <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full bg-surfaceHighlight border-2 border-transparent focus:bg-white focus:border-purple-500 rounded-xl px-4 py-3 text-left text-lg font-mono tracking-widest uppercase transition-all outline-none placeholder-gray-300"
              placeholder="YOUR-ACCESS-KEY-HERE"
              maxLength={32}
              autoFocus
            />
              <p className="text-xs text-secondary text-left">
              请输入您的密钥以解锁专属研究员内容
            </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center justify-center gap-2">
                <Icon name="AlertCircle" size={14} />
                {error}
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || code.length < 32}
            className="w-full py-3.5 shadow-lg hover:shadow-xl mt-auto"
          >
            {loading ? 'Verifying...' : 'Unlock Access'}
            {!loading && <Icon name="ArrowUpRight" size={16} />}
          </Button>
        </form>
      </div>

      <div className="mt-8 text-center text-[10px] text-gray-400">
        Contact your administrator to obtain an access key.
      </div>
    </Modal>
  );
}

export default AccessModal;

