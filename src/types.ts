/**
 * 类型定义文件
 */

/**
 * 用户配置
 */
export interface UserConfig {
  userId: number
  cookie: string
}

/**
 * 应用配置
 */
export interface Config {
  schedule: string[]
  signInAPI: string
  userInfoAPI: string
  referer: string
  userAgent: string
  concurrency: number
  resultFile: string
  dryRun: boolean
  users: UserConfig[]
}

/**
 * 签到响应
 */
export interface SignInResponse {
  success: boolean
  message?: string
  error?: string
}

/**
 * 用户信息响应
 */
export interface UserInfoResponse {
  success: boolean
  quota?: number
  error?: string
}

/**
 * 单个用户的任务结果
 */
export interface TaskResult {
  userId: number
  columnName: string // github_<USER_ID>
  success: boolean
  amount?: number // 成功时的金额
  message?: string // 签到返回的消息
  error?: string // 失败时的错误信息
}

/**
 * 任务执行总结果
 */
export interface TaskSummary {
  date: string // YYYY/MM/DD
  results: TaskResult[]
  hasAnySuccess: boolean
}
