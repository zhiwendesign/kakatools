// Resource Types
export interface Resource {
  id: string;
  title: string;
  description: string;
  category: CategoryType;
  tags: string[];
  imageUrl: string;
  link: string;
  featured?: boolean;
  contentType?: 'link' | 'document'; // 资源类型：链接或文档
  content?: string; // 文档内容（当 contentType 为 'document' 时使用）
}

export interface Filter {
  label: string;
  tag: string;
}

export interface CategoryData {
  filters: Filter[];
  resources: Resource[];
}

// Category Types
export type CategoryType = 'AiCC' | 'UXLib' | 'Learning' | 'Starlight Academy';

export const CATEGORIES: CategoryType[] = ['AiCC', 'UXLib', 'Learning', 'Starlight Academy'];

// Auth Types
export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
}

export interface VerifyResponse {
  success: boolean;
  message?: string;
}

// Access Key Types
export interface AccessKey {
  code: string;
  username: string;
  createdAt: number;
  expiresAt: number;
  duration: number;
  name?: string;
}

export interface AccessKeyInfo {
  code: string;
  username: string;
  createdAt: number;
  expiresAt: number;
  duration: number;
}

export interface KeyVerifyResponse {
  success: boolean;
  message?: string;
  token?: string;
  keyInfo?: AccessKeyInfo;
}

export interface KeysListResponse {
  success: boolean;
  keys: AccessKey[];
}

export interface GenerateKeyResponse {
  success: boolean;
  key?: AccessKey;
  message?: string;
}

// Header Config Types
export interface HeaderConfig {
  avatar: string;
  avatarImage: string | null;
  title: string;
}

// Filter State
export type FiltersMap = Record<CategoryType, Filter[]>;

// View Types
export type ViewType = 'home' | 'config';

// Config Editor View
export type EditorViewType = 'resource' | 'header' | 'keys';

