'use client';

import { useState, useEffect, useCallback } from 'react';
import { Resource, CategoryType, FiltersMap, EditorViewType } from '@/types';
import { useAuth, useResources } from '@/hooks';
import { Button, Icon, Input, Modal } from '@/components/ui';
import { Header } from '@/components/layout';
import { TokenModal } from '@/components/modals';
import {
  ConfigListItem,
  ConfigEditor,
  AddResourceForm,
  ManageFiltersForm,
  KeyManagement,
  HeaderConfig,
} from '@/components/config';
import { createResource, updateResource, deleteResource, addFilter, deleteFilter } from '@/lib/api';
import { STORAGE_KEYS } from '@/constants';

const CATEGORY_TABS: CategoryType[] = ['AiCC', 'UXLib', 'Learning', 'Starlight Academy'];

export default function ConfigPage() {
  const { isAuthenticated, token, login, logout } = useAuth();
  const { resources, filters, isLoading, setFilters, updateResource: localUpdateResource, addResource: localAddResource, deleteResource: localDeleteResource } = useResources();

  const [activeTab, setActiveTab] = useState<CategoryType>('AiCC');
  const [editorView, setEditorView] = useState<EditorViewType>('resource');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showManageFilters, setShowManageFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);

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
    if (!token || !editingId) return;

    const resource = resources.find((r) => r.id === editingId);
    if (!resource) return;

    const updatedResource = { ...resource, ...updates };
    const result = await updateResource(token, updatedResource);

    if (result.success) {
      localUpdateResource(editingId, updates);
    } else {
      throw new Error(result.message || '保存失败');
    }
  };

  // Handle add new resource
  const handleAddResource = async (newResource: any) => {
    if (!token) return;

    const result = await createResource(token, newResource);

    if (result.success) {
      localAddResource(newResource);
      setShowAddForm(false);
      setActiveTab(newResource.category);
    } else {
      throw new Error(result.message || '创建失败');
    }
  };

  // Handle delete resource
  const handleDeleteResource = async (id: string) => {
    if (!token) return;
    if (!window.confirm('确定要删除这个卡片吗？此操作无法撤销。')) return;

    const result = await deleteResource(token, id);

    if (result.success) {
      localDeleteResource(id);
      if (editingId === id) {
        setEditingId(null);
      }
    } else {
      alert(result.message || '删除失败');
    }
  };

  // Handle add filter
  const handleAddFilter = async (category: string, label: string, tag: string) => {
    if (!token) return;

    const result = await addFilter(token, category, label, tag);

    if (result.success && result.filters) {
      setFilters({
        ...filters,
        [category as CategoryType]: result.filters,
      });
    } else {
      throw new Error(result.message || '添加失败');
    }
  };

  // Handle delete filter
  const handleDeleteFilter = async (category: string, tag: string) => {
    if (!token) return;

    const result = await deleteFilter(token, category, tag);

    if (result.success) {
      setFilters({
        ...filters,
        [category as CategoryType]: filters[category as CategoryType].filter((f) => f.tag !== tag),
      });
    } else {
      throw new Error(result.message || '删除失败');
    }
  };

  // Handle login
  const handleLogin = async (password: string) => {
    const success = await login(password);
    if (success) {
      setShowTokenModal(false);
    }
    return success;
  };

  // Auth check - show login modal if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          onCategoryChange={() => {}}
          activeCategory="AiCC"
          isAuthenticated={false}
          onConfigClick={() => setShowTokenModal(true)}
          onLogout={logout}
        />

        <div className="container mx-auto px-4 md:px-6 py-12 animate-fade-in">
          <div className="flex flex-col items-center justify-center py-32 border border-dashed border-border rounded-2xl bg-surface-highlight/30">
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
      <Header
        onCategoryChange={() => {}}
        activeCategory="AiCC"
        isAuthenticated={isAuthenticated}
        onConfigClick={() => {}}
        onLogout={logout}
      />

      <div className="container mx-auto px-4 md:px-6 py-12 animate-fade-in">
        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-primary mb-2">配置</h2>
              <p className="text-secondary text-sm">管理资源详情、链接和过滤标签。</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Header Config Button */}
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

              {/* Access Keys Button */}
              <Button
                variant={editorView === 'keys' ? 'secondary' : 'outline'}
                onClick={() => {
                  setEditorView('keys');
                  setEditingId(null);
                  setShowAddForm(false);
                  setShowManageFilters(false);
                }}
              >
                <Icon name="key" size={16} /> Access Keys
              </Button>

              {/* Manage Filters Button */}
              <Button
                variant="outline"
                onClick={() => {
                  setShowManageFilters(true);
                  setEditorView('resource');
                  setShowAddForm(false);
                  setEditingId(null);
                }}
              >
                <Icon name="tag" size={16} /> 管理标签
              </Button>

              {/* Add New Resource Button */}
              <Button
                onClick={() => {
                  setShowAddForm(true);
                  setEditorView('resource');
                  setEditingId(null);
                  setShowManageFilters(false);
                }}
              >
                <Icon name="plus" size={16} /> 新增卡片
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="bg-surface border border-border rounded-2xl p-6">
              {/* Tab Navigation */}
              <div className="flex bg-surface-highlight rounded-lg p-1 mb-4">
                {CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                      activeTab === tab
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    {tab === 'Starlight Academy' ? 'Starlight' : tab}
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
            <div className="bg-surface border border-border rounded-2xl shadow-sm min-h-[500px]">
              {editorView === 'header' ? (
                <HeaderConfig onSave={() => {}} />
              ) : editorView === 'keys' ? (
                <div className="p-8 animate-fade-in">
                  <div className="mb-8 pb-4 border-b border-border">
                    <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                      <Icon name="key" size={24} className="text-yellow-500" />
                      Access Keys Management
                    </h3>
                    <p className="text-sm text-secondary mt-1">管理 Starlight Academy 的访问密钥</p>
                  </div>
                  <KeyManagement
                    isAuthenticated={isAuthenticated}
                    onTokenRequired={() => setShowTokenModal(true)}
                  />
                </div>
              ) : showAddForm ? (
                <AddResourceForm
                  filters={filters}
                  onSave={handleAddResource}
                  onCancel={() => setShowAddForm(false)}
                />
              ) : showManageFilters ? (
                <ManageFiltersForm
                  filters={filters}
                  onAddFilter={handleAddFilter}
                  onDeleteFilter={handleDeleteFilter}
                  onCancel={() => setShowManageFilters(false)}
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

