'use client';

import { useState, FormEvent } from 'react';
import { Modal, Button, Input, Icon } from '@/components/ui';
import { login, verifyAccessKey } from '@/lib/api';
import { AccessKeyInfo } from '@/types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminLogin: (token: string) => void;
  onUserLogin: (token: string, keyInfo: AccessKeyInfo) => void;
}

type LoginTab = 'user' | 'admin';

export function LoginModal({ isOpen, onClose, onAdminLogin, onUserLogin }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<LoginTab>('user');
  const [userKey, setUserKey] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [adminLoginMode, setAdminLoginMode] = useState<'password' | 'key'>('password');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUserSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!userKey.trim()) {
      setError('请输入访问密钥');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await verifyAccessKey(userKey.trim());

      if (data.success && data.token && data.keyInfo) {
        if (data.keyInfo.userType === 'admin') {
          setError('该密钥为超级管理员密钥，请切换到“超级管理员”登录');
        } else {
          onUserLogin(data.token, data.keyInfo);
          setUserKey('');
          setError('');
        }
      } else {
        setError(data.message || '访问密钥无效，请重试');
      }
    } catch (err) {
      console.error('User login error:', err);
      setError('网络错误，请检查服务器连接');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError('');

    try {
      if (adminLoginMode === 'password') {
        if (!adminPassword.trim()) {
          setError('请输入超级管理员密码');
          return;
        }
        const data = await login(adminPassword);

        if (data.success && data.token) {
          onAdminLogin(data.token);
          setAdminPassword('');
          setError('');
        } else {
          setError(data.message || '密码错误，请重试');
        }
      } else {
        if (!adminKey.trim()) {
          setError('请输入超级管理员密钥');
          return;
        }
        const data = await verifyAccessKey(adminKey.trim());
        if (data.success && data.token && data.keyInfo) {
          if (data.keyInfo.userType === 'admin') {
            onUserLogin(data.token, data.keyInfo);
            setAdminKey('');
            setError('');
          } else {
            setError('该密钥不是超级管理员密钥');
          }
        } else {
          setError(data.message || '密钥无效，请重试');
        }
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError('网络错误，请检查服务器连接');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: LoginTab) => {
    setActiveTab(tab);
    setError('');
    setUserKey('');
    setAdminPassword('');
    setAdminKey('');
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
            <Icon name="Lock" size={32} className="text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-primary mb-2">登录</h3>
          <p className="text-secondary text-sm">选择登录方式以访问内容</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-white/60 backdrop-blur-sm rounded-lg border border-border/40">
          <button
            type="button"
            onClick={() => handleTabChange('user')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'user'
                ? 'bg-white text-primary shadow-sm'
                : 'text-secondary hover:text-primary'
              }`}
          >
            <Icon name="User" size={16} className="inline mr-2" />
            普通用户
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('admin')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'admin'
                ? 'bg-white text-primary shadow-sm'
                : 'text-secondary hover:text-primary'
              }`}
          >
            <Icon name="Shield" size={16} className="inline mr-2" />
            超级管理员
          </button>
        </div>

        {/* User Login Form */}
        {activeTab === 'user' && (
          <form onSubmit={handleUserSubmit} className="flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider block text-left">
                  访问密钥
                </label>
                <input
                  type="text"
                  value={userKey}
                  onChange={(e) => setUserKey(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading && userKey.trim().length >= 32) {
                      e.preventDefault();
                      handleUserSubmit(e as any);
                    }
                  }}
                  className="w-full bg-surfaceHighlight border-2 border-transparent focus:bg-white focus:border-purple-500 rounded-xl px-4 py-3 text-left text-lg font-mono tracking-widest uppercase transition-all outline-none placeholder-gray-300"
                  placeholder="YOUR-ACCESS-KEY-HERE"
                  maxLength={32}
                  autoFocus
                  autoComplete="off"
                />
                <p className="text-xs text-secondary text-left">
                  请输入访问密钥以查看所有内容
                </p>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-[11px] text-yellow-800 leading-relaxed flex items-start gap-2">
                  <Icon name="AlertTriangle" size={14} className="mt-0.5 flex-shrink-0" />
                  <span>
                    每个访问密钥只能在一台设备上激活使用。激活后在其他设备将无法使用。
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-4 mt-auto">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center justify-center gap-2">
                  <Icon name="AlertCircle" size={14} />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || userKey.length < 32}
                className="w-full py-3.5 shadow-lg hover:shadow-xl"
              >
                {isLoading ? '验证中...' : '登录'}
                {!isLoading && <Icon name="ArrowUpRight" size={16} />}
              </Button>
            </div>
          </form>
        )}

        {/* Admin Login Form */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-white/60 backdrop-blur-sm rounded-lg border border-border/40">
                <button
                  type="button"
                  onClick={() => setAdminLoginMode('password')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${adminLoginMode === 'password'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-secondary hover:text-primary'
                    }`}
                >
                  密码登录
                </button>
                <button
                  type="button"
                  onClick={() => setAdminLoginMode('key')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${adminLoginMode === 'key'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-secondary hover:text-primary'
                    }`}
                >
                  密钥登录
                </button>
              </div>
              <div className="space-y-2">
                {adminLoginMode === 'password' ? (
                  <>
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider block text-left">
                      超级管理员密码
                    </label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isLoading && adminPassword.trim()) {
                          e.preventDefault();
                          handleAdminSubmit(e as any);
                        }
                      }}
                      className="w-full bg-surfaceHighlight border-2 border-transparent focus:bg-white focus:border-purple-500 rounded-xl px-4 py-3 text-left text-lg font-mono tracking-widest transition-all outline-none placeholder-gray-300"
                      placeholder="请输入超级管理员密码"
                      autoFocus
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                  </>
                ) : (
                  <>
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider block text-left">
                      超级管理员密钥
                    </label>
                    <input
                      type="text"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isLoading && adminKey.trim().length >= 32) {
                          e.preventDefault();
                          handleAdminSubmit(e as any);
                        }
                      }}
                      className="w-full bg-surfaceHighlight border-2 border-transparent focus:bg-white focus:border-purple-500 rounded-xl px-4 py-3 text-left text-lg font-mono tracking-widest uppercase transition-all outline-none placeholder-gray-300"
                      placeholder="YOUR-ADMIN-KEY-HERE"
                      maxLength={32}
                      autoFocus
                      autoComplete="off"
                    />
                  </>
                )}
                <p className="text-xs text-secondary text-left">
                  超级管理员可访问所有内容，包括配置管理功能
                </p>
              </div>
            </div>

            <div className="space-y-4 mt-auto">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center justify-center gap-2">
                  <Icon name="AlertCircle" size={14} />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || (adminLoginMode === 'password' ? !adminPassword.trim() : adminKey.length < 32)}
                className="w-full py-3.5 shadow-lg hover:shadow-xl"
              >
                {isLoading ? '验证中...' : '登录'}
                {!isLoading && <Icon name={adminLoginMode === 'password' ? 'Lock' : 'Key'} size={16} />}
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-8 text-center text-[10px] text-gray-400">
        {activeTab === 'user'
          ? '请联系超级管理员获取访问密钥'
          : (adminLoginMode === 'password' ? '请输入超级管理员密码以访问配置功能' : '请输入超级管理员密钥以访问配置功能')}
      </div>
    </Modal>
  );
}

export default LoginModal;
