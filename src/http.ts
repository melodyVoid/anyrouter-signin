/**
 * HTTP 客户端模块
 */

import axios, { type AxiosError, type AxiosInstance } from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { calculateAcwScV2, extractArg1FromHtml, isAcwChallenge } from './acw.js'
import type { SignInResponse, UserInfoResponse } from './types.js'

// 配置代理
const proxyUrl = 'http://127.0.0.1:7890'
const httpsAgent = new HttpsProxyAgent(proxyUrl)

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
 * 可变的 HTTP 配置（用于更新 cookie）
 */
class MutableHttpConfig {
  constructor(public config: HttpClientConfig) {}

  updateCookie(newCookie: string): void {
    this.config = { ...this.config, cookie: newCookie }
  }

  getCookie(): string {
    return this.config.cookie
  }
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
  console.log('createHttpClient', config.cookie)
  return axios.create({
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      Referer: config.referer,
      'User-Agent': config.userAgent,
      Cookie: config.cookie,
      'New-Api-User': config.userId.toString(),
    },
    // 添加 HTTPS agent 配置
    httpsAgent,
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
 * 处理 ACW 验证挑战
 * @param responseData - 响应数据（可能是 HTML）
 * @param mutableConfig - 可变配置对象
 * @returns 是否成功处理了 ACW 挑战
 */
function handleAcwChallenge(responseData: unknown, mutableConfig: MutableHttpConfig): boolean {
  // 检查响应是否是字符串（HTML）
  if (typeof responseData !== 'string') {
    return false
  }

  // 检查是否包含 ACW 验证
  if (!isAcwChallenge(responseData)) {
    return false
  }

  console.log('🔐 检测到 ACW 验证挑战，正在计算 acw_sc__v2...')

  // 提取 arg1 参数
  const arg1 = extractArg1FromHtml(responseData)
  if (!arg1) {
    console.error('❌ 无法从响应中提取 arg1 参数')
    return false
  }

  console.log(`📝 提取到 arg1: ${arg1}`)

  // 计算 acw_sc__v2
  const acwScV2 = calculateAcwScV2(arg1)
  console.log(`✅ 计算得到 acw_sc__v2: ${acwScV2}`)

  // 更新 cookie
  const currentCookie = mutableConfig.getCookie()
  const newCookie = updateCookieWithAcw(currentCookie, acwScV2)
  mutableConfig.updateCookie(newCookie)

  console.log('🔄 已更新 Cookie，准备重试请求...')
  return true
}

/**
 * 更新 Cookie 字符串，添加或替换 acw_sc__v2
 */
function updateCookieWithAcw(cookie: string, acwScV2: string): string {
  // 移除已存在的 acw_sc__v2
  const cookieWithoutAcw = cookie
    .split(';')
    .map(c => c.trim())
    .filter(c => !c.startsWith('acw_sc__v2='))
    .join('; ')

  // 添加新的 acw_sc__v2
  return cookieWithoutAcw ? `${cookieWithoutAcw}; acw_sc__v2=${acwScV2}` : `acw_sc__v2=${acwScV2}`
}

/**
 * 从 set-cookie header 中提取指定的 cookie 值
 */
function extractCookieFromSetCookie(
  setCookieHeaders: string | string[] | undefined,
  cookieName: string,
): string | null {
  if (!setCookieHeaders) {
    return null
  }

  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders]

  for (const header of headers) {
    // set-cookie 格式: "name=value; path=/; HttpOnly; Max-Age=3600"
    const match = header.match(new RegExp(`^${cookieName}=([^;]+)`))
    if (match) {
      return match[1]
    }
  }

  return null
}

/**
 * 更新 Cookie 字符串，添加从 set-cookie 中提取的 cookie
 */
function updateCookieFromResponse(
  currentCookie: string,
  setCookieHeaders: string | string[] | undefined,
): string {
  let updatedCookie = currentCookie

  // 提取 acw_tc
  const acwTc = extractCookieFromSetCookie(setCookieHeaders, 'acw_tc')
  if (acwTc) {
    console.log(`📝 从响应中提取到 acw_tc: ${acwTc}`)
    updatedCookie = updateSingleCookie(updatedCookie, 'acw_tc', acwTc)
  }

  // 提取 cdn_sec_tc
  const cdnSecTc = extractCookieFromSetCookie(setCookieHeaders, 'cdn_sec_tc')
  if (cdnSecTc) {
    console.log(`📝 从响应中提取到 cdn_sec_tc: ${cdnSecTc}`)
    updatedCookie = updateSingleCookie(updatedCookie, 'cdn_sec_tc', cdnSecTc)
  }

  return updatedCookie
}

/**
 * 更新单个 cookie 值
 */
function updateSingleCookie(cookie: string, name: string, value: string): string {
  // 移除已存在的同名 cookie
  const cookieWithoutTarget = cookie
    .split(';')
    .map(c => c.trim())
    .filter(c => !c.startsWith(`${name}=`))
    .join('; ')

  // 添加新的 cookie
  return cookieWithoutTarget ? `${cookieWithoutTarget}; ${name}=${value}` : `${name}=${value}`
}

/**
 * 执行签到
 */
export async function signIn(config: HttpClientConfig): Promise<SignInResponse> {
  const mutableConfig = new MutableHttpConfig(config)

  // 最多尝试 3 次（1 次正常请求 + 1 次 ACW 验证后的重试 + 1 次更新 cookie 后的重试）
  for (let attempt = 0; attempt < 2; attempt++) {
    const client = createHttpClient(mutableConfig.config)

    try {
      const response = await withRetry(() =>
        client.post(mutableConfig.config.signInAPI, {}, { validateStatus: status => status < 500 }),
      )

      console.log('signIn response', response.headers, response.data, response.status)

      // 标记是否需要重试
      let needsRetry = false

      // 1. 首先检查是否是 ACW 验证挑战
      if (handleAcwChallenge(response.data, mutableConfig)) {
        // ACW 验证已处理，标记需要重试
        console.log('🔄 ACW 验证已处理')
        needsRetry = true
      }

      // 2. 从响应中提取并更新 cookie（acw_tc 和 cdn_sec_tc）
      const setCookieHeader = response.headers['set-cookie']
      if (setCookieHeader) {
        const currentCookie = mutableConfig.getCookie()
        const updatedCookie = updateCookieFromResponse(currentCookie, setCookieHeader)
        if (updatedCookie !== currentCookie) {
          mutableConfig.updateCookie(updatedCookie)
          console.log('🔄 已更新 Cookie（从 set-cookie header）')
          needsRetry = true
        }
      }

      // 3. 如果需要重试，继续下一次循环
      if (needsRetry) {
        console.log('🔄 准备重新请求...')
        continue
      }

      // 4. 检查 HTTP 状态
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
      let errorMessage = axiosError.message || '网络请求失败'

      // 提供更友好的 SSL 错误提示
      if (
        errorMessage.includes('EPROTO') ||
        errorMessage.includes('SSL') ||
        errorMessage.includes('TLS')
      ) {
        errorMessage = `SSL/TLS 连接失败。可能原因：
        1. Cookie 已过期，请更新配置文件中的 cookie
        2. 服务器 SSL 配置问题，请联系服务提供商
        3. 网络环境限制，请检查网络连接
        原始错误: ${axiosError.message}`
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  // 如果两次尝试都失败了
  return {
    success: false,
    error: 'ACW 验证失败：已尝试多次但仍无法通过验证',
  }
}

/**
 * 查询用户信息（余额）
 */
export async function getUserInfo(config: HttpClientConfig): Promise<UserInfoResponse> {
  const mutableConfig = new MutableHttpConfig(config)

  // 最多尝试 3 次（1 次正常请求 + 1 次 ACW 验证后的重试 + 1 次更新 cookie 后的重试）
  for (let attempt = 0; attempt < 3; attempt++) {
    const client = createHttpClient(mutableConfig.config)

    try {
      const response = await withRetry(() =>
        client.get(mutableConfig.config.userInfoAPI, { validateStatus: status => status < 500 }),
      )

      // 标记是否需要重试
      let needsRetry = false

      // 1. 首先检查是否是 ACW 验证挑战
      if (handleAcwChallenge(response.data, mutableConfig)) {
        // ACW 验证已处理，标记需要重试
        console.log('🔄 ACW 验证已处理')
        needsRetry = true
      }

      // 2. 从响应中提取并更新 cookie（acw_tc 和 cdn_sec_tc）
      const setCookieHeader = response.headers['set-cookie']
      if (setCookieHeader) {
        const currentCookie = mutableConfig.getCookie()
        const updatedCookie = updateCookieFromResponse(currentCookie, setCookieHeader)
        if (updatedCookie !== currentCookie) {
          mutableConfig.updateCookie(updatedCookie)
          console.log('🔄 已更新 Cookie（从 set-cookie header）')
          needsRetry = true
        }
      }

      // 3. 如果需要重试，继续下一次循环
      if (needsRetry) {
        console.log('🔄 准备重新请求...')
        continue
      }

      // 4. 检查 HTTP 状态
      if (response.status < 200 || response.status >= 300) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      // 检查响应数据
      const { data } = response.data
      if (!data || typeof data !== 'object') {
        return {
          success: false,
          error: '响应格式错误：不是有效的 JSON 对象',
        }
      }
      console.log('getUserInfo response', data)

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
      let errorMessage = axiosError.message || '网络请求失败'

      // 提供更友好的 SSL 错误提示
      if (
        errorMessage.includes('EPROTO') ||
        errorMessage.includes('SSL') ||
        errorMessage.includes('TLS')
      ) {
        errorMessage = `SSL/TLS 连接失败。可能原因：
        1. Cookie 已过期，请更新配置文件中的 cookie
        2. 服务器 SSL 配置问题，请联系服务提供商
        3. 网络环境限制，请检查网络连接
        原始错误: ${axiosError.message}`
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  // 如果两次尝试都失败了
  return {
    success: false,
    error: 'ACW 验证失败：已尝试多次但仍无法通过验证',
  }
}
