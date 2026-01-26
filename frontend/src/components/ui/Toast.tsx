'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Icon } from '@/components/ui';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (type: ToastType, message: string, duration?: number) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

interface ToastProviderProps {
    children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback(
        (type: ToastType, message: string, duration: number = 3000) => {
            const id = Math.random().toString(36).substr(2, 9);
            const toast: Toast = { id, type, message, duration };

            setToasts((prev) => [...prev, toast]);

            if (duration > 0) {
                setTimeout(() => {
                    removeToast(id);
                }, duration);
            }
        },
        [removeToast]
    );

    const success = useCallback(
        (message: string, duration?: number) => showToast('success', message, duration),
        [showToast]
    );

    const error = useCallback(
        (message: string, duration?: number) => showToast('error', message, duration),
        [showToast]
    );

    const warning = useCallback(
        (message: string, duration?: number) => showToast('warning', message, duration),
        [showToast]
    );

    const info = useCallback(
        (message: string, duration?: number) => showToast('info', message, duration),
        [showToast]
    );

    return (
        <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
}

interface ToastItemProps {
    toast: Toast;
    onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
    const typeStyles = {
        success: {
            icon: 'CheckCircle2' as const,
            bg: 'bg-green-50 border-green-200',
            iconColor: 'text-green-600',
            textColor: 'text-green-800',
        },
        error: {
            icon: 'XCircle' as const,
            bg: 'bg-red-50 border-red-200',
            iconColor: 'text-red-600',
            textColor: 'text-red-800',
        },
        warning: {
            icon: 'AlertTriangle' as const,
            bg: 'bg-amber-50 border-amber-200',
            iconColor: 'text-amber-600',
            textColor: 'text-amber-800',
        },
        info: {
            icon: 'Info' as const,
            bg: 'bg-blue-50 border-blue-200',
            iconColor: 'text-blue-600',
            textColor: 'text-blue-800',
        },
    };

    const style = typeStyles[toast.type];

    return (
        <div
            className={cn(
                'pointer-events-auto flex items-center gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm animate-slide-in-right min-w-[320px] max-w-md',
                style.bg
            )}
        >
            <Icon name={style.icon} size={20} className={cn('flex-shrink-0', style.iconColor)} />
            <p className={cn('text-sm font-medium flex-1', style.textColor)}>{toast.message}</p>
            <button
                onClick={() => onRemove(toast.id)}
                className={cn('p-1 hover:bg-black/5 rounded-lg transition-colors', style.textColor)}
            >
                <Icon name="X" size={16} />
            </button>
        </div>
    );
}

export default ToastProvider;
