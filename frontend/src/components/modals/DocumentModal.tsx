'use client';

import { useEffect } from 'react';
import { Icon } from '@/components/ui';
import { Resource } from '@/types';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
  isAdmin?: boolean; // 是否为管理员
}

export function DocumentModal({ isOpen, onClose, resource, isAdmin = false }: DocumentModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // 只有非管理员才禁止复制
      if (!isAdmin) {
        // 禁止复制文本
        const preventCopy = (e: ClipboardEvent) => {
          e.preventDefault();
          return false;
        };
        
        // 禁止选择文本
        const preventSelect = (e: Event) => {
          e.preventDefault();
          return false;
        };
        
        // 禁止右键菜单
        const preventContextMenu = (e: MouseEvent) => {
          e.preventDefault();
          return false;
        };
        
        // 禁止拖拽
        const preventDrag = (e: DragEvent) => {
          e.preventDefault();
          return false;
        };
        
        // 添加事件监听器
        document.addEventListener('copy', preventCopy);
        document.addEventListener('cut', preventCopy);
        document.addEventListener('selectstart', preventSelect);
        document.addEventListener('contextmenu', preventContextMenu);
        document.addEventListener('dragstart', preventDrag);
        
        return () => {
          document.body.style.overflow = '';
          document.removeEventListener('copy', preventCopy);
          document.removeEventListener('cut', preventCopy);
          document.removeEventListener('selectstart', preventSelect);
          document.removeEventListener('contextmenu', preventContextMenu);
          document.removeEventListener('dragstart', preventDrag);
        };
      }
      
      return () => {
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, isAdmin]);

  if (!isOpen || !resource) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/30 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl border border-border/40 flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border select-none">
          <div>
            <h2 className="text-2xl font-bold text-primary">{resource.title}</h2>
            {resource.description && (
              <p className="text-sm text-secondary mt-1">{resource.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-highlight text-secondary hover:text-primary transition-colors select-none"
            aria-label="关闭"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-white to-surface-highlight/20">
          <div className="prose prose-sm max-w-none markdown-content-wrapper">
            <div
              className={`markdown-content ${!isAdmin ? 'select-none' : ''}`}
              style={!isAdmin ? { userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' } : {}}
              onCopy={!isAdmin ? (e) => e.preventDefault() : undefined}
              onCut={!isAdmin ? (e) => e.preventDefault() : undefined}
              onContextMenu={!isAdmin ? (e) => e.preventDefault() : undefined}
              dangerouslySetInnerHTML={{
                __html: formatMarkdown(resource.content || '', isAdmin),
              }}
              onMouseDown={!isAdmin ? (e) => {
                // 阻止文本选择
                if (e.target !== e.currentTarget && (e.target as HTMLElement).tagName !== 'IMG') {
                  e.preventDefault();
                }
              } : undefined}
              onClick={(e) => {
                // 点击图片时放大查看
                const target = e.target as HTMLElement;
                if (target.tagName === 'IMG') {
                  const img = target as HTMLImageElement;
                  const modal = document.createElement('div');
                  modal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in';
                  modal.onclick = () => modal.remove();
                  
                  const imgContainer = document.createElement('div');
                  imgContainer.className = 'relative max-w-[90vw] max-h-[90vh] p-4';
                  imgContainer.onclick = (e) => e.stopPropagation();
                  
                  const enlargedImg = document.createElement('img');
                  enlargedImg.src = img.src;
                  enlargedImg.alt = img.alt;
                  enlargedImg.className = 'max-w-full max-h-full rounded-lg shadow-2xl';
                  
                  const closeBtn = document.createElement('button');
                  closeBtn.className = 'absolute top-2 right-2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors text-gray-800';
                  closeBtn.innerHTML = '✕';
                  closeBtn.onclick = () => modal.remove();
                  
                  imgContainer.appendChild(enlargedImg);
                  imgContainer.appendChild(closeBtn);
                  modal.appendChild(imgContainer);
                  document.body.appendChild(modal);
                }
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-surface-highlight/30 select-none">
          <div className="flex flex-wrap gap-2">
            {resource.tags.map((tag, idx) => (
              <span
                key={`${resource.id}-tag-${idx}`}
                className="px-2.5 py-1 text-xs font-medium text-secondary bg-white border border-border rounded-md select-none"
              >
                {tag}
              </span>
            ))}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors select-none"
            onMouseDown={(e) => e.stopPropagation()}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

// 简单的 Markdown 转 HTML 函数
function formatMarkdown(markdown: string, allowSelect: boolean = false): string {
  let html = markdown;

  // 标题
  html = html.replace(/^###### (.*$)/gim, '<h6 class="text-sm font-bold mt-4 mb-2 text-secondary">$1</h6>');
  html = html.replace(/^##### (.*$)/gim, '<h5 class="text-base font-bold mt-5 mb-2.5 text-secondary">$1</h5>');
  html = html.replace(/^#### (.*$)/gim, '<h4 class="text-lg font-bold mt-6 mb-3 text-primary">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-7 mb-3.5 text-primary border-b border-border pb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4 text-primary border-b-2 border-primary/20 pb-2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-10 mb-5 text-primary border-b-2 border-primary/40 pb-3">$1</h1>');

  // 粗体
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong class="font-bold">$1</strong>');

  // 斜体
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  html = html.replace(/_(.*?)_/g, '<em class="italic">$1</em>');

  // 代码块（支持语言标识）
  html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || 'text';
    return `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4 border border-gray-700"><code class="language-${language} font-mono text-sm">${code.trim()}</code></pre>`;
  });
  
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded text-sm font-mono border border-amber-200">$1</code>');

  // 图片 - 必须在链接之前处理，因为图片语法包含链接语法
  const imageSelectStyle = allowSelect ? '' : 'user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;';
  const imageSelectClass = allowSelect ? '' : 'select-none';
  const imagePreventEvents = allowSelect ? '' : 'draggable="false" oncontextmenu="return false;" onmousedown="event.preventDefault();"';
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    return `<div class="my-6 flex justify-center ${imageSelectClass}" style="${imageSelectStyle}"><img src="${src}" alt="${alt || '图片'}" class="max-w-full h-auto rounded-lg shadow-lg border border-border hover:shadow-xl transition-shadow cursor-pointer ${imageSelectClass}" style="${imageSelectStyle} pointer-events: auto;" ${imagePreventEvents} loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/800x600/e5e7eb/6b7280?text=图片加载失败'; this.className='max-w-full h-auto rounded-lg border border-red-200 bg-red-50 p-4';" /></div>`;
  });

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:text-primary/80 hover:underline transition-colors font-medium">$1</a>');

  // 列表
  html = html.replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>');
  html = html.replace(/^\+ (.*$)/gim, '<li class="ml-4">$1</li>');
  
  // 将连续的 <li> 包裹在 <ul> 中
  html = html.replace(/(<li class="ml-4">.*<\/li>\n?)+/g, (match) => {
    return `<ul class="list-disc my-4 space-y-2">${match}</ul>`;
  });

  // 有序列表
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>');
  html = html.replace(/(<li class="ml-4">.*<\/li>\n?)+/g, (match) => {
    if (!match.includes('<ul')) {
      return `<ol class="list-decimal my-4 space-y-2">${match}</ol>`;
    }
    return match;
  });

  // 引用块
  html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-primary/30 pl-4 py-2 my-4 bg-primary/5 italic text-secondary">$1</blockquote>');
  
  // 水平分割线
  html = html.replace(/^---$/gim, '<hr class="my-6 border-t border-border" />');
  html = html.replace(/^\*\*\*$/gim, '<hr class="my-6 border-t border-border" />');
  
  // 段落 - 根据权限添加禁止选择样式
  const selectStyle = allowSelect ? '' : 'user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;';
  const selectClass = allowSelect ? '' : 'select-none';
  html = html.split('\n\n').map(para => {
    if (para.trim() && !para.match(/^<[h|u|o|l|p|d|b|h]/)) {
      return `<p class="mb-4 leading-relaxed text-secondary ${selectClass}" style="${selectStyle}">${para.trim()}</p>`;
    }
    return para;
  }).join('\n');
  
  // 为所有文本元素添加禁止选择样式（仅当不允许选择时）
  if (!allowSelect) {
    html = html.replace(/<h([1-6])([^>]*)>/g, (match, level, attrs) => {
      if (!attrs.includes('style=')) {
        return `<h${level}${attrs} style="${selectStyle}">`;
      }
      return match;
    });
    html = html.replace(/<strong([^>]*)>/g, (match, attrs) => {
      if (!attrs.includes('style=')) {
        return `<strong${attrs} style="${selectStyle}">`;
      }
      return match;
    });
    html = html.replace(/<em([^>]*)>/g, (match, attrs) => {
      if (!attrs.includes('style=')) {
        return `<em${attrs} style="${selectStyle}">`;
      }
      return match;
    });
    html = html.replace(/<li([^>]*)>/g, (match, attrs) => {
      if (!attrs.includes('style=')) {
        return `<li${attrs} style="${selectStyle}">`;
      }
      return match;
    });
    html = html.replace(/<blockquote([^>]*)>/g, (match, attrs) => {
      if (!attrs.includes('style=')) {
        return `<blockquote${attrs} style="${selectStyle}">`;
      }
      return match;
    });
  }

  // 换行
  html = html.replace(/\n/g, '<br />');

  return html;
}

export default DocumentModal;

