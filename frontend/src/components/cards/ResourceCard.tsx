'use client';

import { useState } from 'react';
import { Resource, FiltersMap, CategoryType } from '@/types';
import { Icon } from '@/components/ui';
import { DocumentModal } from '@/components/modals/DocumentModal';
import { ImageModal } from '@/components/modals/ImageModal';
import { useAuth, useStarlightAccess } from '@/hooks';

interface ResourceCardProps {
  item: Resource;
  tagDictionary?: FiltersMap;
  onEdit?: (item: Resource) => void;
}

export function ResourceCard({ item, tagDictionary, onEdit }: ResourceCardProps) {
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const { isAuthenticated } = useAuth();
  const { hasAccess } = useStarlightAccess();
  const isLoggedIn = isAuthenticated || hasAccess;
  const isDocument = item.contentType === 'document' && item.content;
  const isImage = item.contentType === 'image' && item.content;
  const isGallery = item.category === ('图库' as CategoryType);
  const coverSrc = item.imageUrl || (isImage && item.content) || undefined;

  const handleClick = (e: React.MouseEvent) => {
    if (isDocument) {
      e.preventDefault();
      setShowDocumentModal(true);
    } else if (isImage) {
      e.preventDefault();
      setShowImageModal(true);
    }
  };

  return (
    <>
      <div className="group relative flex flex-col bg-white border border-border/80 rounded-xl overflow-hidden transition-all duration-300 ease-out hover:border-border/80 hover:shadow-lg hover:-translate-y-0.5 shadow-sm hover:shadow-md">
        {/* Image Section */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-surfaceHighlight/50">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={item.title}
              className="h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.02] opacity-95 group-hover:opacity-100"
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
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent group-hover:from-transparent transition-all duration-300" />

          {/* Featured Badge */}
          {item.featured && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-sm">
              <Icon name="Sparkles" size={10} />
              <span className="tracking-tight">卡卡推荐</span>
            </div>
          )}

          {/* Content Type Badge */}
          {item.contentType === 'document' && (
            <div className="absolute top-3 right-3 bg-primary/95 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 shadow-md">
              <Icon name="FileText" size={10} />
              <span>文档</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex flex-col flex-grow p-4">
          <div className="flex justify-between items-start mb-2.5">
            <h3 className="text-base font-semibold text-primary tracking-tight leading-snug group-hover:text-primary/80 transition-colors pr-2">
              {item.title}
            </h3>
            <div className="w-6 h-6 rounded-md bg-surfaceHighlight/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0">
              <Icon name="ArrowUpRight" size={12} className="text-primary/70" />
            </div>
          </div>

          <p className="text-secondary text-xs leading-relaxed mb-4 line-clamp-2 min-h-[2.5rem]">
            {item.description}
          </p>

          {/* Tags */}
          <div className="mt-auto flex flex-wrap gap-1.5">
            {item.tags.slice(0, 3).map((tag, idx) => {
              const registeredTags = tagDictionary?.[item.category as CategoryType] || [];
              const dictionaryEntry = registeredTags.find((f: any) => f.tag === tag);
              const displayLabel = dictionaryEntry ? dictionaryEntry.label : tag;

              return (
                <span
                  key={`${item.id}-tag-${idx}`}
                  className="px-2 py-0.5 text-[10px] font-medium text-secondary/80 bg-surfaceHighlight/60 border border-border/40 hover:border-primary/20 rounded-md transition-colors cursor-default"
                >
                  {displayLabel}
                </span>
              );
            })}
            {item.tags.length > 3 && (
              <span className="px-2 py-0.5 text-[10px] font-medium text-secondary/60">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Link Overlay or Document/Image Click Handler */}
        {isDocument || isImage ? (
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

      {/* Image Modal */}
      {isImage && item.content && (
        <ImageModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          imageUrl={item.content}
          title={item.title}
          description={isGallery && !isLoggedIn ? undefined : (item.description || '')}
          loginTip={isGallery && !isLoggedIn ? '登陆后查看描述词' : undefined}
        />
      )}
    </>
  );
}

export default ResourceCard;
