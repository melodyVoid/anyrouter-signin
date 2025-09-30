/**
 * 入口文件
 */

import { loadConfig } from './config.js'
import { startScheduler, stopScheduler } from './scheduler.js'
import { runTask } from './task-runner.js'

/**
 * 主函数
 */
async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2)
    const isOnceMode = args.includes('--once')
    const configPath = args.find(arg => arg.startsWith('--config='))?.split('=')[1]

    // 加载配置
    console.log('📝 加载配置文件...')
    const config = await loadConfig(configPath)
    console.log('✅ 配置加载成功\n')

    if (config.dryRun) {
      console.log('🔍 DRY-RUN 模式已启用，不会写入任何文件\n')
    }

    if (isOnceMode) {
      // 单次执行模式
      console.log('🎯 单次执行模式\n')
      await runTask(config)
      process.exit(0)
    } else {
      // 常驻调度模式
      startScheduler(config)

      // 注册退出钩子
      process.on('SIGINT', () => {
        console.log('\n\n⏸️  收到退出信号，正在关闭...')
        stopScheduler()
        process.exit(0)
      })

      process.on('SIGTERM', () => {
        console.log('\n\n⏸️  收到退出信号，正在关闭...')
        stopScheduler()
        process.exit(0)
      })

      // 保持进程运行
      console.log('💤 程序运行中，按 Ctrl+C 退出...\n')
    }
  } catch (error) {
    console.error('❌ 程序启动失败:', error)
    process.exit(1)
  }
}

// 启动程序
main()
