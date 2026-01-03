'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components/layout';
import { HeroSection, ResourceGrid } from '@/components/home';
import { LoginModal, UserInfoModal } from '@/components/modals';
import { useAuth, useStarlightAccess, useResources, useHeaderConfig } from '@/hooks';
import { CategoryType } from '@/types';

export default function HomePage() {
  const router = useRouter();
  
  // Auth & Access hooks
  const { isAuthenticated, token, login, logout } = useAuth();
  const {
    hasAccess: starlightAccess,
    keyInfo: starlightKeyInfo,
    grantAccess,
    revokeAccess: revokeStarlightAccess,
  } = useStarlightAccess();
  
  // Resources hook - 传递 auth token 用于获取管理员专属分类
  const {
    resources,
    filters,
    isLoading,
    error,
    getFilteredResources,
    getAvailableTags,
    reload: reloadResources,
  } = useResources({ authToken: isAuthenticated ? token : null });

  // Header config hook
  const {
    headerConfig,
    contactImage,
    cooperationImage,
  } = useHeaderConfig();

  // UI State
  const [activeCategory, setActiveCategory] = useState<CategoryType>('AiCC');

  // Check if user is logged in (either as admin or regular user)
  const isLoggedIn = isAuthenticated || starlightAccess;
  
  // Check if user has admin privileges (either admin login or admin-type key)
  const hasAdminAccess = isAuthenticated || (starlightAccess && starlightKeyInfo?.userType === 'admin');
  
  // Admin automatically has Starlight access
  const hasStarlightAccess = isAuthenticated || starlightAccess;
  
  // Only show user logout if user is NOT admin but HAS starlight access (logged in with key only)
  const showUserLogout = !isAuthenticated && starlightAccess;

  // 从 URL 参数或 sessionStorage 读取分类（仅在客户端）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 检查 sessionStorage 中是否有切换分类的标记
      const switchToCategory = sessionStorage.getItem('switchToCategory');
      if (switchToCategory && ['AiCC', 'UXTips', 'Learning', '星芒学社', '图库'].includes(switchToCategory)) {
        const category = switchToCategory as CategoryType;
          // 权限检查：普通用户不能访问 Learning
          // 星芒学社现在所有人都可以访问（未登录用户看到20%）
          if (category === 'Learning' && !hasAdminAccess) {
            setActiveCategory('AiCC');
          } else {
            setActiveCategory(category);
          }
        sessionStorage.removeItem('switchToCategory');
      } else {
        // 检查 URL 参数
        const params = new URLSearchParams(window.location.search);
        const categoryParam = params.get('category');
        if (categoryParam && ['AiCC', 'UXTips', 'Learning', '星芒学社', '图库'].includes(categoryParam)) {
          const category = categoryParam as CategoryType;
          // 权限检查：普通用户不能访问 Learning
          // 星芒学社现在所有人都可以访问（未登录用户看到20%）
          if (category === 'Learning' && !hasAdminAccess) {
            setActiveCategory('AiCC');
          } else {
            setActiveCategory(category);
          }
        }
      }

      // 监听自定义事件，用于从配置页面跳转时切换分类
      const handleSwitchCategory = (event: CustomEvent) => {
        if (event.detail && ['AiCC', 'UXTips', 'Learning', '星芒学社', '图库'].includes(event.detail)) {
          const category = event.detail as CategoryType;
          // 权限检查
          // 星芒学社现在所有人都可以访问（未登录用户看到20%）
          if (category === 'Learning' && !hasAdminAccess) {
            setActiveCategory('AiCC');
          } else {
            setActiveCategory(category);
          }
        }
      };

      window.addEventListener('switchCategory', handleSwitchCategory as EventListener);
      return () => {
        window.removeEventListener('switchCategory', handleSwitchCategory as EventListener);
      };
    }
  }, [isAuthenticated, hasAdminAccess]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');

  // Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);

  // Handle category change
  const handleCategoryChange = (category: CategoryType) => {
    // Learning requires admin access (admin login or admin-type key)
    if (category === 'Learning' && !hasAdminAccess) {
      // Regular users cannot access Learning
      return;
    }
    // 星芒学社 is now accessible to everyone (guests see 20%, logged-in users see their percentage)
    setActiveCategory(category);
  };

  // Clear filters when category changes
  useEffect(() => {
    setSelectedTagFilter('');
    setActiveFilter('All');
    setSearchQuery('');
  }, [activeCategory]);

  // If user logs out while viewing Learning, switch to AiCC
  // 星芒学社 is now accessible to everyone, so no need to redirect
  useEffect(() => {
    if (activeCategory === 'Learning' && !hasAdminAccess) {
      setActiveCategory('AiCC');
    }
  }, [hasAdminAccess, activeCategory]);

  // Reload resources when page becomes visible (user returns from config page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reloadResources();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reloadResources]);

  // Reload resources when authentication state changes
  useEffect(() => {
    reloadResources();
  }, [isAuthenticated, reloadResources]);

  // Get filtered resources
  const filteredResources = useMemo(() => {
    // Get percentage from starlightKeyInfo if viewing 星芒学社
    // If not logged in, default to 20% for 星芒学社
    let percentage: number | undefined = undefined;
    if (activeCategory === '星芒学社') {
      if (starlightKeyInfo?.percentage !== undefined) {
        percentage = starlightKeyInfo.percentage;
      } else if (!isLoggedIn) {
        // 未登录用户默认看到20%
        percentage = 20;
      }
    }
    
    return getFilteredResources(
      activeCategory,
      activeFilter,
      searchQuery,
      selectedTagFilter,
      isAuthenticated,
      percentage
    );
  }, [
    activeCategory,
    activeFilter,
    searchQuery,
    selectedTagFilter,
    isAuthenticated,
    isLoggedIn,
    starlightKeyInfo?.percentage,
    getFilteredResources,
  ]);

  // Get available tags
  const availableTags = useMemo(() => {
    return getAvailableTags(activeCategory, activeFilter);
  }, [activeCategory, activeFilter, getAvailableTags]);

  // Handle admin login
  const handleAdminLogin = (token: string) => {
    login(token);
    setShowLoginModal(false);
    router.push('/config');
  };

  // Handle regular user login
  const handleUserLogin = (token: string, keyInfo: any) => {
    grantAccess(token, keyInfo);
    setShowLoginModal(false);
    setActiveCategory('星芒学社');
  };

  // Handle login button click
  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  // Handle config click
  const handleConfigClick = () => {
    console.log('[Config Click] State:', {
      isAuthenticated,
      starlightAccess,
      starlightKeyInfo,
      userType: starlightKeyInfo?.userType,
    });
    
    // Check if user is admin (either admin login or admin-type key)
    const isAdmin = isAuthenticated || (starlightAccess && starlightKeyInfo?.userType === 'admin');
    
    console.log('[Config Click] isAdmin:', isAdmin);
    
    if (isAdmin) {
      // Admin login or admin key: go to config page
      console.log('[Config Click] Navigating to /config');
      router.push('/config');
    } else if (starlightAccess && starlightKeyInfo) {
      // Regular user with key: show user info modal
      console.log('[Config Click] Showing user info modal');
      setShowUserInfoModal(true);
    } else {
      // Not logged in: show login modal
      console.log('[Config Click] Showing login modal');
      setShowLoginModal(true);
    }
  };

  // Handle user logout (regular user with key)
  const handleUserLogout = async () => {
    await revokeStarlightAccess();
    setActiveCategory('AiCC');
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
  };

  // Clear all filters
  const clearFilters = () => {
    setActiveFilter('All');
    setSearchQuery('');
    setSelectedTagFilter('');
  };

  return (
    <div className="min-h-screen">
      <Header
        activeCategory={activeCategory}
        setActiveCategory={handleCategoryChange}
        isAuthenticated={isAuthenticated}
        onConfigClick={handleConfigClick}
        onLogout={handleLogout}
        headerConfig={headerConfig}
        cooperationImage={cooperationImage}
        starlightAccess={hasStarlightAccess}
        starlightKeyInfo={starlightKeyInfo}
        onStarlightLogout={handleUserLogout}
        showStarlightLogout={showUserLogout}
        onLoginClick={handleLoginClick}
        isLoggedIn={isLoggedIn}
      />

      {/* Unified Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onAdminLogin={handleAdminLogin}
        onUserLogin={handleUserLogin}
      />

      {/* User Info Modal */}
      <UserInfoModal
        isOpen={showUserInfoModal}
        onClose={() => setShowUserInfoModal(false)}
        keyInfo={starlightKeyInfo}
      />

      <main className="container mx-auto px-4 md:px-6 py-12 animate-fade-in">
        <HeroSection
          activeCategory={activeCategory}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedTagFilter={selectedTagFilter}
          setSelectedTagFilter={setSelectedTagFilter}
          filters={filters}
          availableTags={availableTags}
        />

        <ResourceGrid
          resources={filteredResources}
          isLoading={isLoading}
          error={error}
          activeFilter={activeFilter}
          onClearFilters={clearFilters}
          activeCategory={activeCategory}
          percentage={activeCategory === '星芒学社' 
            ? (starlightKeyInfo?.percentage !== undefined 
                ? starlightKeyInfo.percentage 
                : (!isLoggedIn ? 20 : undefined))
            : undefined}
        />
      </main>

      <Footer contactImage={contactImage} />
    </div>
  );
}

