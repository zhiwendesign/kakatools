'use client';

import { useState, useEffect, useCallback } from 'react';
import { Resource, CategoryType, FiltersMap, EditorViewType } from '@/types';
import { useAuth, useResources, useStarlightAccess } from '@/hooks';
import { Button, Icon, Input, Modal } from '@/components/ui';
import { ConfigHeader } from '@/components/layout';
import { TokenModal } from '@/components/modals';
import {
  ConfigListItem,
  ConfigEditor,
  AddResourceForm,
  ManageFiltersForm,
  KeyManagement,
  HeaderConfig,
  PasswordManagement,
  TagDictionary,
} from '@/components/config';
import { createResource, batchCreateResources, updateResource, deleteResource, addFilter, deleteFilter, login as apiLogin } from '@/lib/api';
import { STORAGE_KEYS } from '@/constants';

const CATEGORY_TABS: CategoryType[] = ['AIGC', 'UXTips', 'Learning', '星芒学社', '图库'];

export default function ConfigPage() {
  const { isAuthenticated, token, login, logout, isLoading: authLoading } = useAuth();
  const { hasAccess: starlightAccess, keyInfo: starlightKeyInfo } = useStarlightAccess();
  
  // Check if user is admin (either admin login or admin-type key)
  const isAdminUser = isAuthenticated || (starlightAccess && starlightKeyInfo?.userType === 'admin');
  // Check if user is admin login (not admin key)
  const isAdminLogin = isAuthenticated;
  
  // Use admin token if available, otherwise use starlight token for admin keys
  const authToken = isAuthenticated ? token : (starlightAccess && starlightKeyInfo?.userType === 'admin' ? localStorage.getItem(STORAGE_KEYS.STARLIGHT_TOKEN) : null);
  
  const { resources, filters, isLoading, setFilters, updateResource: localUpdateResource, addResource: localAddResource, deleteResource: localDeleteResource, reload: reloadResources } = useResources({ authToken: authToken || null });

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

  // Filter resources by category and search
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
    });

  // Handle resource save
  const handleSaveResource = async (updates: Partial<Resource>) => {
    if (!authToken || !editingId) return;

    const resource = resources.find((r) => r.id === editingId);
    if (!resource) return;

    const updatedResource = { ...resource, ...updates };
    const result = await updateResource(authToken, updatedResource);

    if (result.success) {
      // 如果分类改变了，切换到新分类的tab
      if (updates.category && updates.category !== resource.category) {
        setActiveTab(updates.category);
      }
      // 重新从服务器加载数据，确保数据同步
      await reloadResources();
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
    if (!authToken) return;

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
    if (!authToken) return;

    const result = await deleteFilter(authToken, category, tag);

    if (result.success) {
      // 重新从服务器加载数据，确保数据同步
      await reloadResources();
    } else {
      throw new Error(result.message || '删除失败');
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
    <div className="min-h-screen bg-background">
      <ConfigHeader isAuthenticated={isAuthenticated} onLogout={logout} />

      <div className="container mx-auto px-4 md:px-6 py-12 animate-fade-in">
        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-primary mb-2">配置</h2>
              <p className="text-secondary text-sm">管理资源详情、链接和菜单。</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Tag Dictionary Button */}
              <Button
                variant="outline"
                onClick={() => {
                  setShowTagDictionary(true);
                  setShowManageFilters(false);
                  setEditorView('resource');
                  setShowAddForm(false);
                  setEditingId(null);
                }}
              >
                <Icon name="list" size={16} /> 标签字典
              </Button>
              {/* Header Config Button - Only for admin login */}
              {isAdminLogin && (
                <Button
                  variant={editorView === 'header' ? 'secondary' : 'outline'}
                  onClick={() => {
                    setEditorView('header');
                    setEditingId(null);
                    setShowAddForm(false);
                    setShowManageFilters(false);
                  }}
                >
                  <Icon name="layout" size={16} /> 头部配置
                </Button>
              )}

              {/* Access Keys Button - Only for admin login */}
              {isAdminLogin && (
                <Button
                  variant={editorView === 'keys' ? 'secondary' : 'outline'}
                  onClick={() => {
                    setEditorView('keys');
                    setEditingId(null);
                    setShowAddForm(false);
                    setShowManageFilters(false);
                    setShowTagDictionary(false);
                  }}
                >
                  <Icon name="key" size={16} /> Access Keys
                </Button>
              )}

              {/* Password Management Button */}
              <Button
                variant={editorView === 'password' ? 'secondary' : 'outline'}
                onClick={() => {
                  setEditorView('password');
                  setEditingId(null);
                  setShowAddForm(false);
                  setShowManageFilters(false);
                  setShowTagDictionary(false);
                }}
              >
                <Icon name="lock" size={16} /> 密码管理
              </Button>

              {/* Manage Filters Button */}
              <Button
                variant="outline"
                onClick={() => {
                  setShowManageFilters(true);
                  setShowTagDictionary(false);
                  setEditorView('resource');
                  setShowAddForm(false);
                  setEditingId(null);
                }}
              >
                <Icon name="tag" size={16} /> 管理菜单
              </Button>

              {/* Add New Resource Button */}
              <Button
                onClick={() => {
                  setShowAddForm(true);
                  setEditorView('resource');
                  setEditingId(null);
                  setShowManageFilters(false);
                  setShowTagDictionary(false);
                }}
              >
                <Icon name="plus" size={16} /> 新增卡片
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-4 min-w-0">
            <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-2xl p-6 min-w-0 shadow-sm">
              {/* Tab Navigation */}
              <div className="flex bg-white/60 backdrop-blur-sm rounded-lg p-1 mb-4 gap-1 min-w-0 border border-border/40">
                {CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap min-w-0 ${
                      activeTab === tab
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    {tab === '星芒学社' ? '星芒学社' : tab}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="search" size={16} className="text-secondary" />
                </div>
                <Input
                  type="text"
                  placeholder={`搜索${activeTab}资源...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-primary transition-colors"
                  >
                    <Icon name="x" size={16} />
                  </button>
                )}
              </div>

              {/* Resource List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="py-12 text-center text-secondary">
                    <Icon name="loader" size={24} className="animate-spin mx-auto mb-2" />
                    <p className="text-sm">加载中...</p>
                  </div>
                ) : filteredResources.length === 0 ? (
                  <div className="py-12 text-center text-secondary">
                    <Icon name="box" size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无数据</p>
                  </div>
                ) : (
                  filteredResources.map((resource) => (
                    <ConfigListItem
                      key={resource.id}
                      resource={resource}
                      onEdit={() => {
                        setEditingId(resource.id);
                        setShowAddForm(false);
                        setShowManageFilters(false);
                        setEditorView('resource');
                      }}
                      onDelete={() => handleDeleteResource(resource.id)}
                      isActive={editingId === resource.id && editorView === 'resource'}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Editor Panel */}
          <div className="lg:col-span-8">
            <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-2xl shadow-sm min-h-[500px]">
              {editorView === 'header' && isAdminLogin ? (
                <HeaderConfig onSave={() => {}} token={token} />
              ) : editorView === 'keys' && isAdminLogin ? (
                <div className="p-8 animate-fade-in">
                  <div className="mb-8 pb-4 border-b border-border">
                    <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                      <Icon name="key" size={24} className="text-yellow-500" />
                      Access Keys Management
                    </h3>
                    <p className="text-sm text-secondary mt-1">管理 星芒学社 的访问密钥</p>
                  </div>
                  <KeyManagement
                    isAuthenticated={isAuthenticated}
                    onTokenRequired={() => setShowTokenModal(true)}
                  />
                </div>
              ) : editorView === 'password' ? (
                <div className="p-8 animate-fade-in">
                  <div className="mb-8 pb-4 border-b border-border">
                    <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                      <Icon name="lock" size={24} className="text-blue-500" />
                      密码管理
                    </h3>
                    <p className="text-sm text-secondary mt-1">更改管理员登录密码</p>
                  </div>
                  <PasswordManagement
                    isAuthenticated={isAuthenticated}
                    onTokenRequired={() => setShowTokenModal(true)}
                  />
                </div>
              ) : showAddForm ? (
                <AddResourceForm
                  filters={filters}
                  onSave={handleAddResource}
                  onBatchSave={handleBatchAddResources}
                  onCancel={() => setShowAddForm(false)}
                />
              ) : showManageFilters ? (
                <ManageFiltersForm
                  filters={filters}
                  resources={resources}
                  onAddFilter={handleAddFilter}
                  onDeleteFilter={handleDeleteFilter}
                  onCancel={() => setShowManageFilters(false)}
                />
              ) : showTagDictionary ? (
                <TagDictionary
                  category={activeTab}
                  resources={resources}
                  filters={filters}
                  onAddFilter={handleAddFilter}
                  onDeleteFilter={handleDeleteFilter}
                  onClose={() => setShowTagDictionary(false)}
                />
              ) : editingId ? (
                <ConfigEditor
                  key={editingId}
                  resource={resources.find((r) => r.id === editingId)!}
                  filters={filters}
                  onSave={handleSaveResource}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center min-h-[500px]">
                  <div className="w-16 h-16 bg-surface-highlight rounded-full flex items-center justify-center mb-4 text-secondary/50">
                    <Icon name="edit" size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-primary">选择一个卡片进行编辑</h3>
                  <p className="text-secondary text-sm max-w-xs mt-2">
                    从左侧列表中选择一个资源来配置其标题、链接和过滤标签。
                  </p>
                </div>
              )}
            </div>
          </div>
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
