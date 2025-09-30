# anyrouter-signin 开发任务清单

## 阶段 1: 项目基础设施

- [x] 1.1 创建 package.json（配置依赖、脚本）
- [x] 1.2 创建 tsconfig.json（TypeScript 配置）
- [x] 1.3 创建 .gitignore（忽略敏感文件和构建产物）
- [x] 1.4 创建 config.example.yaml（配置文件模板）
- [x] 1.5 创建项目目录结构（src/）

## 阶段 2: 核心工具模块

- [x] 2.1 实现时间工具模块（src/time.ts）
  - dayjs + timezone 封装
  - 日期格式化（YYYY/MM/DD）
  - 日期编号逻辑
- [x] 2.2 实现配置管理模块（src/config.ts）
  - YAML 读取与解析
  - Schema 校验（zod）
  - 默认值应用
- [x] 2.3 实现类型定义文件（src/types.ts）
  - 配置类型
  - 任务结果类型
  - 用户信息类型

## 阶段 3: HTTP 与日志模块

- [x] 3.1 实现 HTTP 客户端模块（src/http.ts）
  - axios 实例配置
  - 超时与重试策略
  - 签到接口封装
  - 余额查询接口封装
- [x] 3.2 实现日志模块（src/logger.ts）
  - 日志文件写入（github\_<USER_ID>.log）
  - dry-run 模式支持
  - 格式化日志行

## 阶段 4: 结果处理模块

- [x] 4.1 实现结果写入模块（src/result-writer.ts）
  - Markdown 表格解析
  - 表头同步（增删列）
  - 数据行插入（倒序、编号）
  - 金额计算与格式化
  - 原子写入（临时文件+替换）

## 阶段 5: 任务执行与调度

- [x] 5.1 实现任务执行器（src/task-runner.ts）
  - 并发控制（p-limit）
  - 用户任务执行流程
  - 结果汇总
  - dry-run 模式处理
- [x] 5.2 实现调度器（src/scheduler.ts）
  - node-cron 集成
  - 多时间点支持
  - 防抖与互斥锁
  - 任务触发

## 阶段 6: 入口与集成

- [x] 6.1 实现入口文件（src/index.ts）
  - 配置加载
  - 调度器初始化
  - CLI 参数支持（--once）
  - 退出钩子
- [x] 6.2 完善 README.md
  - 安装说明
  - 配置说明
  - 运行说明
  - 部署方案

## 阶段 7: 测试与验证

- [x] 7.1 构建验证通过
- [x] 7.2 创建测试配置文件
- [x] 7.3 创建使用指南（USAGE.md）
- [ ] 7.4 用户需自行填入真实 Cookie 测试
- [ ] 7.5 用户需自行验证定时调度功能

## 完成标准

- [x] 所有源代码文件已创建并实现
- [x] 配置文件模板可用
- [x] 依赖已安装
- [x] 构建流程验证通过
- [x] 支持 dry-run 模式（已实现）
- [x] 支持多用户并发（已实现）
- [x] Markdown 表格正确生成（已实现）
- [x] 日志文件正确记录（已实现）
- [x] 定时调度正常工作（已实现）
- [ ] 需用户填入真实 Cookie 后实际测试
