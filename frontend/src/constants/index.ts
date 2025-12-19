import { CategoryType, FiltersMap } from '@/types';

// API Configuration
// 统一部署模式：默认使用相对路径（同域请求）
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

// Data Sources - 使用数据库 API 端点
export const DATA_SOURCES: Record<CategoryType, string> = {
  AiCC: '/api/resources/AiCC',
  UXLib: '/api/resources/UXLib',
  Learning: '/api/resources/Learning',
  'Starlight Academy': '/api/resources/Starlight Academy',
};

// Default Filters
export const DEFAULT_FILTERS: FiltersMap = {
  AiCC: [
    { label: '全部', tag: 'All' },
    { label: '卡卡推荐', tag: '卡卡推荐' },
  ],
  UXLib: [
    { label: '全部', tag: 'All' },
    { label: '卡卡推荐', tag: '卡卡推荐' },
  ],
  Learning: [
    { label: '全部', tag: 'All' },
    { label: '卡卡推荐', tag: '卡卡推荐' },
  ],
  'Starlight Academy': [
    { label: 'All', tag: 'All' },
    { label: 'Exclusive', tag: 'Exclusive' },
  ],
};

// Category Descriptions
export const CATEGORY_INFO: Record<CategoryType, { title: string; subtitle: string }> = {
  AiCC: {
    title: 'Al Creative Commons',
    subtitle: '探索AI绘画模型和ComfyUI资料集合丨欢迎合作交流微信🛰️XingYueAIArt',
  },
  UXLib: {
    title: 'UXLib',
    subtitle: '跟我学习更多UI/UX知识丨欢迎合作交流微信🛰️XingYueAIArt',
  },
  Learning: {
    title: '内部学习资源',
    subtitle: '学习资源与教程集合丨欢迎合作交流微信🛰️XingYueAIArt',
  },
  'Starlight Academy': {
    title: 'Starlight Academy',
    subtitle: 'Starlight探索与内部学习资源丨欢迎合作交流微信🛰️XingYueAIArt',
  },
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  STARLIGHT_TOKEN: 'starlight_token',
  STARLIGHT_KEY_INFO: 'starlight_key_info',
  HEADER_AVATAR: 'header_avatar',
  HEADER_AVATAR_IMAGE: 'header_avatar_image',
  HEADER_TITLE: 'header_title',
  CONTACT_IMAGE: 'contact_image',
  COOPERATION_IMAGE: 'cooperation_image',
  GEMINI_API_KEY: 'gemini_api_key',
} as const;

// Default Header Config
export const DEFAULT_HEADER_CONFIG = {
  avatar: 'K',
  avatarImage: null,
  title: 'Al Creative Commons',
};

