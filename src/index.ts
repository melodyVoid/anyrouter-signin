/**
 * 入口文件
 */

import { loadConfig } from './config.js'
import { runTask } from './task-runner.js'

/**
 * 主函数
 */
async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2)
    const configPath = args.find(arg => arg.startsWith('--config='))?.split('=')[1]

    // 加载配置
    console.log('📝 加载配置文件...')
    const config = await loadConfig(configPath)
    console.log('✅ 配置加载成功\n')

    if (config.dryRun) {
      console.log('🔍 DRY-RUN 模式已启用，不会写入任何文件\n')
    }

    // 执行签到任务
    await runTask(config)
    process.exit(0)
  } catch (error) {
    console.error('❌ 程序启动失败:', error)
    process.exit(1)
  }
}

// 启动程序
main()
