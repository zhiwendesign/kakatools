'use client';

import {
  ArrowUpRight,
  Bot,
  Settings,
  User,
  Sparkles,
  X,
  Send,
  Save,
  AlertCircle,
  Edit2,
  Link,
  Type,
  Search,
  Image,
  Lock,
  Info,
  Plus,
  Trash,
  ArrowUp,
  ArrowDown,
  Star,
  Key,
  Layout,
  Tag,
  Upload,
  Box,
  ChevronDown,
  LogOut,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Icon name mapping
const iconMap: Record<string, LucideIcon> = {
  ArrowUpRight,
  Bot,
  Settings,
  User,
  Sparkles,
  X,
  Send,
  Save,
  AlertCircle,
  Edit2,
  Link,
  Type,
  Search,
  Image,
  Lock,
  Info,
  Plus,
  Trash,
  ArrowUp,
  ArrowDown,
  Star,
  Key,
  Layout,
  Tag,
  Upload,
  Box,
  ChevronDown,
  LogOut,
};

export type IconName = keyof typeof iconMap;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 16, className }: IconProps) {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return <span className={className}>•</span>;
  }
  
  return <IconComponent size={size} className={cn(className)} />;
}

export default Icon;

