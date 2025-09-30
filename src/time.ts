/**
 * 时间工具模块
 */

import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * 固定时区
 */
export const TIMEZONE = 'Asia/Shanghai'

/**
 * 获取当前时间（上海时区）
 */
export function now(): dayjs.Dayjs {
  return dayjs().tz(TIMEZONE)
}

/**
 * 格式化日期为 YYYY/MM/DD
 */
export function formatDate(date?: dayjs.Dayjs): string {
  const d = date || now()
  return d.format('YYYY/MM/DD')
}

/**
 * 格式化日期时间为 ISO 8601
 */
export function formatDateTime(date?: dayjs.Dayjs): string {
  const d = date || now()
  return d.format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 为日期添加编号（如果需要）
 * @param baseDate 基础日期，格式 YYYY/MM/DD
 * @param existingCount 已存在的相同基础日期的数量
 * @returns 带编号的日期，如 2025/09/29(1)
 */
export function addDateNumber(baseDate: string, existingCount: number): string {
  if (existingCount === 0) {
    return baseDate
  }
  return `${baseDate}(${existingCount})`
}

/**
 * 提取基础日期（去掉编号）
 * @param dateString 可能带编号的日期字符串，如 2025/09/29(1)
 * @returns 基础日期，如 2025/09/29
 */
export function extractBaseDate(dateString: string): string {
  const match = dateString.match(/^(\d{4}\/\d{2}\/\d{2})/)
  return match ? match[1] : dateString
}
