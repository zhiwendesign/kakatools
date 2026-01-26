import { clsx, type ClassValue } from 'clsx';
import { CategoryType } from '@/types';
import { ADMIN_ONLY_CATEGORIES, PERCENTAGE_CONTROLLED_CATEGORIES, DEFAULT_GUEST_PERCENTAGE } from '@/constants';

// Utility for combining class names
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Format date for display
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// Format datetime for display
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Local storage helpers with SSR safety
export function getStorageItem(key: string, encrypted: boolean = false): string | null {
  if (typeof window === 'undefined') return null;
  
  const item = localStorage.getItem(key);
  if (!item) return null;
  
  if (encrypted) {
    try {
      // Import dynamically to avoid SSR issues
      const { simpleDecrypt } = require('@/lib/crypto');
      const secretKey = process.env.NEXT_PUBLIC_API_SECRET || 'default-secret-key-change-in-production';
      return simpleDecrypt(item, secretKey);
    } catch (error) {
      console.error('Failed to decrypt storage item:', error);
      localStorage.removeItem(key);
      return null;
    }
  }
  
  return item;
}

export function setStorageItem(key: string, value: string, encrypted: boolean = false): void {
  if (typeof window === 'undefined') return;
  
  let storageValue = value;
  if (encrypted) {
    try {
      // Import dynamically to avoid SSR issues
      const { simpleEncrypt } = require('@/lib/crypto');
      const secretKey = process.env.NEXT_PUBLIC_API_SECRET || 'default-secret-key-change-in-production';
      storageValue = simpleEncrypt(value, secretKey);
    } catch (error) {
      console.error('Failed to encrypt storage item:', error);
      return;
    }
  }
  
  localStorage.setItem(key, storageValue);
}

export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

// Parse JSON safely from storage
export function getStorageJSON<T>(key: string, defaultValue: T, encrypted: boolean = false): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = getStorageItem(key, encrypted);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to parse JSON from storage:', error);
    return defaultValue;
  }
}

export function setStorageJSON<T>(key: string, value: T, encrypted: boolean = false): void {
  if (typeof window === 'undefined') return;
  
  const jsonString = JSON.stringify(value);
  setStorageItem(key, jsonString, encrypted);
}

// File upload helpers
export function validateImageFile(file: File, maxSizeMB: number = 5): string | null {
  if (!file.type.startsWith('image/')) {
    return '请选择有效的图片文件';
  }
  
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `图片大小不能超过${maxSizeMB}MB`;
  }
  
  return null;
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Filter and search helpers
export function filterResources<T extends { title: string; description: string; tags: string[] }>(
  items: T[],
  query: string
): T[] {
  if (!query.trim()) return items;
  
  const lowerQuery = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

// Sort resources
export function sortResources<T extends { title: string; featured?: boolean; createdAt?: number }>(
  items: T[],
  sortBy: 'title' | 'category' = 'title',
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...items].sort((a, b) => {
    // Featured items first
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    
    // Then sort by creation time (newest first)
    const aCreated = a.createdAt || 0;
    const bCreated = b.createdAt || 0;
    if (aCreated !== bCreated) {
      return bCreated - aCreated;
    }
    
    // Then sort by specified field
    const aValue = a[sortBy as keyof T] as string;
    const bValue = b[sortBy as keyof T] as string;
    
    const comparison = aValue.localeCompare(bValue, 'zh-CN');
    return order === 'asc' ? comparison : -comparison;
  });
}

// Truncate text
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

// Category and Permission Utilities

/**
 * Check if a category requires admin access
 */
export function isAdminOnlyCategory(category: CategoryType): boolean {
  return ADMIN_ONLY_CATEGORIES.includes(category);
}

/**
 * Check if a category uses percentage-based visibility control
 */
export function isPercentageControlledCategory(category: CategoryType): boolean {
  return PERCENTAGE_CONTROLLED_CATEGORIES.includes(category);
}/**
 * Calculate visibility percentage for a category
 * @param category - The category to check
 * @param keyPercentage - Percentage from access key (if logged in)
 * @param isLoggedIn - Whether user is logged in
 * @returns The visibility percentage, or undefined if not applicable (means 100%)
 * 
 * Rules:
 * - AIGC and UXTips: Always return undefined (100% visible, no login required)
 * - 星芒学社 and 图库:
 *   - Not logged in: 20%
 *   - Logged in with keyPercentage: use keyPercentage
 *   - Logged in without keyPercentage: undefined (100%)
 */
export function getVisibilityPercentage(
  category: CategoryType,
  keyPercentage: number | undefined,
  isLoggedIn: boolean
): number | undefined {
  // AIGC and UXTips are always fully visible (no percentage control)
  if (!isPercentageControlledCategory(category)) {
    return undefined; // 100% visible
  }
  
  // For 星芒学社 and 图库 (percentage-controlled categories)
  if (keyPercentage !== undefined) {
    // User has a key with specific percentage setting
    return keyPercentage;
  }
  
  if (!isLoggedIn) {
    // Guest users see 20% by default
    return DEFAULT_GUEST_PERCENTAGE;
  }
  
  // Logged in without percentage setting means 100% visible
  return undefined;
}