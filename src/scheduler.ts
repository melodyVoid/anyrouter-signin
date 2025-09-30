/**
 * 调度器模块
 */

import cron from 'node-cron'
import { runTask } from './task-runner.js'
import { now } from './time.js'
import type { Config } from './types.js'

/**
 * 调度任务列表
 */
let scheduledTasks: cron.ScheduledTask[] = []

/**
 * 任务执行锁（防止重复执行）
 */
let isTaskRunning = false

/**
 * 将 HH:mm 格式转换为 cron 表达式
 * @param time 时间字符串，格式 HH:mm
 * @returns cron 表达式：秒 分 时 日 月 星期
 */
function timeToCron(time: string): string {
  const [hour, minute] = time.split(':')
  // node-cron 格式：秒 分 时 日 月 星期
  return `0 ${minute} ${hour} * * *`
}

/**
 * 执行任务的包装函数
 */
async function executeTask(config: Config): Promise<void> {
  // 检查锁
  if (isTaskRunning) {
    console.log('⚠️  上一次任务仍在执行中，跳过本次调度')
    return
  }

  isTaskRunning = true

  try {
    await runTask(config)
  } catch (error) {
    console.error('❌ 任务执行失败:', error)
  } finally {
    isTaskRunning = false
  }
}

/**
 * 启动调度器
 */
export function startScheduler(config: Config): void {
  console.log(`\n⏰ 启动定时调度器 (时区: Asia/Shanghai)`)
  console.log(`当前时间: ${now().format('YYYY-MM-DD HH:mm:ss')}\n`)

  // 停止现有的调度任务
  stopScheduler()

  // 为每个时间点注册调度任务
  config.schedule.forEach(time => {
    const cronExpression = timeToCron(time)
    console.log(`📅 注册定时任务: 每天 ${time} 执行`)

    const task = cron.schedule(
      cronExpression,
      () => {
        console.log(`\n🔔 定时任务触发 - ${time}`)
        executeTask(config)
      },
      {
        timezone: 'Asia/Shanghai',
      },
    )

    scheduledTasks.push(task)
  })

  console.log(`\n✅ 调度器已启动，共 ${scheduledTasks.length} 个定时任务\n`)
}

/**
 * 停止调度器
 */
export function stopScheduler(): void {
  if (scheduledTasks.length > 0) {
    console.log(`停止 ${scheduledTasks.length} 个定时任务...`)
    scheduledTasks.forEach(task => task.stop())
    scheduledTasks = []
  }
}
