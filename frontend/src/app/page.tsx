'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components/layout';
import { HeroSection, ResourceGrid, AccessDenied } from '@/components/home';
import { TokenModal, AccessModal } from '@/components/modals';
import { useAuth, useStarlightAccess, useResources, useHeaderConfig } from '@/hooks';
import { CategoryType } from '@/types';

export default function HomePage() {
  const router = useRouter();
  
  // Auth & Access hooks
  const { isAuthenticated, login, logout } = useAuth();
  const {
    hasAccess: starlightAccess,
    keyInfo: starlightKeyInfo,
    grantAccess,
    revokeAccess: revokeStarlightAccess,
  } = useStarlightAccess();
  
  // Resources hook
  const {
    resources,
    filters,
    isLoading,
    error,
    getFilteredResources,
    getAvailableTags,
  } = useResources();

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

  // Handle category change
  const handleCategoryChange = (category: CategoryType) => {
    // Starlight requires access key
    if (category === 'Starlight Academy' && !starlightAccess) {
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

  // Show access denied for Learning without auth
  const showAccessDenied = activeCategory === 'Learning' && !isAuthenticated;

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
        starlightAccess={starlightAccess}
        starlightKeyInfo={starlightKeyInfo}
        onStarlightLogout={handleStarlightLogout}
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

        {showAccessDenied ? (
          <AccessDenied onLogin={() => setShowTokenModal(true)} />
        ) : (
          <ResourceGrid
            resources={filteredResources}
            isLoading={isLoading}
            error={error}
            activeFilter={activeFilter}
            onClearFilters={clearFilters}
          />
        )}
      </main>

      <Footer contactImage={contactImage} />
    </div>
  );
}

