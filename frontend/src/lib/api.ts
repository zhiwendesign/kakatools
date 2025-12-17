import { API_BASE_URL, DATA_SOURCES } from '@/constants';
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

export async function fetchCategoryData(category: CategoryType): Promise<CategoryData> {
  const url = `${API_BASE_URL}${DATA_SOURCES[category]}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${category} data`);
  }
  
  return response.json();
}

export async function fetchAllCategoriesData(
  categories: CategoryType[]
): Promise<Record<CategoryType, CategoryData>> {
  const results = await Promise.all(
    categories.map(async (category) => {
      try {
        const data = await fetchCategoryData(category);
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
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  
  return response.json();
}

export async function verifyToken(token: string): Promise<VerifyResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  return response.json();
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
  
  return response.json();
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
  username: string
): Promise<GenerateKeyResponse> {
  const response = await fetch(`${API_BASE_URL}/api/keys/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ durationInDays, username }),
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

