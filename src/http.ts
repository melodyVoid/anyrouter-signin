/**
 * HTTP 客户端模块
 */

import axios, { type AxiosError, type AxiosInstance } from 'axios'
import type { SignInResponse, UserInfoResponse } from './types.js'

/**
 * HTTP 客户端配置
 */
interface HttpClientConfig {
  signInAPI: string
  userInfoAPI: string
  referer: string
  userAgent: string
  userId: number
  cookie: string
}

/**
 * 重试配置
 */
const RETRY_CONFIG = {
  maxRetries: 2,
  retryDelay: 2000, // ms
}

/**
 * 创建 HTTP 客户端
 */
export function createHttpClient(config: HttpClientConfig): AxiosInstance {
  return axios.create({
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      Referer: config.referer,
      'User-Agent': config.userAgent,
      Cookie: config.cookie,
      'New-Api-User': config.userId.toString(),
    },
  })
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 带重试的请求包装器
 */
async function withRetry<T>(fn: () => Promise<T>, retries = RETRY_CONFIG.maxRetries): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt < retries) {
        await delay(RETRY_CONFIG.retryDelay)
      }
    }
  }

  throw lastError
}

/**
 * 执行签到
 */
export async function signIn(config: HttpClientConfig): Promise<SignInResponse> {
  const client = createHttpClient(config)

  try {
    const response = await withRetry(() =>
      client.post(config.signInAPI, {}, { validateStatus: status => status < 500 }),
    )

    // 检查 HTTP 状态
    if (response.status < 200 || response.status >= 300) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    // 检查响应数据
    const data = response.data
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: '响应格式错误：不是有效的 JSON 对象',
      }
    }

    // 提取 message
    const message = data.message || data.msg || '签到成功'

    return {
      success: true,
      message,
    }
  } catch (error) {
    const axiosError = error as AxiosError
    return {
      success: false,
      error: axiosError.message || '网络请求失败',
    }
  }
}

/**
 * 查询用户信息（余额）
 */
export async function getUserInfo(config: HttpClientConfig): Promise<UserInfoResponse> {
  const client = createHttpClient(config)

  try {
    const response = await withRetry(() =>
      client.get(config.userInfoAPI, { validateStatus: status => status < 500 }),
    )

    // 检查 HTTP 状态
    if (response.status < 200 || response.status >= 300) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    // 检查响应数据
    const data = response.data
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: '响应格式错误：不是有效的 JSON 对象',
      }
    }

    // 检查 quota 字段
    if (typeof data.quota !== 'number') {
      return {
        success: false,
        error: '响应缺少 quota 字段或字段类型不正确',
      }
    }

    return {
      success: true,
      quota: data.quota,
    }
  } catch (error) {
    const axiosError = error as AxiosError
    return {
      success: false,
      error: axiosError.message || '网络请求失败',
    }
  }
}
