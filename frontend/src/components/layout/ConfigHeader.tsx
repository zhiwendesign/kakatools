'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui';

interface ConfigHeaderProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export function ConfigHeader({ isAuthenticated, onLogout }: ConfigHeaderProps) {
  const router = useRouter();

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // 跳转到首页，并设置分类为 AIGC
    router.push('/');
    // 使用 setTimeout 确保路由跳转完成后再设置分类
    setTimeout(() => {
      // 通过 sessionStorage 传递分类信息
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('switchToCategory', 'AIGC');
        // 触发自定义事件通知首页切换分类
        window.dispatchEvent(new CustomEvent('switchCategory', { detail: 'AIGC' }));
      }
    }, 100);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-border shadow-sm">
      <div className="w-full px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 cursor-pointer" onClick={handleLogoClick}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-gray-900/10">
            <span className="text-white font-bold text-lg leading-none">K</span>
          </div>
          <div className="hidden md:block">
            <h1 className="text-sm font-semibold text-primary tracking-tight">
              KKTools 配置中心
            </h1>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Admin badge */}
          {isAuthenticated && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-50 to-pink-50 border border-indigo-200/60 text-purple-700 shadow-sm">
              <Icon name="Shield" size={14} className="text-purple-700" />
              <span className="hidden sm:inline">超级管理员</span>
            </div>
          )}
          {/* Logout */}
          {isAuthenticated && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
              title="退出超级管理员登录"
            >
              <Icon name="logOut" size={16} />
              退出登录
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default ConfigHeader;
