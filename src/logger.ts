/**
 * 日志模块
 */

import fs from 'fs-extra'
import { formatDateTime } from './time.js'

/**
 * 日志级别
 */
export type LogLevel = 'SUCCESS' | 'FAIL'

/**
 * 日志记录
 */
export interface LogEntry {
  userId: number
  level: LogLevel
  message: string
  timestamp?: string
}

/**
 * 格式化日志行
 */
function formatLogLine(entry: LogEntry): string {
  const timestamp = entry.timestamp || formatDateTime()
  return `${timestamp}\t${entry.level}\tmessage: "${entry.message}"`
}

/**
 * 获取日志文件路径
 */
function getLogFilePath(userId: number): string {
  return `github_${userId}.log`
}

/**
 * 写入日志
 * @param entry 日志记录
 * @param dryRun 是否为 dry-run 模式
 */
export async function writeLog(entry: LogEntry, dryRun = false): Promise<void> {
  const logLine = formatLogLine(entry)

  if (dryRun) {
    // dry-run 模式：只打印到控制台
    console.log(`[DRY-RUN LOG] ${logLine}`)
    return
  }

  // 实际写入文件
  const logFile = getLogFilePath(entry.userId)
  await fs.appendFile(logFile, logLine + '\n', 'utf-8')
}

/**
 * 批量写入日志
 */
export async function writeLogs(entries: LogEntry[], dryRun = false): Promise<void> {
  await Promise.all(entries.map(entry => writeLog(entry, dryRun)))
}
