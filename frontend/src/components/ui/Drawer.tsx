'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui';
import { cn } from '@/lib/utils';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    width?: string;
}

export function Drawer({
    isOpen,
    onClose,
    title,
    description,
    children,
    width = 'max-w-2xl',
}: DrawerProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!mounted) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm transition-opacity duration-300 ease-in-out",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div
                className={cn(
                    "fixed top-0 right-0 z-[101] h-full w-full bg-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col",
                    width,
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white sticky top-0 z-10">
                    <div className="min-w-0 flex items-center gap-2">
                        <h3 className="text-lg font-bold text-primary truncate leading-tight">{title}</h3>
                        {description && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-0.5 rounded flex-shrink-0">
                                {description}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-secondary hover:text-primary hover:bg-surface rounded-full transition-colors flex-shrink-0"
                    >
                        <Icon name="X" size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
}

export default Drawer;
