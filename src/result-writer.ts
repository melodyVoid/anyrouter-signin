/**
 * 结果写入模块
 */

import fs from 'fs-extra'
import { markdownTable } from 'markdown-table'
import { addDateNumber, extractBaseDate } from './time.js'
import type { TaskSummary } from './types.js'

/**
 * Markdown 表格数据结构
 */
interface MarkdownTable {
  headers: string[]
  rows: string[][]
}

/**
 * 计算金额
 * @param quota quota 值
 * @returns 格式化的金额字符串（带 $ 前缀）
 */
function calculateAmount(quota: number): string {
  const amount = Math.round((quota / 500000) * 100) / 100 // 四舍五入保留两位小数
  return `$${amount.toFixed(2)}`
}

/**
 * 解析 Markdown 表格
 */
function parseMarkdownTable(content: string): MarkdownTable {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('|'))

  if (lines.length < 2) {
    // 空表格或格式错误
    return { headers: [], rows: [] }
  }

  // 解析表头
  const headers = lines[0]
    .split('|')
    .map(cell => cell.trim())
    .filter(cell => cell !== '')

  // 跳过分隔行（第二行），解析数据行
  const rows = lines.slice(2).map(line =>
    line
      .split('|')
      .map(cell => cell.trim())
      .filter((_, index, arr) => {
        // 过滤掉首尾空元素（因为 | 开头和结尾）
        return index > 0 && index < arr.length - 1
      }),
  )

  return { headers, rows }
}

/**
 * 生成 Markdown 表格字符串
 */
function generateMarkdownTable(table: MarkdownTable): string {
  if (table.headers.length === 0) {
    return ''
  }

  const data = [table.headers, ...table.rows]
  return markdownTable(data, { align: ['l', ...Array(table.headers.length - 1).fill('r')] })
}

/**
 * 同步表头
 * 根据当前配置的用户列表，更新表头和历史数据
 */
function syncHeaders(table: MarkdownTable, currentUserIds: number[]): MarkdownTable {
  const currentHeaders = ['日期', ...currentUserIds.map(id => `github_${id}`)]

  // 如果表格为空，直接返回新表头
  if (table.headers.length === 0) {
    return {
      headers: currentHeaders,
      rows: [],
    }
  }

  // 如果表头完全一致，无需同步
  if (
    table.headers.length === currentHeaders.length &&
    table.headers.every((h, i) => h === currentHeaders[i])
  ) {
    return table
  }

  // 构建新表头和列映射
  const newHeaders = currentHeaders
  const oldHeaders = table.headers

  // 创建列映射：新列索引 -> 旧列索引（-1 表示新增列）
  const columnMapping: number[] = newHeaders.map(header => {
    const oldIndex = oldHeaders.indexOf(header)
    return oldIndex
  })

  // 转换数据行
  const newRows = table.rows.map(oldRow => {
    return columnMapping.map(oldIndex => {
      if (oldIndex === -1) {
        return '' // 新增列，填空
      }
      return oldRow[oldIndex] || ''
    })
  })

  return {
    headers: newHeaders,
    rows: newRows,
  }
}

/**
 * 插入新数据行
 * 按时间倒序插入，同日期的行添加编号
 */
function insertDataRow(table: MarkdownTable, summary: TaskSummary): MarkdownTable {
  const baseDate = summary.date

  // 计算已存在的相同基础日期的数量
  let existingCount = 0
  for (const row of table.rows) {
    const dateCell = row[0] || ''
    if (extractBaseDate(dateCell) === baseDate) {
      existingCount++
    }
  }

  // 生成日期列的值
  const dateValue = addDateNumber(baseDate, existingCount)

  // 生成数据行
  const newRow = [dateValue]
  for (let i = 1; i < table.headers.length; i++) {
    const columnName = table.headers[i]
    const userId = parseInt(columnName.replace('github_', ''), 10)
    const result = summary.results.find(r => r.userId === userId)

    if (!result) {
      newRow.push('')
    } else if (result.success && result.amount !== undefined) {
      newRow.push(calculateAmount(result.amount))
    } else {
      newRow.push('签到失败')
    }
  }

  // 找到插入位置：在同日期分组的顶部
  let insertIndex = 0
  for (let i = 0; i < table.rows.length; i++) {
    const rowDate = table.rows[i][0] || ''
    if (extractBaseDate(rowDate) === baseDate) {
      insertIndex = i
      break
    }
  }

  // 如果没有找到同日期行，插入到顶部
  const newRows = [...table.rows]
  newRows.splice(insertIndex, 0, newRow)

  return {
    headers: table.headers,
    rows: newRows,
  }
}

/**
 * 写入结果到 Markdown 文件
 * @param summary 任务执行总结
 * @param resultFile 结果文件路径
 * @param userIds 当前配置的用户 ID 列表
 * @param dryRun 是否为 dry-run 模式
 */
export async function writeResult(
  summary: TaskSummary,
  resultFile: string,
  userIds: number[],
  dryRun = false,
): Promise<void> {
  // 读取现有文件（如果存在）
  let table: MarkdownTable = { headers: [], rows: [] }

  if (await fs.pathExists(resultFile)) {
    const content = await fs.readFile(resultFile, 'utf-8')
    table = parseMarkdownTable(content)
  }

  // 同步表头
  table = syncHeaders(table, userIds)

  // 插入新数据行
  table = insertDataRow(table, summary)

  // 生成 Markdown 内容
  const markdownContent = generateMarkdownTable(table)

  if (dryRun) {
    // dry-run 模式：只打印到控制台
    console.log('[DRY-RUN] 将要写入的 result.md 内容：')
    console.log('---')
    console.log(markdownContent)
    console.log('---')
    return
  }

  // 原子写入：先写临时文件，再替换
  const tempFile = `${resultFile}.tmp`
  await fs.writeFile(tempFile, markdownContent, 'utf-8')
  await fs.move(tempFile, resultFile, { overwrite: true })

  console.log(`✅ 结果已写入 ${resultFile}`)
}
