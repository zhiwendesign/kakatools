import { API_BASE_URL, DATA_SOURCES, ADMIN_ONLY_CATEGORIES } from '@/constants';
import {
  CategoryType,
  CategoryData,
  LoginResponse,
  VerifyResponse,
  KeyVerifyResponse,
  KeysListResponse,
  GenerateKeyResponse,
  AccessKey,
} from '@/types';

// ==================== Data Fetching ====================

export async function fetchCategoryData(category: CategoryType, authToken?: string | null): Promise<CategoryData> {
  const url = `${API_BASE_URL}${DATA_SOURCES[category]}`;

  // 管理员专属分类需要带上 token
  const headers: HeadersInit = {};
  if (ADMIN_ONLY_CATEGORIES.includes(category) && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    // 403 表示无权限，返回空数据
    if (response.status === 403) {
      return { filters: [], resources: [] };
    }
    throw new Error(`Failed to fetch ${category} data`);
  }

  return response.json();
}

export async function fetchAllCategoriesData(
  categories: CategoryType[],
  authToken?: string | null
): Promise<Record<CategoryType, CategoryData>> {
  const results = await Promise.all(
    categories.map(async (category) => {
      try {
        const data = await fetchCategoryData(category, authToken);
        return { category, data };
      } catch (error) {
        console.error(`Failed to load ${category}:`, error);
        return { category, data: { filters: [], resources: [] } };
      }
    })
  );

  return results.reduce((acc, { category, data }) => {
    acc[category] = data;
    return acc;
  }, {} as Record<CategoryType, CategoryData>);
}

// ==================== Auth API ====================

export async function login(password: string): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    // 检查响应状态
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ success: false, message: '网络错误' }));
      return errorData;
    }

    // 确保响应是JSON格式
    const data = await response.json();

    // 如果响应状态码不是200，仍然返回解析后的JSON，让调用方处理
    return data;
  } catch (error) {
    console.error('Login API error:', error);
    return { success: false, message: '网络错误，请检查服务器连接' };
  }
}

export async function verifyToken(token: string): Promise<VerifyResponse> {
  try {
    const url = `${API_BASE_URL}/api/auth/verify`;
    console.log('[API] Verifying token at:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[API] Verify response status:', response.status);

    const data = await response.json();
    console.log('[API] Verify response data:', data);

    return data;
  } catch (error) {
    console.error('[API] Verify token error:', error);
    return { success: false, message: 'Network error' };
  }
}

export async function logout(token: string): Promise<void> {
  await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// ==================== Access Keys API ====================

export async function verifyAccessKey(code: string): Promise<KeyVerifyResponse> {
  const response = await fetch(`${API_BASE_URL}/api/keys/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code.trim() }),
  });

  const data = await response.json();

  // 确保错误消息被正确传递，特别是单设备限制的错误
  if (!data.success && response.status === 403) {
    return {
      success: false,
      message: data.message || '此访问密钥已在其他设备上激活，无法在当前设备使用。如需更换设备，请联系管理员重置密钥。'
    };
  }

  return data;
}

export async function fetchAccessKeys(token: string): Promise<KeysListResponse> {
  const response = await fetch(`${API_BASE_URL}/api/keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.json();
}

export async function generateAccessKey(
  token: string,
  durationInDays: number,
  username: string,
  userType: 'user' | 'admin' = 'user',
  percentage: number = 100
): Promise<GenerateKeyResponse> {
  const response = await fetch(`${API_BASE_URL}/api/keys/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ durationInDays, username, userType, percentage }),
  });

  return response.json();
}

export async function revokeAccessKey(token: string, code: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/keys/${code}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.json();
}

export async function renameAccessKey(
  token: string,
  code: string,
  name: string
): Promise<{ success: boolean; key?: AccessKey }> {
  const response = await fetch(`${API_BASE_URL}/api/keys/${code}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  return response.json();
}

// ==================== Password API ====================

export async function generatePasswordHash(
  token: string,
  newPassword: string
): Promise<{ success: boolean; hash?: string; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/generate-password-hash`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ newPassword }),
  });

  return response.json();
}

export async function updatePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/update-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  return response.json();
}

// ==================== Resources API ====================

export async function createResource(
  token: string,
  resource: {
    id: string;
    title: string;
    description?: string;
    category: string;
    tags: string[];
    imageUrl?: string;
    link?: string;
    featured?: boolean;
    contentType?: 'link' | 'document' | 'image';
    content?: string;
    menu?: string;
  }
): Promise<{ success: boolean; resource?: any; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/resources`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(resource),
  });

  return response.json();
}

export async function updateResource(
  token: string,
  resource: {
    id: string;
    title: string;
    description?: string;
    category: string;
    tags: string[];
    imageUrl?: string;
    link?: string;
    featured?: boolean;
    contentType?: 'link' | 'document' | 'image';
    content?: string;
    menu?: string;
  }
): Promise<{ success: boolean; resource?: any; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/resources`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(resource),
  });

  return response.json();
}

export async function deleteResource(
  token: string,
  id: string
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/resources/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.json();
}

export async function batchCreateResources(
  token: string,
  resources: Array<{
    id: string;
    title: string;
    description?: string;
    category: string;
    tags: string[];
    imageUrl?: string;
    link?: string;
    featured?: boolean;
    contentType?: 'link' | 'document' | 'image';
    content?: string;
  }>
): Promise<{
  success: boolean;
  message?: string;
  results?: {
    total: number;
    success: number;
    failed: number;
    errors: Array<{ index: number; message: string }>;
  };
}> {
  const response = await fetch(`${API_BASE_URL}/api/resources/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ resources }),
  });

  return response.json();
}

// ==================== Filters API ====================

export async function addFilter(
  token: string,
  category: string,
  label: string,
  tag: string
): Promise<{ success: boolean; filters?: any[]; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/filters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ category, label, tag }),
  });

  return response.json();
}

export async function deleteFilter(
  token: string,
  category: string,
  tag: string
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/filters/${encodeURIComponent(category)}/${encodeURIComponent(tag)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.json();
}

// ==================== Header Config API ====================

export async function fetchHeaderConfig(): Promise<{
  success: boolean;
  config?: {
    avatar?: string;
    avatarImage?: string | null;
    title?: string;
    contactImage?: string | null;
    cooperationImage?: string | null;
    categorySubtitles?: Record<string, string | null>;
  };
}> {
  const response = await fetch(`${API_BASE_URL}/api/config/header`, {
    cache: 'no-cache', // 确保每次都从服务器获取最新配置
  });
  return response.json();
}

export async function saveHeaderConfig(
  token: string,
  config: {
    avatar?: string;
    avatarImage?: string | null;
    title?: string;
    contactImage?: string | null;
    cooperationImage?: string | null;
    categorySubtitles?: Record<string, string | null>;
  }
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/config/header`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(config),
  });

  return response.json();
}

// ==================== Tag Dictionary API ====================

export async function addTagDictionaryEntry(
  token: string,
  category: string,
  label: string,
  tag: string
): Promise<{ success: boolean; tagDictionary?: any[]; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/tag-dictionary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ category, label, tag }),
  });

  return response.json();
}

export async function deleteTagDictionaryEntry(
  token: string,
  category: string,
  tag: string
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/tag-dictionary/${encodeURIComponent(category)}/${encodeURIComponent(tag)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.json();
}
