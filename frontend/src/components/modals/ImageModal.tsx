'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  description?: string;
  loginTip?: string;
}

export function ImageModal({ isOpen, onClose, imageUrl, title, description, loginTip }: ImageModalProps) {
  const [copied, setCopied] = useState(false);
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-3 bg-gray-900/60 hover:bg-gray-900/80 text-white rounded-full transition-colors backdrop-blur-sm"
          aria-label="关闭"
        >
          <Icon name="X" size={20} />
        </button>

        {/* Image */}
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Title & Description */}
        {(title || description || loginTip) && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-3 bg-gray-900/60 backdrop-blur-sm text-white rounded-lg max-w-[80%] flex items-center gap-3">
            <div className="flex-1">
              {title && (
                <div className="text-sm font-semibold leading-snug">{title}</div>
              )}
              {description ? (
                <div className="mt-1 text-xs opacity-90 leading-relaxed line-clamp-3">
                  {description}
                </div>
              ) : loginTip ? (
                <div className="mt-1 text-xs opacity-90 leading-relaxed">
                  {loginTip}
                </div>
              ) : null}
            </div>
            {description && (
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    await navigator.clipboard.writeText(description || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    const ta = document.createElement('textarea');
                    ta.value = description || '';
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-white/90 text-gray-900 hover:bg-white border border-white/60 transition-colors"
                title={copied ? '已复制提示词' : '复制提示词'}
              >
                {copied ? '已复制' : '复制提示词'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageModal;
