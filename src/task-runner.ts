/**
 * 任务执行器
 */

import pLimit from 'p-limit'
import { getUserInfo, signIn } from './http.js'
import { writeLog } from './logger.js'
import { sendNotification } from './notification.js'
import { formatDateTime } from './time.js'
import type { Config, TaskResult } from './types.js'

/**
 * 执行单个用户的签到任务
 */
async function executeUserTask(
  userId: number,
  cookie: string,
  config: Config,
): Promise<TaskResult> {
  const httpConfig = {
    signInAPI: config.signInAPI,
    userInfoAPI: config.userInfoAPI,
    referer: config.referer,
    userAgent: config.userAgent,
    userId,
    cookie,
  }

  // 执行签到
  const signInResult = await signIn(httpConfig)
  if (!signInResult.success) {
    return {
      userId,
      columnName: `github_${userId}`,
      success: false,
      error: signInResult.error,
      message: signInResult.error,
    }
  }

  // 查询余额
  const userInfoResult = await getUserInfo(httpConfig)

  if (!userInfoResult.success) {
    return {
      userId,
      columnName: `github_${userId}`,
      success: false,
      error: userInfoResult.error,
      message: signInResult.message,
    }
  }

  // 成功
  return {
    userId,
    columnName: `github_${userId}`,
    success: true,
    amount: userInfoResult.quota,
    message: signInResult.message || '签到成功',
  }
}

/**
 * 执行所有用户的签到任务
 */
export async function runTask(config: Config): Promise<void> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🚀 开始执行签到任务 - ${formatDateTime()}`)
  console.log(`${'='.repeat(60)}\n`)

  // 并发控制
  const limit = pLimit(config.concurrency)

  // 执行所有用户任务
  const taskPromises = config.users.map(user =>
    limit(() => {
      console.log(`📝 开始处理用户 ${user.userId}...`)
      return executeUserTask(user.userId, user.cookie, config)
    }),
  )

  const results = await Promise.all(taskPromises)

  // 打印结果摘要
  console.log(`\n${'─'.repeat(60)}`)
  console.log('📊 任务执行结果：\n')
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ 用户 ${result.userId}: 签到成功，余额 ${result.amount}`)
    } else {
      console.log(`❌ 用户 ${result.userId}: 签到失败 - ${result.error}`)
    }
  })
  console.log(`${'─'.repeat(60)}\n`)

  // 判断是否有成功的任务
  const hasAnySuccess = results.some(r => r.success)

  // 记录日志
  const logEntries = results.map(result => ({
    userId: result.userId,
    level: result.success ? ('SUCCESS' as const) : ('FAIL' as const),
    message: result.message || result.error || '未知错误',
    timestamp: formatDateTime(),
  }))

  await Promise.all(logEntries.map(entry => writeLog(entry, config.dryRun)))

  // 如果全部失败，不发送通知
  if (!hasAnySuccess) {
    console.log('⚠️  所有用户签到失败，不发送通知\n')
    return
  }

  // 发送通知
  try {
    await sendNotification(results, config.notification, config.dryRun)
  } catch (error) {
    console.error('⚠️  通知发送失败，但签到任务已完成')
  }

  console.log(`✨ 任务执行完成！\n`)
}
