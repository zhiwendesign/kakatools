'use client';

import { useState, useEffect, useCallback } from 'react';
import { Resource, CategoryType, FiltersMap, EditorViewType } from '@/types';
import { useAuth, useResources, useStarlightAccess } from '@/hooks';
import { Button, Icon, Input, Modal, Drawer } from '@/components/ui';
import { ConfigHeader } from '@/components/layout';
import { TokenModal } from '@/components/modals';
import {
  ConfigListItem,
  ConfigEditor,
  AddResourceForm,
  KeyManagement,
  HeaderConfig,
  PasswordManagement,
  ConfigSidebar,
  ConfigCard,
  CategoryManager,
} from '@/components/config';
import { createResource, batchCreateResources, updateResource, deleteResource, addFilter, deleteFilter, login as apiLogin, addTagDictionaryEntry, deleteTagDictionaryEntry } from '@/lib/api';
import { STORAGE_KEYS } from '@/constants';
import { getStorageItem } from '@/lib/utils';
import * as XLSX from 'xlsx';

const CATEGORY_TABS: CategoryType[] = ['AIGC', 'UXTips', 'Learning', '星芒学社', '图库'];

export default function ConfigPage() {
  const { isAuthenticated, token, login, logout, isLoading: authLoading } = useAuth();
  const { hasAccess: starlightAccess, keyInfo: starlightKeyInfo } = useStarlightAccess();

  // Check if user is admin (either admin login or admin-type key)
  const isAdminUser = isAuthenticated || (starlightAccess && starlightKeyInfo?.userType === 'admin');
  // Check if user is admin login (not admin key)
  const isAdminLogin = isAuthenticated;

  // Use admin token if available, otherwise use starlight token for admin keys
  // 优先使用 useAuth 返回的 token，如果不存在则从 storage 读取（支持加密存储）
  // 修复：确保在 isAuthenticated 为 true 时，即使 token 状态还未更新，也能从 storage 读取
  // 如果 isAuthenticated 为 true，优先从 storage 读取（因为可能 token 状态还未更新）
  const adminToken = isAuthenticated 
    ? (token || getStorageItem(STORAGE_KEYS.AUTH_TOKEN, true))
    : (token || null);
  const starlightToken = starlightAccess && starlightKeyInfo?.userType === 'admin' 
    ? (getStorageItem(STORAGE_KEYS.STARLIGHT_TOKEN, true) || localStorage.getItem(STORAGE_KEYS.STARLIGHT_TOKEN))
    : null;
  const authToken = adminToken || starlightToken;

  const { resources, filters, tagDictionary, isLoading, setFilters, updateResource: localUpdateResource, addResource: localAddResource, deleteResource: localDeleteResource, reload: reloadResources } = useResources({ authToken: authToken || null });

  const [activeTab, setActiveTab] = useState<CategoryType>('AIGC');
  const [editorView, setEditorView] = useState<EditorViewType>('resource');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showManageFilters, setShowManageFilters] = useState(false);
  const [showTagDictionary, setShowTagDictionary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);

  // Reset editor view if admin key tries to access restricted views
  useEffect(() => {
    if (!isAdminLogin && (editorView === 'header' || editorView === 'keys')) {
      setEditorView('resource');
      setEditingId(null);
    }
  }, [isAdminLogin, editorView]);

  // 筛选状态管理
  const [menuFilter, setMenuFilter] = useState('All');
  const [featuredFilter, setFeaturedFilter] = useState('All');
  const [contentTypeFilter, setContentTypeFilter] = useState('All');

  // 筛选控件数据
  const availableMenus = Array.from(new Set(resources.filter(r => r.category === activeTab).map(r => r.menu).filter(m => m)));
  const contentTypes = ['link', 'document', 'image'];

  // 增强的资源过滤逻辑
  const filteredResources = resources
    .filter((r) => r.category === activeTab)
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.tags.some((t) => t.toLowerCase().includes(query))
      );
    })
    .filter((r) => {
      if (menuFilter === 'All') return true;
      return r.menu === menuFilter;
    })
    .filter((r) => {
      if (featuredFilter === 'All') return true;
      return r.featured === (featuredFilter === 'Featured');
    })
    .filter((r) => {
      if (contentTypeFilter === 'All') return true;
      return r.contentType === contentTypeFilter;
    });

  // 重置筛选条件
  const resetFilters = () => {
    setSearchQuery('');
    setMenuFilter('All');
    setFeaturedFilter('All');
    setContentTypeFilter('All');
  };

  // Handle resource save
  const handleSaveResource = async (updates: Partial<Resource>) => {
    if (!authToken || !editingId) return;

    const resource = resources.find((r) => r.id === editingId);
    if (!resource) return;

    const updatedResource = { ...resource, ...updates };
    console.log('[handleSaveResource] 更新资源:', {
      original: resource,
      updates,
      merged: updatedResource,
      menuInUpdates: updates.menu,
      menuInMerged: updatedResource.menu,
    });
    
    const result = await updateResource(authToken, updatedResource);
    
    console.log('[handleSaveResource] 保存结果:', result);
    console.log('[handleSaveResource] 返回的资源:', result.resource);

    if (result.success) {
      // 如果分类改变了，切换到新分类的tab
      if (updates.category && updates.category !== resource.category) {
        setActiveTab(updates.category);
      }
      
      // 检查后端返回的资源是否包含 menu 字段
      if (result.resource) {
        console.log('[handleSaveResource] 后端返回的资源:', result.resource);
        console.log('[handleSaveResource] 后端返回的 menu 值:', result.resource.menu);
      }
      
      // 重新从服务器加载数据，确保数据同步
      await reloadResources();
      
      // 等待一下，确保 resources 状态已更新
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 检查保存后的资源是否包含 menu 字段
      const savedResource = resources.find((r) => r.id === editingId);
      console.log('[handleSaveResource] 重新加载后的资源:', savedResource);
      console.log('[handleSaveResource] 重新加载后的 menu 值:', savedResource?.menu);
      
      if (savedResource && savedResource.menu !== updates.menu) {
        console.warn('[handleSaveResource] 警告：保存的 menu 值与重新加载后的值不一致！', {
          保存的值: updates.menu,
          重新加载的值: savedResource.menu,
        });
      }
    } else {
      throw new Error(result.message || '保存失败');
    }
  };

  // Handle add new resource
  const handleAddResource = async (newResource: any) => {
    if (!authToken) return;

    const result = await createResource(authToken, newResource);

    if (result.success) {
      // 重新从服务器加载数据，确保数据同步
      await reloadResources();
      setShowAddForm(false);
      setActiveTab(newResource.category);
    } else {
      throw new Error(result.message || '创建失败');
    }
  };

  // Handle batch add resources
  const handleBatchAddResources = async (resources: any[]) => {
    if (!authToken) return;

    try {
      const result = await batchCreateResources(authToken, resources);

      if (result.success) {
        // 重新从服务器加载数据，确保数据同步
        await reloadResources();

        // 显示成功消息
        const message = result.message || `成功保存 ${result.results?.success || resources.length} 条资源`;
        alert(message);

        // 如果有失败的项目，显示详细信息
        if (result.results && result.results.failed > 0) {
          const errorDetails = result.results.errors
            .map(e => `第 ${e.index} 行: ${e.message}`)
            .join('\n');
          alert(`部分资源保存失败：\n${errorDetails}`);
          console.warn('批量新增部分失败:', errorDetails);
        }
      } else {
        // 显示详细的错误信息
        const errorMsg = result.message || '批量创建失败';
        const errorDetails = result.results?.errors
          ? result.results.errors.map(e => `第 ${e.index} 行: ${e.message}`).join('\n')
          : '';
        alert(`批量保存失败：${errorMsg}${errorDetails ? '\n\n详细错误：\n' + errorDetails : ''}`);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('批量保存错误:', error);
      alert(`批量保存失败：${error.message || '未知错误，请查看控制台获取详细信息'}`);
      throw error;
    }
  };

  // Handle delete resource
  const handleDeleteResource = async (id: string) => {
    if (!authToken) return;
    if (!window.confirm('确定要删除这个卡片吗？此操作无法撤销。')) return;

    const result = await deleteResource(authToken, id);

    if (result.success) {
      // 重新从服务器加载数据，确保数据同步
      await reloadResources();
      if (editingId === id) {
        setEditingId(null);
      }
    } else {
      alert(result.message || '删除失败');
    }
  };

  // Handle add filter
  const handleAddFilter = async (category: string, label: string, tag: string) => {
    if (!authToken) {
      throw new Error('需要管理员权限');
    }

    const result = await addFilter(authToken, category, label, tag);

    if (result.success) {
      // 重新从服务器加载数据，确保数据同步
      await reloadResources();
    } else {
      throw new Error(result.message || '添加失败');
    }
  };

  // Handle delete filter
  const handleDeleteFilter = async (category: string, tag: string) => {
    if (!authToken) {
      throw new Error('需要管理员权限');
    }

    const result = await deleteFilter(authToken, category, tag);

    if (result.success) {
      // 重新从服务器加载数据，确保数据同步
      await reloadResources();
    } else {
      throw new Error(result.message || '删除失败');
    }
  };

  // Handle tag dictionary
  const handleAddTag = async (category: string, label: string, tag: string) => {
    if (!authToken) return;
    const result = await addTagDictionaryEntry(authToken, category, label, tag);
    if (result.success) {
      await reloadResources();
    } else {
      throw new Error(result.message || '添加失败');
    }
  };

  const handleDeleteTag = async (category: string, tag: string) => {
    if (!authToken) return;
    const result = await deleteTagDictionaryEntry(authToken, category, tag);
    if (result.success) {
      await reloadResources();
    } else {
      throw new Error(result.message || '删除失败');
    }
  };

  // Handle Export to Excel
  const [isExporting, setIsExporting] = useState(false);
  const handleExportToExcel = () => {
    setIsExporting(true);
    try {
      const categoryResources = resources.filter((r) => r.category === activeTab);
      if (categoryResources.length === 0) {
        alert('当前分类下没有资源，无法导出');
        setIsExporting(false);
        return;
      }

      const excelData = categoryResources.map((resource) => ({
        标题: resource.title || '',
        分类: resource.category || '',
        描述: resource.description || '',
        标签: resource.tags ? resource.tags.join(',') : '',
        图片链接: resource.imageUrl || '',
        跳转链接: resource.link || '',
        卡卡推荐: resource.featured ? '是' : '否',
        内容类型: resource.contentType === 'document' ? 'document' : 'link',
        文档内容: resource.content || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '资源列表');
      const fileName = `${activeTab}_资源列表_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      alert(`成功导出 ${categoryResources.length} 条资源到 ${fileName}`);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle login
  const handleLogin = async (password: string): Promise<boolean> => {
    try {
      const result = await apiLogin(password);
      if (result.success && result.token) {
        login(result.token);
        // Wait a bit for state to update
        await new Promise(resolve => setTimeout(resolve, 100));
        setShowTokenModal(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icon name="loader" size={32} className="animate-spin mx-auto mb-4 text-primary" />
          <p className="text-secondary">验证身份中...</p>
        </div>
      </div>
    );
  }

  // Re-check admin status after auth loading completes
  // This ensures we have the latest auth state
  const hasAdminAccess = isAuthenticated || (starlightAccess && starlightKeyInfo?.userType === 'admin');

  // Auth check - show login modal if not authenticated (admin login or admin key)
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-background">
        <ConfigHeader isAuthenticated={false} onLogout={logout} />

        <div className="container mx-auto px-4 md:px-6 py-12 animate-fade-in">
          <div className="flex flex-col items-center justify-center py-32 border border-dashed border-border/60 rounded-2xl bg-white/50 backdrop-blur-sm shadow-sm">
            <div className="p-4 bg-surface rounded-full mb-4 shadow-sm">
              <Icon name="lock" size={24} className="text-secondary/50" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">需要管理员权限</h3>
            <p className="text-secondary text-sm max-w-xs text-center mb-4">
              请先通过身份验证以访问配置功能。
            </p>
            <Button onClick={() => setShowTokenModal(true)}>
              <Icon name="key" size={16} /> 身份验证
            </Button>
          </div>
        </div>

        <TokenModal
          isOpen={showTokenModal}
          onClose={() => setShowTokenModal(false)}
          onLogin={handleLogin}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <ConfigHeader isAuthenticated={isAuthenticated} onLogout={logout} />

      <div className="flex flex-1 overflow-hidden">
        {/* New Sidebar Layout */}
        <ConfigSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          editorView={editorView}
          setEditorView={(view: EditorViewType) => {
            setEditorView(view);
            if (view === 'resource') {
              setShowAddForm(false);
              setEditingId(null);
            }
          }}
          isAdminLogin={isAdminLogin}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#F8F9FA] p-8">
          <div className="max-w-[1400px] mx-auto">
            {/* Breadcrumbs & Header (only for resource view) */}
            {editorView === 'resource' && (
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 text-xs text-secondary mb-2">
                    <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => setEditorView('resource')}>
                      资源管理
                    </span>
                    {(showAddForm || editingId) && (
                      <>
                        <Icon name="ChevronRight" size={10} />
                        <span className="font-semibold text-primary">{activeTab}</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-3xl font-bold text-primary tracking-tight">
                      { !showAddForm && !editingId ? `${activeTab} 资源` :
                        showAddForm ? '新增卡片' : '编辑卡片' }
                  </h2>
                </div>

                {/* Action Buttons */}
                {editorView === 'resource' && (
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={handleExportToExcel}
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <Icon name="loader" size={18} className="animate-spin" />
                      ) : (
                        <Icon name="download" size={18} />
                      )}
                      导出 Excel
                    </Button>
                    <Button
                      variant="gradient"
                      onClick={() => {
                        setShowAddForm(true);
                        setEditorView('resource');
                        setEditingId(null);
                      }}
                    >
                      <Icon name="Plus" size={18} />
                      新增卡片
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Content Views */}
            <div className="animate-fade-in">
              {editorView === 'header' && isAdminLogin ? (
                <HeaderConfig onSave={() => { 
                  // 保存成功后，刷新页面以确保配置生效
                  window.location.reload();
                }} token={token} />
              ) : editorView === 'keys' && isAdminLogin ? (
                <KeyManagement
                  isAuthenticated={isAuthenticated}
                  onTokenRequired={() => setShowTokenModal(true)}
                />
              ) : editorView === 'password' ? (
                <PasswordManagement
                  isAuthenticated={isAuthenticated}
                  onTokenRequired={() => setShowTokenModal(true)}
                />
              ) : (editorView === 'categoryMenu' || editorView === 'categoryTags') ? (
                <CategoryManager
                  filters={filters}
                  tagDictionary={tagDictionary}
                  resources={resources}
                  onAddFilter={handleAddFilter}
                  onDeleteFilter={handleDeleteFilter}
                  onAddTag={handleAddTag}
                  onDeleteTag={handleDeleteTag}
                  mode={editorView === 'categoryMenu' ? 'menu' : 'tags'}
                />
              ) : (
                <>
                  {/* Filter Controls */}
                  <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-border/60">
                    <div className="flex flex-col gap-4">
                      {/* Search Bar */}
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={`搜索${activeTab}资源...`}
                          className="w-full pl-10 pr-4 py-2 border border-border/80 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none transition-all"
                        />
                        <Icon name="Search" size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                          >
                            <Icon name="X" size={18} />
                          </button>
                        )}
                      </div>

                      {/* Filter Options */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Menu Filter */}
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-2">菜单筛选</label>
                          <select
                            value={menuFilter}
                            onChange={(e) => setMenuFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-border/80 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none transition-all text-sm"
                          >
                            <option value="All">全部</option>
                            {availableMenus.map((menu) => (
                              <option key={menu} value={menu}>{menu}</option>
                            ))}
                          </select>
                        </div>

                        {/* Featured Filter */}
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-2">特色筛选</label>
                          <select
                            value={featuredFilter}
                            onChange={(e) => setFeaturedFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-border/80 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none transition-all text-sm"
                          >
                            <option value="All">全部</option>
                            <option value="Featured">卡卡推荐</option>
                            <option value="NotFeatured">非推荐</option>
                          </select>
                        </div>

                        {/* Content Type Filter */}
                        <div>
                          <label className="block text-xs font-medium text-secondary mb-2">内容类型</label>
                          <select
                            value={contentTypeFilter}
                            onChange={(e) => setContentTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-border/80 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none transition-all text-sm"
                          >
                            <option value="All">全部</option>
                            {contentTypes.map((type) => (
                              <option key={type} value={type}>{type === 'link' ? '跳转链接' : type === 'document' ? '文档内容' : '上传图片'}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Reset Button */}
                      {(searchQuery || menuFilter !== 'All' || featuredFilter !== 'All' || contentTypeFilter !== 'All') && (
                        <div className="flex justify-end">
                          <button
                            onClick={resetFilters}
                            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                          >
                            <Icon name="RefreshCw" size={14} />
                            重置筛选
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grid View for Resources */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-6">
                    {/* Resource Cards */}
                    {isLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="aspect-[4/3] bg-white rounded-2xl border border-border/60 animate-pulse flex flex-col">
                          <div className="aspect-video bg-surface rounded-t-2xl" />
                          <div className="p-4 space-y-2">
                            <div className="h-4 bg-surface rounded w-2/3" />
                            <div className="h-3 bg-surface rounded w-full" />
                          </div>
                        </div>
                      ))
                    ) : filteredResources.length === 0 ? (
                      <div className="col-span-full py-20 text-center text-secondary bg-white/50 border-2 border-dashed border-border/40 rounded-3xl">
                        <Icon name="Box" size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-medium text-lg">当前分类下暂无资源</p>
                        <p className="text-sm opacity-60">点击右上角的“新增卡片”开始添加</p>
                      </div>
                    ) : (
                      filteredResources.map((resource) => (
                        <ConfigCard
                          key={resource.id}
                          item={resource}
                          tagDictionary={tagDictionary}
                          isActive={editingId === resource.id}
                          onClick={() => {
                            setEditingId(resource.id);
                            setEditorView('resource');
                          }}
                          onDelete={async (id: string, e: React.MouseEvent) => {
                            e.stopPropagation();
                            await handleDeleteResource(id);
                          }}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Drawer for Add/Edit Resource */}
      <Drawer
        isOpen={showAddForm || !!editingId}
        onClose={() => {
          setShowAddForm(false);
          setEditingId(null);
        }}
        title={showAddForm ? `新建${activeTab}卡片` : '编辑资源详情'}
        description={showAddForm ? activeTab : (editingId ? `正在编辑: ${resources.find(r => r.id === editingId)?.title}` : undefined)}
      >
        {showAddForm ? (
          <AddResourceForm
            filters={filters}
            tagDictionary={tagDictionary}
            initialCategory={activeTab}
            onSave={handleAddResource}
            onBatchSave={handleBatchAddResources}
            onCancel={() => setShowAddForm(false)}
          />
        ) : editingId ? (
          <ConfigEditor
            key={`${editingId}-${Date.now()}`}
            resource={(() => {
              const res = resources.find((r) => r.id === editingId);
              console.log('[ConfigPage] 传递给 ConfigEditor 的资源:', res);
              console.log('[ConfigPage] 资源的 menu 值:', res?.menu);
              return res!;
            })()}
            filters={filters}
            tagDictionary={tagDictionary}
            onSave={async (updates) => {
              await handleSaveResource(updates);
              // 保存后不关闭抽屉，继续编辑
            }}
          />
        ) : null}
      </Drawer>
      <TokenModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}
