'use client';

import { useMemo, useState } from 'react';
import { Button, Icon, Input } from '@/components/ui';
import { CategoryType, Filter, Resource, FiltersMap } from '@/types';

interface TagDictionaryProps {
  category: CategoryType;
  resources: Resource[];
  filters: FiltersMap;
  onAddFilter: (category: string, label: string, tag: string) => Promise<void>;
  onDeleteFilter: (category: string, tag: string) => Promise<void>;
  onClose: () => void;
}

export default function TagDictionary({ category, resources, filters, onAddFilter, onDeleteFilter, onClose }: TagDictionaryProps) {
  const [newLabel, setNewLabel] = useState('');
  const [newTag, setNewTag] = useState('');
  const [busy, setBusy] = useState(false);

  const currentFilters: Filter[] = useMemo(() => {
    return (filters[category] || []).filter((f) => f.tag !== 'All' && f.tag !== '卡卡推荐');
  }, [filters, category]);

  const discoveredTags: string[] = useMemo(() => {
    const tagSet = new Set<string>();
    resources
      .filter((r) => r.category === category)
      .forEach((r) => r.tags.forEach((t) => tagSet.add(t)));
    currentFilters.forEach((f) => tagSet.add(f.tag));
    return Array.from(tagSet).sort();
  }, [resources, category, currentFilters]);

  const addSingle = async (label: string, tag: string) => {
    if (!label.trim() || !tag.trim()) return;
    if (currentFilters.some((f) => f.tag === tag.trim())) return;
    setBusy(true);
    try {
      await onAddFilter(category, label.trim(), tag.trim());
      setNewLabel('');
      setNewTag('');
    } finally {
      setBusy(false);
    }
  };

  const addDiscoveredMissing = async () => {
    const missing = discoveredTags.filter((t) => !currentFilters.some((f) => f.tag === t));
    if (missing.length === 0) return;
    setBusy(true);
    try {
      for (const t of missing) {
        await onAddFilter(category, t, t);
      }
    } finally {
      setBusy(false);
    }
  };

  const deleteTag = async (tag: string) => {
    setBusy(true);
    try {
      await onDeleteFilter(category, tag);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-surface-highlight px-2 py-1 rounded">
            标签字典
          </span>
          <h2 className="text-xl font-bold text-primary mt-2">{category} 标签管理</h2>
        </div>
        <Button variant="ghost" onClick={onClose}>关闭</Button>
      </div>

      <div className="space-y-8 max-w-2xl">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-primary">当前字典标签 ({currentFilters.length})</h3>
          <div className="flex flex-wrap gap-2 p-4 rounded-xl border border-border/50 bg-surface-highlight/30">
            {currentFilters.length === 0 ? (
              <p className="text-sm text-secondary">暂无字典标签</p>
            ) : (
              currentFilters.map((f) => (
                <span key={f.tag} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-secondary border border-border">
                  <span>{f.label}</span>
                  <span className="text-[10px] text-secondary/70">({f.tag})</span>
                  <button disabled={busy} onClick={() => deleteTag(f.tag)} className="text-red-600 hover:text-red-700">
                    <Icon name="trash" size={14} />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-primary">资源中发现的标签</h3>
          <div className="flex flex-wrap gap-2 p-4 rounded-xl border border-border/50 bg-surface-highlight/30">
            {discoveredTags.length === 0 ? (
              <p className="text-sm text-secondary">暂无</p>
            ) : (
              discoveredTags.map((t) => {
                const exists = currentFilters.some((f) => f.tag === t);
                return (
                  <button
                    key={t}
                    disabled={exists || busy}
                    onClick={() => addSingle(t, t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${exists ? 'bg-white text-secondary border-border opacity-60' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
                  >
                    {t}
                  </button>
                );
              })
            )}
          </div>
          <Button onClick={addDiscoveredMissing} disabled={busy} className="bg-green-600 hover:bg-green-700">
            <Icon name="plus" size={16} /> 一键加入未收录标签
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-primary">添加自定义标签</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1">显示名称</label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="如：大语言模型" />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">标签值</label>
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="如：LLM" />
            </div>
          </div>
          <Button onClick={() => addSingle(newLabel, newTag)} disabled={busy || !newLabel.trim() || !newTag.trim()}>
            <Icon name="plus" size={16} /> 添加
          </Button>
        </div>
      </div>
    </div>
  );
}
