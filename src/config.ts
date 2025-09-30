/**
 * 配置管理模块
 */

import fs from 'fs-extra'
import yaml from 'js-yaml'
import { z } from 'zod'
import type { Config } from './types.js'

/**
 * 用户配置 Schema
 */
const UserConfigSchema = z.object({
  userId: z.number().int().positive('userId 必须是正整数'),
  cookie: z.string().min(1, 'cookie 不能为空'),
})

/**
 * 配置 Schema
 */
const ConfigSchema = z.object({
  schedule: z
    .array(z.string().regex(/^\d{2}:\d{2}$/, '时间格式必须为 HH:mm'))
    .min(1, 'schedule 至少需要一个时间点'),
  signInAPI: z.string().url().optional(),
  userInfoAPI: z.string().url().optional(),
  referer: z.string().url().optional(),
  userAgent: z.string().optional(),
  concurrency: z.number().int().positive().optional(),
  resultFile: z.string().optional(),
  dryRun: z.boolean().optional(),
  users: z.array(UserConfigSchema).min(1, 'users 至少需要一个用户'),
})

/**
 * 默认配置值
 */
const DEFAULT_CONFIG: Partial<Config> = {
  signInAPI: 'https://anyrouter.top/api/user/sign_in',
  userInfoAPI: 'https://anyrouter.top/api/user/self',
  referer: 'https://anyrouter.top/console/topup',
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  concurrency: 4,
  resultFile: 'result.md',
  dryRun: false,
}

/**
 * 加载配置文件
 * @param configPath 配置文件路径，默认为 config.yaml
 * @returns 配置对象
 */
export async function loadConfig(configPath = 'config.yaml'): Promise<Config> {
  // 检查文件是否存在
  if (!(await fs.pathExists(configPath))) {
    throw new Error(
      `配置文件不存在: ${configPath}\n请复制 config.example.yaml 为 config.yaml 并填入真实配置`,
    )
  }

  // 读取并解析 YAML
  const content = await fs.readFile(configPath, 'utf-8')
  const rawConfig = yaml.load(content) as Record<string, unknown>

  // 应用默认值
  const configWithDefaults = {
    ...DEFAULT_CONFIG,
    ...rawConfig,
  }

  // 校验配置
  try {
    const validatedConfig = ConfigSchema.parse(configWithDefaults)

    // 返回完整配置
    return {
      schedule: validatedConfig.schedule,
      signInAPI: validatedConfig.signInAPI || DEFAULT_CONFIG.signInAPI!,
      userInfoAPI: validatedConfig.userInfoAPI || DEFAULT_CONFIG.userInfoAPI!,
      referer: validatedConfig.referer || DEFAULT_CONFIG.referer!,
      userAgent: validatedConfig.userAgent || DEFAULT_CONFIG.userAgent!,
      concurrency: validatedConfig.concurrency || DEFAULT_CONFIG.concurrency!,
      resultFile: validatedConfig.resultFile || DEFAULT_CONFIG.resultFile!,
      dryRun: validatedConfig.dryRun || DEFAULT_CONFIG.dryRun!,
      users: validatedConfig.users,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map(err => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n')
      throw new Error(`配置文件验证失败:\n${errorMessages}`)
    }
    throw error
  }
}
