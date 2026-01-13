import { CategoryType, FiltersMap } from '@/types';

// API Configuration
// 统一部署模式：默认使用相对路径（同域请求）
// 开发模式下，如果未设置环境变量，则使用后端服务器地址
const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // 开发模式下使用后端服务器地址
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4200';
  }
  // 生产模式使用相对路径
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

// Data Sources - 使用数据库 API 端点
export const DATA_SOURCES: Record<CategoryType, string> = {
  AIGC: '/api/resources/AIGC',
  UXTips: '/api/resources/UXTips',
  Learning: '/api/resources/Learning',
  '星芒学社': '/api/resources/星芒学社',
  '图库': '/api/resources/图库',
};

// Default Filters
export const DEFAULT_FILTERS: FiltersMap = {
  AIGC: [
    { label: '全部', tag: 'All' },
    { label: '卡卡推荐', tag: '卡卡推荐' },
  ],
  UXTips: [
    { label: '全部', tag: 'All' },
    { label: '卡卡推荐', tag: '卡卡推荐' },
  ],
  Learning: [
    { label: '全部', tag: 'All' },
    { label: '卡卡推荐', tag: '卡卡推荐' },
  ],
  '星芒学社': [
    { label: 'All', tag: 'All' },
    { label: 'Exclusive', tag: 'Exclusive' },
  ],
  '图库': [
    { label: '全部', tag: 'All' },
    { label: '卡卡推荐', tag: '卡卡推荐' },
  ],
};

// Category Descriptions
export const CATEGORY_INFO: Record<CategoryType, { title: string; subtitle: string }> = {
  AIGC: {
    title: '卡卡AI知识库',
    subtitle: '探索AI绘画模型和ComfyUI资料集合丨欢迎合作交流微信🛰️XingYueAIArt',
  },
  UXTips: {
    title: 'UXTips',
    subtitle: '跟我学习更多UI/UX知识丨欢迎合作交流微信🛰️XingYueAIArt',
  },
  Learning: {
    title: '内部学习资源',
    subtitle: '学习资源与教程集合丨欢迎合作交流微信🛰️XingYueAIArt',
  },
  '星芒学社': {
    title: '星芒学社',
    subtitle: '愿大家像星星一样散发着光芒，有无限可能',
  },
  '图库': {
    title: '图库',
    subtitle: '精选图片资源集合，探索视觉艺术之美',
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
  title: '卡卡AI知识库',
};

// Category Constants
export const ADMIN_ONLY_CATEGORIES: CategoryType[] = ['Learning'];
export const PERCENTAGE_CONTROLLED_CATEGORIES: CategoryType[] = ['星芒学社', '图库'];
export const DEFAULT_GUEST_PERCENTAGE = 20;// Percentage Options
export const PERCENTAGE_OPTIONS = [20, 50, 100] as const;
export type PercentageOption = typeof PERCENTAGE_OPTIONS[number];