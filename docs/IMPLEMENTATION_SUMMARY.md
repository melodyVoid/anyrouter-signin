# anyrouter-signin 实现总结

## 项目概览

已成功实现一个完整的 anyrouter-signin 定时签到程序，完全符合 `spec.md` 和 `design.md` 的要求。

## 已完成功能

### ✅ 核心功能

1. **定时调度**

   - 使用 `node-cron` 实现定时任务
   - 支持配置多个时间点（`schedule` 数组）
   - 固定使用 `Asia/Shanghai` 时区
   - 防抖机制避免任务重复执行

2. **多用户支持**

   - 支持配置多个用户
   - 使用 `p-limit` 实现并发控制（可配置并发数）
   - 每个用户独立的 Cookie 和 userId 配置

3. **签到流程**

   - POST 请求到签到接口
   - 成功后 GET 请求查询用户余额
   - 带重试机制（最多 2 次重试）
   - 超时时间 15 秒

4. **结果记录**

   - Markdown 表格格式的 `result.md`
   - 按时间倒序展示
   - 同日多次执行自动添加编号：`2025/09/30(1)`
   - 金额计算：`quota / 500000`，四舍五入到两位小数，添加 `$` 前缀
   - 失败用户显示"签到失败"

5. **表头同步**

   - 自动根据配置用户列表更新表头
   - 新增用户：表头追加新列，历史行填空
   - 删除用户：表头和历史数据同步删除该列

6. **日志记录**

   - 每个用户独立的日志文件：`github_<USER_ID>.log`
   - 记录时间戳、状态（SUCCESS/FAIL）、消息
   - 无论成功或失败都记录

7. **Dry-run 模式**

   - 执行所有网络请求和计算
   - 不写入任何文件（result.md 和日志文件）
   - 在控制台输出模拟结果

8. **失败处理**
   - 至少一个用户成功 → 写入结果
   - 全部用户失败 → 不写入 result.md
   - 单个用户失败 → 该用户列显示"签到失败"

### ✅ 技术实现

1. **配置管理**

   - YAML 格式配置文件
   - 使用 `zod` 进行 schema 校验
   - 完善的默认值支持
   - 配置文件不存在时友好的错误提示

2. **HTTP 客户端**

   - 基于 `axios`
   - 统一的请求头管理
   - 自动重试机制（2 次）
   - 超时处理（15 秒）

3. **时间处理**

   - 使用 `dayjs` + timezone 插件
   - 固定 `Asia/Shanghai` 时区
   - 日期格式化和编号逻辑

4. **文件操作**

   - 使用 `fs-extra`
   - 原子写入（临时文件 + 原子替换）
   - 追加式日志写入

5. **并发控制**

   - 使用 `p-limit`
   - 可配置并发数（默认 4）

6. **Markdown 表格**
   - 使用 `markdown-table` 生成格式化表格
   - 自定义对齐方式

## 项目结构

```
anyrouter-signin/
├── src/
│   ├── index.ts          # 入口文件，CLI 参数解析
│   ├── config.ts         # 配置管理，YAML 解析与校验
│   ├── types.ts          # TypeScript 类型定义
│   ├── time.ts           # 时间工具，日期格式化
│   ├── http.ts           # HTTP 客户端，签到和查询接口
│   ├── logger.ts         # 日志模块，文件写入
│   ├── result-writer.ts  # 结果写入，Markdown 表格生成
│   ├── task-runner.ts    # 任务执行器，并发控制
│   └── scheduler.ts      # 调度器，定时任务管理
├── config.example.yaml   # 配置文件模板
├── config.test.yaml      # 测试配置文件（已忽略）
├── package.json          # 依赖和脚本
├── tsconfig.json         # TypeScript 配置
├── .gitignore           # Git 忽略规则
├── README.md            # 项目说明文档
├── USAGE.md             # 详细使用指南
├── tasks.md             # 开发任务清单
├── spec.md              # 需求规范
└── design.md            # 技术方案

dist/                    # 构建产物目录
├── index.js
└── index.d.ts

result.md                # 签到结果表格（运行后生成）
github_*.log             # 用户日志文件（运行后生成）
```

## 使用方法

### 开发模式

```bash
# 安装依赖
ni

# 单次执行（测试）
pnpm once

# 常驻调度模式
pnpm dev
```

### 生产部署

```bash
# 构建
pnpm build

# 使用 PM2 守护进程
pm2 start dist/index.js --name anyrouter-signin

# 查看日志
pm2 logs anyrouter-signin
```

### CLI 参数

- `--once`：单次执行模式，执行后立即退出
- `--config=<path>`：指定配置文件路径（默认 `config.yaml`）

## 配置说明

### 必填项

- `schedule`：定时执行时间点列表
- `users`：用户列表（userId + cookie）

### 可选项（有默认值）

- `signInAPI`：签到接口 URL
- `userInfoAPI`：用户信息接口 URL
- `referer`：Referer 请求头
- `userAgent`：User-Agent 请求头
- `concurrency`：并发数（默认 4）
- `resultFile`：结果文件路径（默认 `result.md`）
- `dryRun`：Dry-run 模式（默认 `false`）

## 技术栈

- **运行时**：Node.js ≥ 18
- **语言**：TypeScript 5.7
- **HTTP**：axios
- **调度**：node-cron
- **配置**：js-yaml + zod
- **时间**：dayjs
- **文件**：fs-extra
- **并发**：p-limit
- **表格**：markdown-table
- **开发工具**：tsx, tsup

## 验收清单对照

根据 `spec.md` 第 13 节的验收清单：

1. ✅ 常驻运行，按 `schedule` 在 `Asia/Shanghai` 执行
2. ✅ 调用签到接口完成签到
3. ✅ 鉴权信息可配置，支持多用户；`cookie` 来自 `config.yaml`
4. ✅ `message` 分用户写入 `github_<USER_ID>.log`
5. ✅ 表头第一列为"日期"，格式 `YYYY/MM/DD`
6. ✅ 第二列起为 `github_<USER_ID>`，金额计算正确，固定 `$` 前缀
7. ✅ 列数=1+用户数，新增/删除用户自动增删列
8. ✅ 文件不存在则创建；存在则按时间倒序插入；同日追加 `(n)`
9. ✅ 有用户成功即写入；失败用户列填"签到失败"；全部失败不写入
10. ✅ `User-Agent` 可配置；未配置使用默认 UA
11. ✅ 支持 `dry-run`（不写入任何文件）
12. ✅ 使用 `config.yaml`；移除不需要的配置；可缺省项有默认值

**所有验收项均已完成！✅**

## 下一步

用户需要：

1. 复制 `config.example.yaml` 为 `config.yaml`
2. 填入真实的 `userId` 和 `cookie`
3. 运行 `pnpm once` 测试（建议先开启 `dryRun: true`）
4. 确认无误后关闭 dry-run 正式运行
5. 部署到生产环境（使用 PM2 或 launchd）

## 注意事项

1. **敏感信息**：`config.yaml` 已加入 `.gitignore`，不会被提交
2. **Cookie 过期**：需要定期检查和更新 Cookie
3. **网络问题**：如遇失败，查看日志文件排查
4. **时区**：程序固定使用 `Asia/Shanghai` 时区，无需配置

## 文档

- `README.md`：项目概览和快速开始
- `USAGE.md`：详细使用指南和常见问题
- `spec.md`：需求规范文档
- `design.md`：技术设计文档
- `tasks.md`：开发任务清单

---

**实现完成时间**：2025-09-30 **实现状态**：所有功能已完成，等待用户测试 ✨
