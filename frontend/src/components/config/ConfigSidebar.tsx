'use client';

import { CategoryType, EditorViewType } from '@/types';
import { Icon, IconName } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SidebarItem {
    id: string;
    label: string;
    icon: IconName;
    parentId?: string;
    view?: string;
    category?: CategoryType;
}

interface ConfigSidebarProps {
    activeTab: CategoryType;
    setActiveTab: (tab: CategoryType) => void;
    editorView: EditorViewType;
    setEditorView: (view: EditorViewType) => void;
    isAdminLogin: boolean;
}

export function ConfigSidebar({
    activeTab,
    setActiveTab,
    editorView,
    setEditorView,
    isAdminLogin,
}: ConfigSidebarProps) {
    const [isResourceOpen, setIsResourceOpen] = useState(true);
    const [isCategoryOpen, setIsCategoryOpen] = useState(true);

    const categories: CategoryType[] = ['AIGC', 'UXTips', 'Learning', '星芒学社', '图库'];

    return (
        <div className="w-64 flex-shrink-0 border-r border-border bg-white flex flex-col h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
            <div className="flex-1 py-6 px-4">
                {/* Resource Management */}
                <div className="mb-2">
                    <button
                        onClick={() => setIsResourceOpen(!isResourceOpen)}
                        className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors rounded-lg hover:bg-surface"
                    >
                        <div className="flex items-center gap-3">
                            <Icon name="LayoutGrid" size={18} />
                            <span>资源管理</span>
                        </div>
                        <Icon
                            name="ChevronDown"
                            size={14}
                            className={cn("transition-transform duration-200", !isResourceOpen && "-rotate-90")}
                        />
                    </button>

                    {isResourceOpen && (
                        <div className="mt-1 space-y-0.5 border-l-2 border-border/30 ml-3 pl-3 transition-all duration-200">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => {
                                        setActiveTab(cat);
                                        setEditorView('resource');
                                    }}
                                    className={cn(
                                        "w-full text-left px-3 py-1.5 text-xs rounded-md transition-all duration-150",
                                        activeTab === cat && editorView === 'resource'
                                            ? "bg-surfaceHighlight text-primary font-semibold"
                                            : "text-secondary hover:text-primary hover:bg-surface/50 font-medium"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Other Sections */}
                <div className="space-y-0.5">
                    {/* Category Config Nested */}
                    <div className="mb-2">
                        <button
                            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                            className={cn(
                                "w-full flex items-center justify-between px-2 py-2 text-sm font-medium transition-colors rounded-lg",
                                (editorView === 'categoryMenu' || editorView === 'categoryTags')
                                    ? "text-primary"
                                    : "text-secondary hover:text-primary hover:bg-surface"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Icon name="Settings2" size={18} />
                                <span>分类配置</span>
                            </div>
                            <Icon
                                name="ChevronDown"
                                size={14}
                                className={cn("transition-transform duration-200", !isCategoryOpen && "-rotate-90")}
                            />
                        </button>

                        {isCategoryOpen && (
                            <div className="mt-1 space-y-0.5 border-l-2 border-border/30 ml-3 pl-3 transition-all duration-200">
                                <button
                                    onClick={() => setEditorView('categoryMenu')}
                                    className={cn(
                                        "w-full text-left px-3 py-1.5 text-xs rounded-md transition-all duration-150",
                                        editorView === 'categoryMenu'
                                            ? "bg-surfaceHighlight text-primary font-semibold"
                                            : "text-secondary hover:text-primary hover:bg-surface/50 font-medium"
                                    )}
                                >
                                    菜单导航设计
                                </button>
                                <button
                                    onClick={() => setEditorView('categoryTags')}
                                    className={cn(
                                        "w-full text-left px-3 py-1.5 text-xs rounded-md transition-all duration-150",
                                        editorView === 'categoryTags'
                                            ? "bg-surfaceHighlight text-primary font-semibold"
                                            : "text-secondary hover:text-primary hover:bg-surface/50 font-medium"
                                    )}
                                >
                                    智能标签发现
                                </button>
                            </div>
                        )}
                    </div>

                    {isAdminLogin && (
                        <>
                            <button
                                onClick={() => setEditorView('header')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-lg transition-all duration-150",
                                    editorView === 'header'
                                        ? "bg-surfaceHighlight text-primary"
                                        : "text-secondary hover:text-primary hover:bg-surface"
                                )}
                            >
                                <Icon name="Layout" size={18} />
                                <span>头部配置</span>
                            </button>

                            <button
                                onClick={() => setEditorView('keys')}
                                className={cn(
                                    "w-full flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-lg transition-all duration-150",
                                    editorView === 'keys'
                                        ? "bg-surfaceHighlight text-primary"
                                        : "text-secondary hover:text-primary hover:bg-surface"
                                )}
                            >
                                <Icon name="Key" size={18} />
                                <span>Access Keys</span>
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => setEditorView('password')}
                        className={cn(
                            "w-full flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-lg transition-all duration-150",
                            editorView === 'password'
                                ? "bg-surfaceHighlight text-primary"
                                : "text-secondary hover:text-primary hover:bg-surface"
                        )}
                    >
                        <Icon name="Lock" size={18} />
                        <span>密码管理</span>
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border mt-auto">
                <div className="text-[10px] text-gray-400 font-medium">
                    v2.4.2 Config Dashboard
                </div>
            </div>
        </div>
    );
}
