'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  showPreview?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = '请输入文档内容（支持 Markdown 格式）...',
  rows = 10,
  showPreview = false,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [charCount, setCharCount] = useState(value.length);
  const [showToolbar, setShowToolbar] = useState(true);

  useEffect(() => {
    setCharCount(value.length);
  }, [value]);

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    // 自动转换图片 URL 为 https
    const convertedText = convertImageUrlsToHttps(newText);
    onChange(convertedText);
    
    // 恢复光标位置
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + before.length + selectedText.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };
  
  // 自动将图片 URL 转换为 https
  const convertImageUrlsToHttps = (text: string): string => {
    // 匹配 Markdown 图片语法: ![alt](http://url)
    // 只转换 http:// 开头的 URL，不处理 https:// 和相对路径
    return text.replace(/!\[([^\]]*)\]\((http:\/\/[^)]+)\)/gi, (match, alt, url) => {
      // 将 http:// 替换为 https://
      const httpsUrl = url.replace(/^http:\/\//i, 'https://');
      return `![${alt}](${httpsUrl})`;
    });
  };

  // 从 URL 中生成智能的图片描述
  const generateImageAltText = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const hostname = urlObj.hostname.toLowerCase();
      
      // 提取路径中的有意义部分
      const pathParts = pathname.split('/').filter(part => part && part.length > 0);
      
      // 尝试从路径中提取描述性文本
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        // 移除文件扩展名
        const withoutExt = lastPart.replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, '');
        
        // 如果文件名有意义（不是随机字符串或哈希值），使用它
        // 排除纯数字、纯哈希值（如 photo-1551288049-bebda4e38f71）
        const isHashLike = /^[a-f0-9-]{20,}$/i.test(withoutExt);
        const isNumeric = /^\d+$/.test(withoutExt);
        
        if (!isHashLike && !isNumeric && withoutExt.length > 3) {
          // 将连字符、下划线转换为空格，并首字母大写
          const formatted = withoutExt
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase())
            .trim();
          if (formatted.length > 0) {
            return formatted;
          }
        }
        
        // 尝试从路径的其他部分提取（跳过常见的无意义路径段）
        const meaningfulParts = pathParts.filter(part => 
          !part.match(/^(images?|img|photos?|pics?|assets?|static|media|uploads?|files?)$/i) &&
          !part.match(/^[a-f0-9-]{20,}$/i) &&
          part.length > 2
        );
        
        if (meaningfulParts.length > 0) {
          const part = meaningfulParts[meaningfulParts.length - 1];
          const formatted = part
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase())
            .trim();
          if (formatted.length > 0) {
            return formatted;
          }
        }
      }
      
      // 从域名提取（如果是知名图片服务，使用更通用的描述）
      if (hostname.includes('unsplash')) return '图片';
      if (hostname.includes('pexels')) return '图片';
      if (hostname.includes('pixabay')) return '图片';
      if (hostname.includes('imgur')) return '图片';
      if (hostname.includes('github')) {
        // GitHub 图片可能包含仓库信息
        if (pathParts.length >= 3) {
          return `${pathParts[0]}/${pathParts[1]} 图片`;
        }
        return 'GitHub 图片';
      }
      
      // 默认描述
      return '图片';
    } catch {
      // 如果 URL 解析失败，尝试从字符串中提取
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0].replace(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i, '');
      if (fileName && fileName.length > 3 && !fileName.match(/^[a-f0-9-]{20,}$/i)) {
        return fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
      }
      return '图片';
    }
  };

  // 检测并转换纯图片 URL 为 Markdown 格式
  const convertPlainImageUrlsToMarkdown = (text: string, cursorPosition?: number): { text: string; newCursorPosition?: number } => {
    // 匹配独立的图片 URL（前后是空白字符、行首、行尾或标点符号）
    // 匹配 http:// 或 https:// 开头的完整 URL，支持查询参数
    // 支持以图片扩展名结尾，或者包含图片扩展名的 URL
    const urlPattern = /(^|[\s\n\r])(https?:\/\/[^\s\n\r<>"']+\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?[^\s\n\r<>"']*)?)([\s\n\r<>"']|$)/gi;
    
    let newText = text;
    let totalOffset = 0;
    
    // 查找所有匹配的图片 URL（从后往前处理，避免位置偏移）
    const matches: Array<{ url: string; start: number; end: number; prefix: string; suffix: string; matchIndex: number }> = [];
    let match;
    
    // 重置正则表达式的 lastIndex
    urlPattern.lastIndex = 0;
    
    while ((match = urlPattern.exec(text)) !== null) {
      const prefix = match[1]; // 前面的空白字符或行首
      const url = match[2]; // 图片 URL（包含查询参数）
      const suffix = match[4] || ''; // 后面的空白字符或行尾
      const start = match.index + prefix.length;
      const end = start + url.length;
      
      // 检查是否已经是 Markdown 图片格式（检查前面是否有 ![ 和 ](）
      const beforeStart = Math.max(0, start - 10);
      const beforeText = text.substring(beforeStart, start);
      const isAlreadyMarkdown = beforeText.includes('![') && beforeText.includes('](');
      
      if (!isAlreadyMarkdown) {
        matches.push({
          url: url,
          start: start,
          end: end,
          prefix: prefix,
          suffix: suffix,
          matchIndex: match.index,
        });
      }
    }
    
    // 从后往前替换，避免位置偏移问题
    for (let i = matches.length - 1; i >= 0; i--) {
      const { url, start, end, prefix, suffix, matchIndex } = matches[i];
      
      // 生成智能的图片描述
      const altText = generateImageAltText(url);
      
      // 确保 URL 是 https（保留查询参数）
      const httpsUrl = url.replace(/^http:\/\//i, 'https://');
      
      // 构建 Markdown 图片格式（保留前缀和后缀）
      const markdownImage = `${prefix}![${altText}](${httpsUrl})${suffix}`;
      const originalText = `${prefix}${url}${suffix}`;
      
      // 替换 URL
      newText = newText.substring(0, matchIndex) + markdownImage + newText.substring(matchIndex + originalText.length);
      
      // 计算偏移量
      const offset = markdownImage.length - originalText.length;
      
      // 更新光标位置
      if (cursorPosition !== undefined) {
        if (cursorPosition >= start && cursorPosition <= end) {
          // 光标在 URL 内，移动到 Markdown 格式的末尾（在 ] 之后）
          totalOffset = markdownImage.length - originalText.length;
        } else if (cursorPosition > matchIndex + originalText.length) {
          // 光标在 URL 之后，需要调整偏移
          totalOffset += offset;
        }
      }
    }
    
    return {
      text: newText,
      newCursorPosition: cursorPosition !== undefined && totalOffset !== 0 ? cursorPosition + totalOffset : cursorPosition,
    };
  };

  const insertAtLineStart = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lines = value.split('\n');
    let currentPos = 0;
    let lineIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (currentPos + lines[i].length >= start) {
        lineIndex = i;
        break;
      }
      currentPos += lines[i].length + 1;
    }

    lines[lineIndex] = prefix + lines[lineIndex];
    const newText = lines.join('\n');
    // 自动转换图片 URL 为 https
    const convertedText = convertImageUrlsToHttps(newText);
    onChange(convertedText);

    setTimeout(() => {
      textarea.focus();
      const newPosition = start + prefix.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const toolbarActions = [
    {
      icon: 'Type' as const,
      label: '标题',
      onClick: () => insertAtLineStart('# '),
      shortcut: 'Ctrl+H',
    },
    {
      icon: 'Type' as const,
      label: '粗体',
      onClick: () => insertText('**', '**'),
      shortcut: 'Ctrl+B',
      style: 'font-bold',
    },
    {
      icon: 'Type' as const,
      label: '斜体',
      onClick: () => insertText('*', '*'),
      shortcut: 'Ctrl+I',
      style: 'italic',
    },
    {
      icon: 'Link' as const,
      label: '链接',
      onClick: () => insertText('[链接文本](', ')'),
      shortcut: 'Ctrl+K',
    },
    {
      icon: 'FileText' as const,
      label: '代码',
      onClick: () => insertText('`', '`'),
      shortcut: 'Ctrl+`',
    },
    {
      icon: 'Layout' as const,
      label: '列表',
      onClick: () => insertAtLineStart('- '),
      shortcut: 'Ctrl+L',
    },
    {
      icon: 'FileText' as const,
      label: '引用',
      onClick: () => insertAtLineStart('> '),
      shortcut: 'Ctrl+Q',
    },
    {
      icon: 'Image' as const,
      label: '图片',
      onClick: () => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        
        // 如果选中了文本，将其作为图片描述；否则使用默认描述
        const altText = selectedText.trim() || '图片描述';
        insertText(`![${altText}](`, ')');
      },
      shortcut: 'Ctrl+G',
    },
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // 快捷键支持
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          insertText('**', '**');
          break;
        case 'i':
          e.preventDefault();
          insertText('*', '*');
          break;
        case 'k':
          e.preventDefault();
          insertText('[链接文本](', ')');
          break;
        case '`':
          e.preventDefault();
          insertText('`', '`');
          break;
        case 'l':
          e.preventDefault();
          insertAtLineStart('- ');
          break;
        case 'q':
          e.preventDefault();
          insertAtLineStart('> ');
          break;
        case 'g':
          e.preventDefault();
          insertText('![图片描述](', ')');
          break;
      }
    } else {
      // 当输入空格、回车或 Tab 时，检测并转换图片 URL
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
        // 延迟处理，让浏览器先完成输入
        setTimeout(() => {
          const currentValue = textarea.value;
          const cursorPosition = textarea.selectionStart;
          const result = convertPlainImageUrlsToMarkdown(currentValue, cursorPosition);
          
          if (result.text !== currentValue) {
            // 转换 http:// 为 https://
            const finalValue = convertImageUrlsToHttps(result.text);
            onChange(finalValue);
            
            // 恢复光标位置
            setTimeout(() => {
              textarea.focus();
              const newPosition = result.newCursorPosition !== undefined 
                ? result.newCursorPosition 
                : cursorPosition;
              textarea.setSelectionRange(newPosition, newPosition);
            }, 0);
          }
        }, 0);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between p-2 bg-surface-highlight rounded-lg border border-border">
          <div className="flex items-center gap-1">
            {toolbarActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`p-2 rounded hover:bg-white text-secondary hover:text-primary transition-colors group relative ${action.style || ''}`}
                title={`${action.label} (${action.shortcut})`}
                type="button"
              >
                <Icon name={action.icon} size={16} />
                {/* Tooltip */}
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {action.label} ({action.shortcut})
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-secondary">
            <span className="flex items-center gap-1">
              <Icon name="fileText" size={12} />
              {charCount} 字符
            </span>
            <button
              onClick={() => setShowToolbar(!showToolbar)}
              className="p-1 rounded hover:bg-white transition-colors"
              title={showToolbar ? "隐藏工具栏" : "显示工具栏"}
            >
              <Icon name={showToolbar ? "ArrowUp" : "ChevronDown"} size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                // 只转换 http:// 为 https://（实时转换）
                const convertedValue = convertImageUrlsToHttps(e.target.value);
                onChange(convertedValue);
              }}
              onKeyDown={handleKeyDown}
              onPaste={(e) => {
                // 延迟处理粘贴内容，让浏览器先完成粘贴操作
                setTimeout(() => {
                  const textarea = textareaRef.current;
                  if (!textarea) return;
                  
                  const newValue = textarea.value;
                  const cursorPosition = textarea.selectionStart;
                  
                  // 转换纯图片 URL 为 Markdown 格式
                  const result = convertPlainImageUrlsToMarkdown(newValue, cursorPosition);
                  
                  if (result.text !== newValue) {
                    // 转换 http:// 为 https://
                    const finalValue = convertImageUrlsToHttps(result.text);
                    onChange(finalValue);
                    
                    // 恢复光标位置
                    setTimeout(() => {
                      textarea.focus();
                      const newPosition = result.newCursorPosition !== undefined 
                        ? result.newCursorPosition 
                        : cursorPosition;
                      textarea.setSelectionRange(newPosition, newPosition);
                    }, 0);
                  }
                }, 10);
              }}
              onBlur={(e) => {
                // 失去焦点时检查并转换纯图片 URL 和 http:// 为 https://
                const result = convertPlainImageUrlsToMarkdown(e.target.value);
                const convertedValue = convertImageUrlsToHttps(result.text);
                if (convertedValue !== e.target.value) {
                  onChange(convertedValue);
                }
              }}
              placeholder={placeholder}
              rows={rows}
              className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm text-primary placeholder:text-secondary/60 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all resize-none font-mono shadow-sm leading-relaxed"
            />
        
        {/* Placeholder hint */}
        {!value && (
          <div className="absolute top-3 left-4 pointer-events-none text-secondary/40 text-xs font-mono">
            <div className="mb-2">💡 提示：使用工具栏按钮或快捷键快速插入格式</div>
            <div className="space-y-1">
              <div>• <kbd className="px-1.5 py-0.5 bg-white border border-border rounded text-[10px]">Ctrl+B</kbd> 粗体</div>
              <div>• <kbd className="px-1.5 py-0.5 bg-white border border-border rounded text-[10px]">Ctrl+I</kbd> 斜体</div>
              <div>• <kbd className="px-1.5 py-0.5 bg-white border border-border rounded text-[10px]">Ctrl+K</kbd> 链接</div>
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="flex items-start gap-2 text-xs text-secondary bg-blue-50/50 p-3 rounded-lg border border-blue-100">
        <Icon name="Info" size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="font-medium text-blue-700">Markdown 语法支持：</p>
          <div className="grid grid-cols-2 gap-1 text-blue-600">
            <div>• <code className="text-[10px] bg-white px-1 py-0.5 rounded"># 标题</code></div>
            <div>• <code className="text-[10px] bg-white px-1 py-0.5 rounded">**粗体**</code></div>
            <div>• <code className="text-[10px] bg-white px-1 py-0.5 rounded">*斜体*</code></div>
            <div>• <code className="text-[10px] bg-white px-1 py-0.5 rounded">`代码`</code></div>
            <div>• <code className="text-[10px] bg-white px-1 py-0.5 rounded">- 列表</code></div>
            <div>• <code className="text-[10px] bg-white px-1 py-0.5 rounded">[链接](url)</code></div>
            <div>• <code className="text-[10px] bg-white px-1 py-0.5 rounded">![图片](url)</code></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarkdownEditor;

