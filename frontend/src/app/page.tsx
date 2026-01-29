'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components/layout';
import { HeroSection, ResourceGrid } from '@/components/home';
import { LoginModal, UserInfoModal } from '@/components/modals';
import { useAuth, useStarlightAccess, useResources, useHeaderConfig } from '@/hooks';
import { CategoryType, CATEGORIES } from '@/types';
import { getVisibilityPercentage, isAdminOnlyCategory } from '@/lib/utils';

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
    tagDictionary,
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
    categorySubtitles,
  } = useHeaderConfig();

  // UI State
  const [activeCategory, setActiveCategory] = useState<CategoryType>('AIGC');

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
      if (switchToCategory && CATEGORIES.includes(switchToCategory as CategoryType)) {
        const category = switchToCategory as CategoryType;
        if (isAdminOnlyCategory(category) && !hasAdminAccess) {
          setActiveCategory('AIGC');
        } else {
          setActiveCategory(category);
        }
        sessionStorage.removeItem('switchToCategory');
      } else {
        // 检查 URL 参数
        const params = new URLSearchParams(window.location.search);
        const categoryParam = params.get('category');
        if (categoryParam && CATEGORIES.includes(categoryParam as CategoryType)) {
          const category = categoryParam as CategoryType;
          if (isAdminOnlyCategory(category) && !hasAdminAccess) {
            setActiveCategory('AIGC');
          } else {
            setActiveCategory(category);
          }
        }
      }

      // 监听自定义事件，用于从配置页面跳转时切换分类
      const handleSwitchCategory = (event: CustomEvent) => {
        if (event.detail && CATEGORIES.includes(event.detail as CategoryType)) {
          const category = event.detail as CategoryType;
          if (isAdminOnlyCategory(category) && !hasAdminAccess) {
            setActiveCategory('AIGC');
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
    if (isAdminOnlyCategory(category) && !hasAdminAccess) {
      return;
    }
    setActiveCategory(category);
  };

  // Clear filters when category changes
  useEffect(() => {
    setSelectedTagFilter('');
    setActiveFilter('All');
    setSearchQuery('');
  }, [activeCategory]);

  // If user logs out while viewing admin-only category, switch to AIGC
  useEffect(() => {
    if (isAdminOnlyCategory(activeCategory) && !hasAdminAccess) {
      setActiveCategory('AIGC');
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

  // Reload resources when authentication state or token changes
  useEffect(() => {
    // Small delay to ensure token is properly set
    const timer = setTimeout(() => {
      reloadResources();
    }, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated, token, reloadResources]);

  // Get filtered resources
  // Visibility rules:
  // - AIGC and UXTips: Always 100% visible (no login required)
  // - 星芒学社 and 图库: 
  //   - Not logged in: 20%
  //   - Logged in with percentage setting: use setting
  //   - Logged in without setting: 100%
  const filteredResources = useMemo(() => {
    const percentage = getVisibilityPercentage(
      activeCategory,
      starlightKeyInfo?.percentage,
      isLoggedIn
    );

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
    return getAvailableTags(
      activeCategory,
      activeFilter,
      searchQuery,
      isAuthenticated,
      getVisibilityPercentage(activeCategory, starlightKeyInfo?.percentage, isLoggedIn)
    );
  }, [
    activeCategory,
    activeFilter,
    searchQuery,
    isAuthenticated,
    isLoggedIn,
    starlightKeyInfo?.percentage,
    getAvailableTags
  ]);

  // Handle admin login
  const handleAdminLogin = (token: string) => {
    login(token);
    setShowLoginModal(false);
    // Wait a bit for auth state to update before navigating
    setTimeout(() => {
      router.push('/config');
    }, 100);
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
    setActiveCategory('AIGC');
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

      <main className="container mx-auto px-4 md:px-6 py-12 pb-24 animate-fade-in">
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
          categorySubtitles={categorySubtitles}
          resources={resources}
        />

        <ResourceGrid
          resources={filteredResources}
          tagDictionary={tagDictionary}
          isLoading={isLoading}
          error={error}
          activeFilter={activeFilter}
          onClearFilters={clearFilters}
          activeCategory={activeCategory}
          percentage={getVisibilityPercentage(
            activeCategory,
            starlightKeyInfo?.percentage,
            isLoggedIn
          )}
        />
      </main>

      <Footer contactImage={contactImage} />
    </div>
  );
}
