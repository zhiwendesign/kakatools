'use client';

import { Resource } from '@/types';
import { Icon } from '@/components/ui';

interface ConfigListItemProps {
  resource: Resource;
  onEdit: () => void;
  onDelete: () => void;
  isActive: boolean;
}

export function ConfigListItem({ resource, onEdit, onDelete, isActive }: ConfigListItemProps) {
  return (
    <div
      className={`
        flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all group
        ${isActive 
          ? 'bg-primary/5 border-primary/30 shadow-sm' 
          : 'bg-white border-border hover:border-primary/15 hover:bg-surface-highlight/30'}
      `}
      onClick={onEdit}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {resource.imageUrl ? (
          <img
            src={resource.imageUrl}
            alt={resource.title}
            className="w-10 h-10 rounded-lg object-cover border border-border"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-surface-highlight flex items-center justify-center">
            <Icon name="image" size={16} className="text-secondary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-primary truncate">{resource.title}</h4>
            {resource.featured && (
              <Icon name="star" size={12} className="text-amber-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-secondary truncate">{resource.link || '无链接'}</p>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1.5 text-secondary hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
        title="删除"
      >
        <Icon name="trash" size={14} />
      </button>
    </div>
  );
}

export default ConfigListItem;

