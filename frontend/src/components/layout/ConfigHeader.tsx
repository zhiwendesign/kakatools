'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui';

interface ConfigHeaderProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export function ConfigHeader({ isAuthenticated, onLogout }: ConfigHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-black/10">
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
          {/* Back to Home */}
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
          >
            <Icon name="arrowUp" size={16} className="rotate-[-90deg]" />
            返回资源库
          </Link>

          {/* Logout */}
          {isAuthenticated && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
              title="退出登录"
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

