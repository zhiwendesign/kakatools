'use client';

import { useMemo, useState } from 'react';
import { Button, Icon, Input, ConfirmDialog, useToast } from '@/components/ui';
import { CategoryType, Filter, Resource, FiltersMap } from '@/types';
import { cn } from '@/lib/utils';

interface TagDictionaryProps {
  activeCategory: CategoryType;
  resources: Resource[];
  tagDictionary: FiltersMap;
  onAddTag: (category: string, label: string, tag: string) => Promise<void>;
  onDeleteTag: (category: string, tag: string) => Promise<void>;
}

export default function TagDictionary({
  activeCategory,
  resources,
  tagDictionary,
  onAddTag,
  onDeleteTag
}: TagDictionaryProps) {
  const [newLabel, setNewLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ tag: string; label: string } | null>(null);
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dictionarySearchQuery, setDictionarySearchQuery] = useState('');
  const toast = useToast();

  const currentRegisteredTags: Filter[] = useMemo(() => {
    return (tagDictionary[activeCategory] || []).filter((f) => f.tag !== 'All' && f.tag !== '卡卡推荐');
  }, [tagDictionary, activeCategory]);

  const discoveredTags: string[] = useMemo(() => {
    const tagSet = new Set<string>();
    resources
      .filter((r) => r.category === activeCategory)
      .forEach((r) => r.tags.forEach((t) => tagSet.add(t)));
    currentRegisteredTags.forEach((f) => tagSet.add(f.tag));
    return Array.from(tagSet).sort();
  }, [resources, activeCategory, currentRegisteredTags]);

  const addSingle = async (label: string, tag: string) => {
    const trimmedLabel = label.trim();
    const trimmedTag = tag.trim();

    // If no label provided, return early
    if (!trimmedLabel) {
      toast.warning('请输入标签名称');
      return;
    }

    // Use label as tag if tag is empty
    const finalTag = trimmedTag || trimmedLabel;

    // Check if tag already exists
    if (currentRegisteredTags.some((f) => f.tag === finalTag)) {
      toast.warning('该标签已存在');
      return;
    }

    setBusy(true);
    try {
      await onAddTag(activeCategory, trimmedLabel, finalTag);
      // 等待一小段时间确保数据已刷新
      await new Promise(resolve => setTimeout(resolve, 100));
      setNewLabel('');
      toast.success(`标签 "${trimmedLabel}" 已添加到字典`);
    } catch (error) {
      toast.error('添加失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  };

  const addDiscoveredMissing = async () => {
    const missing = discoveredTags.filter((t) => !currentRegisteredTags.some((f) => f.tag === t));
    if (missing.length === 0) {
      toast.info('没有需要收录的新标签');
      return;
    }

    setBusy(true);
    try {
      for (const t of missing) {
        await onAddTag(activeCategory, t, t);
      }
      // 等待一小段时间确保数据已刷新
      await new Promise(resolve => setTimeout(resolve, 100));
      toast.success(`成功收录 ${missing.length} 个新标签`);
    } catch (error) {
      toast.error('批量收录失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteClick = (filter: Filter) => {
    setConfirmDelete({ tag: filter.tag, label: filter.label });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;

    setDeletingTag(confirmDelete.tag);
    try {
      await onDeleteTag(activeCategory, confirmDelete.tag);
      // 等待一小段时间确保数据已刷新
      await new Promise(resolve => setTimeout(resolve, 100));
      toast.success(`标签 "${confirmDelete.label}" 已从字典中删除`);
      setConfirmDelete(null);
    } catch (error) {
      toast.error('删除失败，请稍后重试');
    } finally {
      setDeletingTag(null);
    }
  };

  const missingFromDictionary = discoveredTags.filter((t) => !currentRegisteredTags.some((f) => f.tag === t));

  // 过滤发现的标签
  const filteredDiscoveredTags = useMemo(() => {
    if (!searchQuery.trim()) return discoveredTags;
    const query = searchQuery.toLowerCase();
    return discoveredTags.filter(t => t.toLowerCase().includes(query));
  }, [discoveredTags, searchQuery]);

  // 过滤已注册的标签
  const filteredRegisteredTags = useMemo(() => {
    if (!dictionarySearchQuery.trim()) return currentRegisteredTags;
    const query = dictionarySearchQuery.toLowerCase();
    return currentRegisteredTags.filter(f => 
      f.label.toLowerCase().includes(query) || f.tag.toLowerCase().includes(query)
    );
  }, [currentRegisteredTags, dictionarySearchQuery]);

  return (
    <>
      <div className="space-y-8 animate-fade-in px-2">
        <div className="space-y-4">
          <label className="text-sm font-bold text-primary flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="Search" size={16} className="text-primary" />
              <span>智能标签发现</span>
            </div>
            {missingFromDictionary.length > 0 && (
              <Button
                size="sm"
                onClick={addDiscoveredMissing}
                disabled={busy}
                variant="outline"
                className="h-7 text-[10px] text-primary border-primary/20 hover:bg-primary/5"
              >
                {busy ? (
                  <>
                    <Icon name="loader" size={12} className="animate-spin mr-1" />
                    收录中...
                  </>
                ) : (
                  `一键收录全部 (${missingFromDictionary.length})`
                )}
              </Button>
            )}
          </label>

          <div className="p-5 rounded-2xl border border-border/20 bg-gradient-to-br from-white via-surface/30 to-surface/20 shadow-sm">
            <div className="flex items-start gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-primary/5 mt-0.5">
                <Icon name="Info" size={12} className="text-primary" />
              </div>
              <p className="text-[11px] text-secondary/80 leading-relaxed flex-1">
                系统根据该分类下所有资源提取出的原始标签。
                <span className="inline-flex items-center gap-1.5 ml-2">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm"></span>
                    <span className="text-[10px]">已收录</span>
                  </span>
                  <span className="text-secondary/40">•</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border border-gray-300"></span>
                    <span className="text-[10px]">待收录</span>
                  </span>
                </span>
              </p>
            </div>
            
            {/* 搜索框 */}
            <div className="relative mb-4">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索标签..."
                className="pl-9 pr-9 h-10 text-sm bg-white/80 backdrop-blur-sm border-border/50 focus:bg-white focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/60">
                <Icon name="Search" size={14} />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary/50 hover:text-primary transition-colors p-1 rounded hover:bg-primary/5"
                >
                  <Icon name="X" size={12} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5 min-h-[60px]">
              {filteredDiscoveredTags.length === 0 ? (
                <div className="w-full py-8 text-center">
                  <Icon name="Search" size={24} className="mx-auto mb-2 text-secondary/30" />
                  <span className="text-xs text-secondary/60 italic">
                    {searchQuery ? '未找到匹配的标签' : '当前分类下暂无发现标签'}
                  </span>
                </div>
              ) : (
                filteredDiscoveredTags.map((t) => {
                  const isRegistered = currentRegisteredTags.some((f) => f.tag === t);
                  return (
                    <button
                      key={t}
                      onClick={() => !isRegistered && addSingle(t, t)}
                      disabled={isRegistered || busy}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 flex items-center gap-2",
                        "backdrop-blur-sm shadow-sm",
                        isRegistered
                          ? "bg-gradient-to-br from-blue-50 via-blue-50/80 to-indigo-50/50 text-blue-700 border border-blue-200/60 cursor-default shadow-blue-100/50"
                          : "bg-gradient-to-br from-white via-gray-50/50 to-white text-gray-700 border border-gray-200/60 hover:border-primary/40 hover:bg-gradient-to-br hover:from-primary/5 hover:via-primary/5 hover:to-indigo-50/30 hover:text-primary hover:shadow-md hover:shadow-primary/10 hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer"
                      )}
                      title={isRegistered ? '已收录' : '点击添加到字典'}
                    >
                      <span className="relative">
                        {t}
                        {isRegistered && (
                          <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-blue-500 border border-white shadow-sm"></span>
                        )}
                      </span>
                      {!isRegistered && (
                        <Icon 
                          name="Plus" 
                          size={11} 
                          className={cn(
                            "transition-all duration-200",
                            busy ? "opacity-30" : "opacity-70 group-hover:opacity-100"
                          )} 
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-border/30">
          <label className="text-sm font-bold text-primary flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/5">
              <Icon name="Plus" size={14} className="text-primary" />
            </div>
            <span>手动映射新标签</span>
          </label>

          <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-white/50 via-surface/20 to-white/30 border border-border/20">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-secondary/80 ml-1 flex items-center gap-1.5">
                <Icon name="Type" size={11} className="text-secondary/50" />
                显示名称
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newLabel.trim() && !busy) {
                        addSingle(newLabel, '');
                      }
                    }}
                    placeholder="如：大语言模型"
                    className="pl-10 pr-10 bg-white/80 backdrop-blur-sm border-border/50 focus:bg-white focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm h-11 text-sm"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/50">
                    <Icon name="Type" size={14} />
                  </div>
                  {newLabel && (
                    <button
                      onClick={() => setNewLabel('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/50 hover:text-primary transition-colors p-1 rounded hover:bg-primary/5"
                    >
                      <Icon name="X" size={12} />
                    </button>
                  )}
                </div>
                <Button
                  onClick={() => addSingle(newLabel, '')}
                  disabled={busy || !newLabel.trim()}
                  className="h-11 btn-gradient px-6 rounded-xl font-semibold active:scale-[0.98] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                >
                  {busy ? (
                    <>
                      <Icon name="loader" size={16} className="animate-spin mr-2" />
                      添加中...
                    </>
                  ) : (
                    <>
                      <Icon name="Plus" size={14} className="mr-2" />
                      添加到字典
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* 快速选择提示 */}
            {missingFromDictionary.length > 0 && !newLabel && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/30 border border-blue-100/40">
                <Icon name="Info" size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-secondary/70 leading-relaxed">
                  提示：你也可以直接点击上方"智能标签发现"中的待收录标签快速添加
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-border/30">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-primary flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/5">
                <Icon name="BookOpen" size={14} className="text-primary" />
              </div>
              <span>字典内注册标签 ({currentRegisteredTags.length})</span>
            </label>
            {currentRegisteredTags.length > 0 && (
              <span className="text-[10px] font-normal text-secondary/50">
                悬停显示删除
              </span>
            )}
          </div>

          {/* 搜索框 */}
          {currentRegisteredTags.length > 0 && (
            <div className="relative">
              <Input
                value={dictionarySearchQuery}
                onChange={(e) => setDictionarySearchQuery(e.target.value)}
                placeholder="搜索已注册的标签..."
                className="pl-9 pr-9 h-10 text-sm bg-white/80 backdrop-blur-sm border-border/50 focus:bg-white focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/50">
                <Icon name="Search" size={14} />
              </div>
              {dictionarySearchQuery && (
                <button
                  onClick={() => setDictionarySearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary/50 hover:text-primary transition-colors p-1 rounded hover:bg-primary/5"
                >
                  <Icon name="X" size={12} />
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredRegisteredTags.length === 0 ? (
              <div className="col-span-full py-12 text-center text-secondary/60 bg-gradient-to-br from-surface/20 via-surface/10 to-white/30 rounded-2xl border border-dashed border-border/30">
                <div className="p-3 rounded-full bg-secondary/5 w-fit mx-auto mb-3">
                  <Icon name="Box" size={24} className="text-secondary/30" />
                </div>
                <p className="text-sm font-medium mb-1">
                  {dictionarySearchQuery ? '未找到匹配的标签' : '当前字典暂无标签'}
                </p>
                {dictionarySearchQuery && (
                  <button
                    onClick={() => setDictionarySearchQuery('')}
                    className="mt-2 text-xs text-primary hover:underline font-medium"
                  >
                    清除搜索条件
                  </button>
                )}
              </div>
            ) : (
              filteredRegisteredTags.map((f) => (
                <div
                  key={f.tag}
                  className="group flex items-center justify-between p-4 bg-gradient-to-br from-white via-blue-50/20 to-white rounded-xl border border-border/30 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-primary truncate">{f.label}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 border border-white shadow-sm flex-shrink-0"></span>
                    </div>
                    <span className="text-[10px] text-secondary/60 font-mono truncate bg-surface/30 px-1.5 py-0.5 rounded inline-block w-fit">{f.tag}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteClick(f)}
                    disabled={deletingTag === f.tag}
                    className={cn(
                      "ml-3 p-2.5 text-secondary/60 rounded-lg transition-all duration-200 flex-shrink-0",
                      "hover:text-red-500 hover:bg-gradient-to-br hover:from-red-50 hover:to-red-50/50",
                      "opacity-70 group-hover:opacity-100",
                      deletingTag === f.tag && "opacity-50 cursor-not-allowed"
                    )}
                    title="删除标签"
                  >
                    {deletingTag === f.tag ? (
                      <Icon name="loader" size={14} className="animate-spin" />
                    ) : (
                      <Icon name="Trash" size={14} />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
        title="确认删除标签"
        message={
          confirmDelete ? (
            <div className="space-y-2">
              <p>
                确定要从字典中删除标签 <span className="font-bold text-primary">"{confirmDelete.label}"</span> 吗？
              </p>
              <p className="text-xs text-secondary">
                删除后，该标签将不再出现在筛选选项中，但不会影响已有资源的标签数据。
              </p>
            </div>
          ) : (
            ''
          )
        }
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
        isLoading={!!deletingTag}
      />
    </>
  );
}
