'use client';

import { ReactNode } from 'react';
import { Modal, Button, Icon } from '@/components/ui';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string | ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = '确认',
    cancelText = '取消',
    variant = 'info',
    isLoading = false,
}: ConfirmDialogProps) {
    const handleConfirm = () => {
        onConfirm();
    };

    const variantStyles = {
        danger: {
            icon: 'AlertTriangle' as const,
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
        },
        warning: {
            icon: 'AlertCircle' as const,
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
        },
        info: {
            icon: 'Info' as const,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            confirmBtn: 'btn-gradient',
        },
    };

    const style = variantStyles[variant];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="max-w-md w-full p-0 overflow-hidden"
            closeOnOverlayClick={!isLoading}
            showCloseButton={false}
        >
            <div className="p-6 space-y-4">
                {/* Icon and Title */}
                <div className="flex items-start gap-4">
                    <div className={cn('p-3 rounded-full', style.iconBg)}>
                        <Icon name={style.icon} size={24} className={style.iconColor} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-primary mb-2">{title}</h3>
                        <div className="text-sm text-secondary leading-relaxed">
                            {message}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                    <Button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 bg-surface hover:bg-surfaceHighlight text-primary border border-border/40"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={cn('flex-1', style.confirmBtn)}
                    >
                        {isLoading ? (
                            <>
                                <Icon name="loader" size={16} className="animate-spin" />
                                处理中...
                            </>
                        ) : (
                            confirmText
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

export default ConfirmDialog;
