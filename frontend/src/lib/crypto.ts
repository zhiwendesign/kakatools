'use client';

/**
 * 前端加密工具库
 * 提供常用的加密、解密、哈希功能
 */

/**
 * 生成随机字符串
 * @param length 字符串长度
 * @returns 随机字符串
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 计算字符串的 SHA-256 哈希值
 * @param input 输入字符串
 * @returns SHA-256 哈希值（十六进制字符串）
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 计算字符串的 SHA-1 哈希值
 * @param input 输入字符串
 * @returns SHA-1 哈希值（十六进制字符串）
 */
export async function sha1(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 生成 HMAC 签名
 * @param message 消息
 * @param secret 密钥
 * @returns HMAC 签名（十六进制字符串）
 */
export async function generateHmac(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  // 导入密钥
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // 生成 HMAC
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 加密对象为 base64 字符串
 * @param data 要加密的数据对象
 * @returns base64 字符串
 */
export function encodeBase64(data: any): string {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(jsonString);
  
  // 兼容方式转换 Uint8Array 到字符串
  let charCodeStr = '';
  for (let i = 0; i < bytes.length; i++) {
    charCodeStr += String.fromCharCode(bytes[i]);
  }
  
  return btoa(charCodeStr);
}

/**
 * 解密 base64 字符串为对象
 * @param encoded 加密的 base64 字符串
 * @returns 解密后的数据对象
 */
export function decodeBase64<T = any>(encoded: string): T {
  const bytes = atob(encoded);
  const decoder = new TextDecoder();
  
  // 兼容方式转换字符串到 Uint8Array
  const uint8Array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    uint8Array[i] = bytes.charCodeAt(i);
  }
  
  const jsonString = decoder.decode(uint8Array);
  return JSON.parse(jsonString);
}

/**
 * 简单的加密函数（用于非敏感数据，仅防止明文传输）
 * @param text 要加密的文本
 * @param key 加密密钥
 * @returns 加密后的字符串
 */
export function simpleEncrypt(text: string, key: string): string {
  // 简单的异或加密，仅用于防止明文传输，不是真正的安全加密
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

/**
 * 简单的解密函数
 * @param encrypted 加密后的字符串
 * @param key 解密密钥
 * @returns 解密后的文本
 */
export function simpleDecrypt(encrypted: string, key: string): string {
  const decoded = atob(encrypted);
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

/**
 * API 请求签名工具
 */
export class ApiSigner {
  private secretKey: string;
  
  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }
  
  /**
   * 生成 API 请求签名
   * @param url 请求 URL
   * @param method 请求方法
   * @param body 请求体
   * @returns 签名对象，包含 timestamp 和 signature
   */
  async generateSignature(url: string, method: string, body?: any): Promise<{ timestamp: number; signature: string }> {
    const timestamp = Date.now();
    const bodyString = body ? JSON.stringify(body) : '';
    const message = `${method.toUpperCase()}:${url}:${timestamp}:${bodyString}`;
    const signature = await generateHmac(message, this.secretKey);
    
    return {
      timestamp,
      signature
    };
  }
  
  /**
   * 验证 API 响应签名
   * @param url 请求 URL
   * @param method 请求方法
   * @param body 请求体
   * @param timestamp 时间戳
   * @param signature 签名
   * @returns 是否验证通过
   */
  async verifySignature(url: string, method: string, body: any, timestamp: number, signature: string): Promise<boolean> {
    // 验证时间戳是否在有效范围内（如 5 分钟）
    const now = Date.now();
    const timeDiff = Math.abs(now - timestamp);
    if (timeDiff > 5 * 60 * 1000) {
      return false;
    }
    
    // 重新生成签名并比较
    const expected = await this.generateSignature(url, method, body);
    return expected.signature === signature;
  }
}

/**
 * 本地存储加密工具
 */
export class EncryptedStorage {
  private key: string;
  
  constructor(key: string) {
    this.key = key;
  }
  
  /**
   * 存储加密数据
   * @param key 存储键
   * @param value 存储值
   */
  setItem<T>(key: string, value: T): void {
    const jsonString = JSON.stringify(value);
    const encrypted = simpleEncrypt(jsonString, this.key);
    localStorage.setItem(key, encrypted);
  }
  
  /**
   * 获取加密数据
   * @param key 存储键
   * @returns 解密后的值或 null
   */
  getItem<T>(key: string): T | null {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) {
      return null;
    }
    
    try {
      const decrypted = simpleDecrypt(encrypted, this.key);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.error('Failed to decrypt storage item:', error);
      localStorage.removeItem(key);
      return null;
    }
  }
  
  /**
   * 删除存储项
   * @param key 存储键
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
  
  /**
   * 清空所有存储项
   */
  clear(): void {
    localStorage.clear();
  }
}

// 默认的 API 签名器实例（使用环境变量或默认密钥）
const DEFAULT_SECRET_KEY = process.env.NEXT_PUBLIC_API_SECRET || 'default-secret-key-change-in-production';
export const apiSigner = new ApiSigner(DEFAULT_SECRET_KEY);

// 默认的加密存储实例
export const encryptedStorage = new EncryptedStorage(DEFAULT_SECRET_KEY);
