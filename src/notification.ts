/**
 * 通知模块
 */

import axios from 'axios'
import { markdownTable } from 'markdown-table'
import { formatDate } from './time.js'
import type { NotificationConfig, TaskResult } from './types.js'

/**
 * 获取访问令牌
 */
async function getToken(appkey: string, appsecret: string): Promise<string> {
  const url = `https://yach-oapi.zhiyinlou.com/gettoken?appkey=${appkey}&appsecret=${appsecret}`
  const response = await axios.get(url)
  return response.data.obj.access_token
}

/**
 * 计算金额
 */
function calculateAmount(quota: number): string {
  const amount = Math.round((quota / 500000) * 100) / 100
  return `$${amount.toFixed(2)}`
}

/**
 * 生成签到结果表格
 */
function generateResultTable(results: TaskResult[]): string {
  const headers = ['用户 ID', '用户名', '状态', '余额']
  const rows = results.map(result => {
    const userId = result.userId.toString()
    const userName = result.userName
    const status = result.success ? '✅ 成功' : '❌ 失败'
    const amount =
      result.success && result.amount !== undefined ? calculateAmount(result.amount) : '-'
    return [userId, userName, status, amount]
  })

  return markdownTable([headers, ...rows], { align: ['c', 'c', 'c', 'r'] })
}

/**
 * 发送通知消息
 */
export async function sendNotification(
  results: TaskResult[],
  config: NotificationConfig,
  dryRun = false,
): Promise<void> {
  try {
    const date = formatDate()
    const table = generateResultTable(results)

    const markdownText = `## AnyRouter 签到结果\n\n**日期**: ${date}\n\n${table}`

    if (dryRun) {
      console.log('[DRY-RUN] 将要发送的通知内容：')
      console.log('---')
      console.log(markdownText)
      console.log('---')
      return
    }

    console.log('📤 正在发送通知...')

    // 获取 token
    const token = await getToken(config.appkey, config.appsecret)

    // 发送消息
    const response = await axios.post(
      // 'https://yach-oapi.zhiyinlou.com/v1/single/message/send', // 单人通知
      'https://yach-oapi.zhiyinlou.com/group/robot/message/send', // 群通知
      new URLSearchParams({
        access_token: token,
        // to_work_code: config.toWorkCode,
        group_id: config.groupId,
        message: JSON.stringify({
          msgtype: 'markdown',
          markdown: {
            title: 'AnyRouter 签到结果',
            text: markdownText,
          },
          at: {
            isAtAll: false,
          },
        }),
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    )

    if (response.data && response.data.code === 200) {
      console.log('✅ 通知发送成功')
    } else {
      const errorMsg = response.data?.msg || '未知错误'
      console.error(`❌ 通知发送失败: ${errorMsg}`)
      throw new Error(`通知发送失败: ${errorMsg}`)
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ 通知发送失败:', error.message)
    } else {
      console.error('❌ 通知发送失败:', error)
    }
    throw error
  }
}
