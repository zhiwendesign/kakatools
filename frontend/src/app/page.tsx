'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components/layout';
import { HeroSection, ResourceGrid } from '@/components/home';
import { TokenModal, AccessModal } from '@/components/modals';
import { useAuth, useKKStudyAccess, useResources, useHeaderConfig } from '@/hooks';
import { CategoryType } from '@/types';

export default function HomePage() {
  const router = useRouter();
  
  // Auth & Access hooks
  const { isAuthenticated, token, login, logout } = useAuth();
  const {
    hasAccess: starlightAccess,
    keyInfo: starlightKeyInfo,
    verifyKey: grantAccess,
    logout: revokekkstudyAccess,
  } = useKKStudyAccess();
  
  // Resources hook - 传递 auth token 用于获取管理员专属分类
  const {
    resources,
    filters,
    isLoading,
    error,
    getFilteredResources,
    getAvailableTags,
  } = useResources({ authToken: isAuthenticated ? token : null });

  // Header config hook
  const {
    headerConfig,
    contactImage,
    cooperationImage,
  } = useHeaderConfig();

  // UI State
  const [activeCategory, setActiveCategory] = useState<CategoryType>('AiCC');
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');

  // Modal State
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);

  // Admin automatically has kkstudy access
  const haskkstudyAccess = isAuthenticated || starlightAccess;
  
  // Only show kkstudy logout if user is NOT admin but HAS starlight access (logged in with key only)
  const showkkstudyLogout = !isAuthenticated && starlightAccess;

  // Handle category change
  const handleCategoryChange = (category: CategoryType) => {
    // Learning requires admin authentication
    if (category === 'Learning' && !isAuthenticated) {
      return; // Non-admin cannot access Learning
    }
    // 卡卡学堂 requires access key (unless admin)
    if (category === '卡卡学堂' && !haskkstudyAccess) {
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
  const handlekkstudyVerify = (token: string, keyInfo: any) => {
    grantAccess(token, keyInfo);
    setShowAccessModal(false);
    setActiveCategory('卡卡学堂');
  };

  // Handle starlight logout
  const handlekkstudyLogout = async () => {
    await revokekkstudyAccess();
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
        starlightAccess={haskkstudyAccess}
        starlightKeyInfo={starlightKeyInfo}
        onkkstudyLogout={handlekkstudyLogout}
        showkkstudyLogout={showkkstudyLogout}
      />

      {/* Access Modal for kkstudy */}
      <AccessModal
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
        onVerify={handlekkstudyVerify}
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

