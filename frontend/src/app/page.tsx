'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components/layout';
import { HeroSection, ResourceGrid } from '@/components/home';
import { TokenModal, AccessModal } from '@/components/modals';
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

  // 从 URL 参数或 sessionStorage 读取分类（仅在客户端）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 检查 sessionStorage 中是否有切换分类的标记
      const switchToCategory = sessionStorage.getItem('switchToCategory');
      if (switchToCategory && ['AiCC', 'UXLib', 'Learning', 'Starlight Academy'].includes(switchToCategory)) {
        setActiveCategory(switchToCategory as CategoryType);
        sessionStorage.removeItem('switchToCategory');
      } else {
        // 检查 URL 参数
        const params = new URLSearchParams(window.location.search);
        const categoryParam = params.get('category');
        if (categoryParam && ['AiCC', 'UXLib', 'Learning', 'Starlight Academy'].includes(categoryParam)) {
          setActiveCategory(categoryParam as CategoryType);
        }
      }

      // 监听自定义事件，用于从配置页面跳转时切换分类
      const handleSwitchCategory = (event: CustomEvent) => {
        if (event.detail && ['AiCC', 'UXLib', 'Learning', 'Starlight Academy'].includes(event.detail)) {
          setActiveCategory(event.detail as CategoryType);
        }
      };

      window.addEventListener('switchCategory', handleSwitchCategory as EventListener);
      return () => {
        window.removeEventListener('switchCategory', handleSwitchCategory as EventListener);
      };
    }
  }, []);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');

  // Modal State
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);

  // Admin automatically has Starlight access
  const hasStarlightAccess = isAuthenticated || starlightAccess;
  
  // Only show Starlight logout if user is NOT admin but HAS starlight access (logged in with key only)
  const showStarlightLogout = !isAuthenticated && starlightAccess;

  // Handle category change
  const handleCategoryChange = (category: CategoryType) => {
    // Learning requires admin authentication
    if (category === 'Learning' && !isAuthenticated) {
      return; // Non-admin cannot access Learning
    }
    // Starlight requires access key (unless admin)
    if (category === 'Starlight Academy' && !hasStarlightAccess) {
      setShowAccessModal(true);
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

  // If user logs out while viewing Learning, switch to AiCC
  useEffect(() => {
    if (activeCategory === 'Learning' && !isAuthenticated) {
      setActiveCategory('AiCC');
    }
  }, [isAuthenticated, activeCategory]);

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
    return getFilteredResources(
      activeCategory,
      activeFilter,
      searchQuery,
      selectedTagFilter,
      isAuthenticated
    );
  }, [
    activeCategory,
    activeFilter,
    searchQuery,
    selectedTagFilter,
    isAuthenticated,
    getFilteredResources,
  ]);

  // Get available tags
  const availableTags = useMemo(() => {
    return getAvailableTags(activeCategory, activeFilter);
  }, [activeCategory, activeFilter, getAvailableTags]);

  // Handle token success
  const handleTokenSuccess = (token: string) => {
    login(token);
    setShowTokenModal(false);
    router.push('/config');
  };

  // Handle config click
  const handleConfigClick = () => {
    if (isAuthenticated) {
      router.push('/config');
    } else {
      setShowTokenModal(true);
    }
  };

  // Handle starlight access
  const handleStarlightVerify = (token: string, keyInfo: any) => {
    grantAccess(token, keyInfo);
    setShowAccessModal(false);
    setActiveCategory('Starlight Academy');
  };

  // Handle starlight logout
  const handleStarlightLogout = async () => {
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
        onStarlightLogout={handleStarlightLogout}
        showStarlightLogout={showStarlightLogout}
      />

      {/* Access Modal for Starlight */}
      <AccessModal
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
        onVerify={handleStarlightVerify}
      />

      {/* Token Modal for Admin */}
      <TokenModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        onSuccess={handleTokenSuccess}
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
        />
      </main>

      <Footer contactImage={contactImage} />
    </div>
  );
}

