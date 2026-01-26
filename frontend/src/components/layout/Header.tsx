'use client';

import Link from 'next/link';
import { Icon, IconName } from '@/components/ui';
import { CategoryType, HeaderConfig, AccessKeyInfo } from '@/types';
import { cn, formatDateTime, isAdminOnlyCategory } from '@/lib/utils';

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
  // Show login button if user is not logged in
  onLoginClick?: () => void;
  // Whether user is logged in (either admin or regular user)
  isLoggedIn: boolean;
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
  onLoginClick,
  isLoggedIn,
}: HeaderProps) {
  const allCategories: { id: CategoryType; label: string; icon: IconName; emoji: string; special?: boolean; adminOnly?: boolean; color?: string }[] = [
    { id: 'AIGC', label: 'AIGC', icon: 'Bot', emoji: '🤖', color: 'text-blue-600' },
    { id: 'UXTips', label: 'UXTips', icon: 'Palette', emoji: '🎨', color: 'text-purple-600' },
    { id: 'Learning', label: 'Learning', icon: 'FileText', emoji: '📚', adminOnly: true, color: 'text-green-600' },
    { id: '星芒学社', label: '星芒学社', icon: 'Sparkles', emoji: '✨', special: true, color: 'text-amber-600' },
    { id: '图库', label: '图库', icon: 'Image', emoji: '🖼️', special: true, color: 'text-cyan-600' },
  ];
  
  // Check if user has admin access (either admin login or admin-type key)
  const hasAdminAccess = isAuthenticated || (starlightAccess && starlightKeyInfo?.userType === 'admin');
  
  // Filter categories based on user type:
  // - Admin (login or admin-type key): can see all categories including Learning
  // - Regular user (with user-type key): can see AIGC, UXTips, 星芒学社, and 图库 (not Learning)
  // - Guest: can see AIGC, UXTips, 星芒学社, and 图库 (but only 20% of content)
  const categories = allCategories.filter(cat => {
    if (cat.adminOnly || isAdminOnlyCategory(cat.id)) {
      return hasAdminAccess;
    }
    return true;
  });

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-border/60 shadow-sm">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-3 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            setActiveCategory('AIGC');
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-gray-900/10 overflow-hidden">
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
          <div className="flex p-1 bg-surfaceHighlight/60 backdrop-blur-md rounded-full border border-border/50 shadow-sm">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              const iconColor = cat.color || 'text-primary';
              
              // Map color classes to hover variants
              const hoverColorMap: Record<string, string> = {
                'text-blue-600': 'group-hover:text-blue-600',
                'text-purple-600': 'group-hover:text-purple-600',
                'text-green-600': 'group-hover:text-green-600',
                'text-amber-600': 'group-hover:text-amber-600',
                'text-cyan-600': 'group-hover:text-cyan-600',
                'text-primary': 'group-hover:text-primary',
              };
              
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'px-6 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 relative group',
                    isActive
                      ? 'bg-white text-primary shadow-sm'
                      : 'bg-transparent text-secondary hover:text-primary'
                  )}
                >
                  {isActive ? (
                    <span className="text-base leading-none">{cat.emoji}</span>
                  ) : (
                    <Icon 
                      name={cat.icon} 
                      size={12} 
                      className={cn(
                        'transition-colors duration-200',
                        cn('text-secondary', hoverColorMap[iconColor] || 'group-hover:text-primary')
                      )} 
                    />
                  )}
                  <span className={cn(
                    'transition-colors duration-200',
                    isActive && 'text-primary'
                  )}>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Starlight Access Status - Only show for non-admin users with key */}
          {showStarlightLogout && starlightKeyInfo && (
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium">
              <Icon name="Sparkles" size={12} />
              <span>{starlightKeyInfo.userType === 'admin' ? '星芒超级管理员' : '星芒会员'}</span>
            </button>
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
            {/* Login/Config button - show login when not logged in, config when logged in */}
            {!isLoggedIn && onLoginClick ? (
              <button
                onClick={onLoginClick}
                className="px-4 py-2 rounded-full bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                title="登录"
              >
                <Icon name="Lock" size={14} />
                登录
              </button>
            ) : (
              <>
                {/* Admin name display */}
                {isAuthenticated && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-50 to-pink-50 border border-indigo-200/60 text-purple-700 shadow-sm">
                    <Icon name="Shield" size={14} className="text-purple-700" />
                    <span className="hidden sm:inline">超级管理员</span>
                  </div>
                )}
                
                {/* User name display - show name if available, otherwise show username */}
                {showStarlightLogout && starlightKeyInfo && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium">
                    <Icon name="User" size={14} />
                    <span>{starlightKeyInfo.name || starlightKeyInfo.username || '学员'}</span>
                  </div>
                )}
                
                <button
                  onClick={onConfigClick}
                  className={`flex items-center gap-2 rounded-full hover:bg-surfaceHighlight text-secondary hover:text-primary transition-colors ${
                    (isAuthenticated || (starlightAccess && starlightKeyInfo?.userType === 'admin')) ? 'px-3 py-2' : 'p-2'
                  }`}
                  title={(isAuthenticated || (starlightAccess && starlightKeyInfo?.userType === 'admin')) ? '进入后台' : '配置'}
                >
                  <Icon name="Settings" size={18} />
                  {(isAuthenticated || (starlightAccess && starlightKeyInfo?.userType === 'admin')) && (
                    <span className="text-xs font-medium hidden sm:inline">进入后台</span>
                  )}
                </button>
              </>
            )}
            
            {/* Admin logout button */}
            {isAuthenticated && (
              <button
                onClick={onLogout}
                className="p-2 rounded-full hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                title="退出超级管理员登录"
              >
                <Icon name="LogOut" size={18} />
              </button>
            )}
            
            {/* User logout button - only for non-admin users */}
            {showStarlightLogout && (
              <button
                onClick={onStarlightLogout}
                className="p-2 rounded-full hover:bg-purple-50 text-purple-500 hover:text-purple-600 transition-colors"
                title="退出登录"
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
