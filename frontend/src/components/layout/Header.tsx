'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui';
import { CategoryType, HeaderConfig, AccessKeyInfo } from '@/types';
import { cn, formatDateTime } from '@/lib/utils';

interface HeaderProps {
  activeCategory: CategoryType;
  setActiveCategory: (category: CategoryType) => void;
  isAuthenticated: boolean;
  onConfigClick: () => void;
  onLogout: () => void;
  headerConfig: HeaderConfig;
  cooperationImage: string | null;
  starlightAccess: boolean;
  starlightKeyInfo: AccessKeyInfo | null;
  onStarlightLogout: () => void;
  // Only show starlight logout for non-admin users with starlight key
  showStarlightLogout?: boolean;
}

export function Header({
  activeCategory,
  setActiveCategory,
  isAuthenticated,
  onConfigClick,
  onLogout,
  headerConfig,
  cooperationImage,
  starlightAccess,
  starlightKeyInfo,
  onStarlightLogout,
  showStarlightLogout = false,
}: HeaderProps) {
  const categories: { id: CategoryType; label: string; special?: boolean }[] = [
    { id: 'AiCC', label: 'AiCC' },
    { id: 'UXLib', label: 'UXLib' },
    { id: 'Learning', label: 'Learning' },
    { id: 'Starlight Academy', label: 'Starlight', special: true },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-black/10 overflow-hidden">
            {headerConfig.avatarImage ? (
              <img
                src={headerConfig.avatarImage}
                alt="头像"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-lg leading-none">
                {headerConfig.avatar}
              </span>
            )}
          </div>
          <div className="hidden md:block">
            <h1 className="text-sm font-semibold text-primary tracking-tight">
              {headerConfig.title}
            </h1>
          </div>
        </Link>

        {/* Category Toggle */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <div className="flex p-1 bg-surfaceHighlight rounded-full border border-border/50">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'px-6 py-1.5 rounded-full text-xs font-semibold transition-all duration-300',
                  activeCategory === cat.id
                    ? cat.special
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                      : 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                    : 'text-secondary hover:text-primary'
                )}
              >
                {cat.special ? (
                  <span className="flex items-center gap-1.5">
                    <Icon name="Sparkles" size={12} />
                    {cat.label}
                  </span>
                ) : (
                  cat.label
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Starlight Access Status - Only show for non-admin users with key */}
          {showStarlightLogout && starlightKeyInfo && (
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium hover:bg-purple-100 transition-colors">
                <Icon name="Sparkles" size={12} />
                <span>Starlight访问</span>
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                  <div className="text-center">
                    <div className="font-medium">访问密钥信息</div>
                    <div className="text-gray-300 mt-1">
                      到期时间: {formatDateTime(starlightKeyInfo.expiresAt)}
                    </div>
                    <div className="text-gray-400 text-[10px] mt-1">
                      密钥: {starlightKeyInfo.code.slice(0, 8)}...
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
                </div>
              </div>
            </div>
          )}

          {/* Cooperation Button (Desktop Only) */}
          {cooperationImage && (
            <div className="hidden md:block relative group">
              <span className="text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer flex items-center gap-1">
                合作交流
              </span>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <div className="w-32 h-32 bg-white rounded-lg shadow-xl border border-border p-2">
                  <img
                    src={cooperationImage}
                    alt="合作交流"
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <div className="w-3 h-3 bg-white border-l border-t border-border transform rotate-45 absolute left-1/2 -translate-x-1/2 -top-1.5" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onConfigClick}
              className="p-2 rounded-full hover:bg-surfaceHighlight text-secondary hover:text-primary transition-colors"
              title="配置"
            >
              <Icon name="Settings" size={18} />
            </button>
            {/* Admin logout button */}
            {isAuthenticated && (
              <button
                onClick={onLogout}
                className="p-2 rounded-full hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                title="退出管理员登录"
              >
                <Icon name="LogOut" size={18} />
              </button>
            )}
            {/* Starlight logout button - only for non-admin users */}
            {showStarlightLogout && (
              <button
                onClick={onStarlightLogout}
                className="p-2 rounded-full hover:bg-purple-50 text-purple-500 hover:text-purple-600 transition-colors"
                title="退出Starlight访问"
              >
                <Icon name="LogOut" size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
