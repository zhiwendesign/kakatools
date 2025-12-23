'use client';

import { useState } from 'react';
import { Resource } from '@/types';
import { Icon } from '@/components/ui';
import { DocumentModal } from '@/components/modals/DocumentModal';
import { useAuth } from '@/hooks';

interface ResourceCardProps {
  item: Resource;
  onEdit?: (item: Resource) => void;
}

export function ResourceCard({ item, onEdit }: ResourceCardProps) {
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const { isAuthenticated } = useAuth();
  const isDocument = item.contentType === 'document' && item.content;

  const handleClick = (e: React.MouseEvent) => {
    if (isDocument) {
      e.preventDefault();
      setShowDocumentModal(true);
    }
  };

  return (
    <>
      <div className="group relative flex flex-col bg-surface border border-border rounded-2xl overflow-hidden transition-all duration-500 hover:border-accent/50 hover:shadow-lg hover:-translate-y-1">
      {/* Image Section */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surfaceHighlight">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-90 group-hover:opacity-100 grayscale-[20%] group-hover:grayscale-0"
            loading="lazy"
            onError={(e) => {
              // 使用安全的备用图片，避免ORB阻止
              (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/e5e7eb/6b7280?text=No+Image';
              (e.target as HTMLImageElement).alt = `${item.title} - No Image`;
            }}
            onLoad={(e) => {
              // 确保图片加载成功后移除任何错误状态
              (e.target as HTMLImageElement).style.opacity = '1';
            }}
            style={{ opacity: '0', transition: 'opacity 0.3s ease-in-out' }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-surfaceHighlight">
            <Icon name="Image" size={32} className="text-secondary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-300" />
        
        {/* Featured Badge */}
        {item.featured && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg animate-pulse">
            <Icon name="Sparkles" size={12} />
            <span className="tracking-wide">卡卡推荐</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-grow p-5 pt-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-primary tracking-tight group-hover:underline decoration-1 underline-offset-4 decoration-border transition-all">
            {item.title}
          </h3>
          <div className="w-8 h-8 rounded-full bg-surfaceHighlight flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
            <Icon name="ArrowUpRight" size={14} className="text-primary" />
          </div>
        </div>

        <p className="text-secondary text-xs leading-relaxed mb-6 line-clamp-2">
          {item.description}
        </p>

        {/* Tags */}
        <div className="mt-auto flex flex-wrap gap-2">
          {item.tags.map((tag, idx) => (
            <span
              key={`${item.id}-tag-${idx}`}
              className="px-2.5 py-1 text-[10px] font-medium text-secondary bg-surfaceHighlight border border-transparent hover:border-border rounded-md transition-colors cursor-default"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Link Overlay or Document Click Handler */}
      {isDocument ? (
        <div
          onClick={handleClick}
          className="absolute inset-0 z-10 cursor-pointer"
          aria-label={`View ${item.title}`}
        />
      ) : (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-10"
          aria-label={`View ${item.title}`}
        />
      )}

    </div>

    {/* Document Modal */}
    {isDocument && (
      <DocumentModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        resource={item}
        isAdmin={isAuthenticated}
      />
    )}
    </>
  );
}

export default ResourceCard;

