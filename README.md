# anyrouter-signin

一个基于 Node.js + TypeScript 的定时签到程序，支持多用户并发执行签到任务。

## 功能特性

- ⏰ **定时调度**：支持配置多个时间点，按 `Asia/Shanghai` 时区定时执行
- 👥 **多用户支持**：并发执行多个用户的签到任务
- 📊 **结果记录**：自动更新 Markdown 表格，按时间倒序展示签到结果
- 📝 **独立日志**：每个用户单独记录日志到 `github_<USER_ID>.log`
- 🔍 **Dry-run 模式**：测试模式，不写入任何文件
- 🛡️ **安全配置**：敏感信息配置在 `config.yaml`，自动忽略提交
- 🔐 **ACW 验证**：自动处理阿里云 WAF 反爬虫验证，无需人工干预

## 快速开始

### 1. 安装依赖

```bash
ni
```

### 2. 配置文件

复制配置文件模板并填入真实信息：

```bash
cp config.example.yaml config.yaml
```

编辑 `config.yaml`，填入你的用户信息：

```yaml
schedule:
  - '10:00' # 每天 10:00 执行

users:
  - userId: 3542
    cookie: 'session=your_session_here; ...'
  - userId: 6159
    cookie: 'session=another_session_here; ...'
```

### 3. 运行程序

#### 开发模式（单次执行）

```bash
pnpm once
# 或
tsx src/index.ts --once
```

#### 开发模式（常驻调度）

```bash
pnpm dev
# 或
tsx src/index.ts
```

#### 生产部署

```bash
# 构建
pnpm build

# 使用 pm2 守护进程
pm2 start dist/index.js --name anyrouter-signin

# 查看日志
pm2 logs anyrouter-signin

# 停止进程
pm2 stop anyrouter-signin
```

## 配置说明

### 必填项

- `schedule`：定时执行的时间点列表，格式为 `HH:mm`（24 小时制）
- `users`：用户列表，每个用户需要提供 `userId` 和 `cookie`

### 可选项（均有默认值）

- `signInAPI`：签到接口 URL（默认：`https://anyrouter.top/api/user/sign_in`）
- `userInfoAPI`：用户信息接口 URL（默认：`https://anyrouter.top/api/user/self`）
- `referer`：Referer 请求头（默认：`https://anyrouter.top/console/topup`）
- `userAgent`：User-Agent 请求头（默认：Chrome UA）
- `concurrency`：并发执行的用户数量（默认：`4`）
- `resultFile`：结果文件路径（默认：`result.md`）
- `dryRun`：Dry-run 模式开关（默认：`false`）

## 文件说明

### 输出文件

- `result.md`：签到结果表格，按时间倒序记录每次签到的余额
- `github_<USER_ID>.log`：每个用户的独立日志文件

### 示例：result.md

```markdown
| 日期       | github_3542 | github_6159 |
| :--------- | ----------: | ----------: |
| 2025/09/29 |    $1572.76 |     $148.00 |
| 2025/09/28 |    $1570.50 |    签到失败 |
```

### 示例：github_3542.log

```
2025-09-29 10:00:03	SUCCESS	message: "签到成功"
2025-09-28 10:00:05	FAIL	message: "HTTP 500: Internal Server Error"
```

## 获取 Cookie

1. 浏览器打开 `https://anyrouter.top`
2. 登录你的账号
3. 打开开发者工具（F12） → Network 标签页
4. 刷新页面，找到任意请求
5. 查看请求头中的 `Cookie` 字段，复制完整内容
6. 在 `config.yaml` 中填入该 Cookie

## 命令行参数

- `--once`：单次执行模式，执行一次任务后退出
- `--config=<path>`：指定配置文件路径（默认：`config.yaml`）

示例：

```bash
# 使用自定义配置文件单次执行
tsx src/index.ts --once --config=custom-config.yaml
```

## Dry-run 模式

在配置文件中设置 `dryRun: true`，程序会执行所有网络请求和计算，但不会写入任何文件（包括 `result.md` 和日志文件），只在控制台输出结果。

适用场景：

- 测试配置是否正确
- 验证签到流程
- 检查网络连接

## 技术栈

- **运行时**：Node.js ≥ 18
- **语言**：TypeScript
- **HTTP 客户端**：axios（带重试机制）
- **定时调度**：node-cron
- **配置解析**：js-yaml + zod
- **时间处理**：dayjs（Asia/Shanghai 时区）
- **文件操作**：fs-extra
- **并发控制**：p-limit
- **表格生成**：markdown-table

## 开发

### 项目结构

```
.
├── src/
│   ├── index.ts          # 入口文件
│   ├── config.ts         # 配置管理
│   ├── types.ts          # 类型定义
│   ├── time.ts           # 时间工具
│   ├── http.ts           # HTTP 客户端
│   ├── acw.ts            # ACW 验证算法
│   ├── logger.ts         # 日志模块
│   ├── result-writer.ts  # 结果写入
│   ├── task-runner.ts    # 任务执行器
│   └── scheduler.ts      # 调度器
├── config.example.yaml   # 配置文件模板
├── ACW_SOLUTION.md       # ACW 验证详细说明
├── package.json
└── tsconfig.json
```

### 开发工具

- `tsx`：直接运行 TypeScript 源码
- `tsup`：构建并打包
- `ni`：快速安装依赖

## 注意事项

1. **敏感信息**：请确保 `config.yaml` 已加入 `.gitignore`，不要将 Cookie 等敏感信息提交到代码仓库
2. **时区**：程序固定使用 `Asia/Shanghai` 时区，无需配置
3. **失败处理**：只要有一个用户签到成功，就会写入结果文件；全部失败时不写入
4. **日志记录**：无论成功或失败，都会为每个用户记录日志
5. **并发控制**：可通过 `concurrency` 参数控制并发数，避免触发接口限流

## 常见问题

### Q: 如何查看当前是否正在运行？

```bash
pm2 ls
```

### Q: 如何重启程序？

```bash
pm2 restart anyrouter-signin
```

### Q: 如何查看实时日志？

```bash
pm2 logs anyrouter-signin
```

### Q: 签到失败怎么办？

1. 检查 `github_<USER_ID>.log` 查看具体错误信息
2. 确认 Cookie 是否过期（重新获取）
3. 确认网络连接是否正常
4. 使用 `--once` 参数手动执行一次进行调试

### Q: 什么是 ACW 验证？

ACW (Alibaba Cloud WAF) 是阿里云的反爬虫验证机制。当服务器检测到可能的自动化请求时，会返回一个包含 JavaScript 代码的验证页面。

本程序已内置 ACW 验证处理，当检测到验证请求时会：

1. 自动提取验证参数
2. 计算 `acw_sc__v2` cookie 值
3. 更新请求 Cookie
4. 自动重试请求

整个过程无需人工干预，你会在日志中看到类似以下信息：

```
🔐 检测到 ACW 验证挑战，正在计算 acw_sc__v2...
📝 提取到 arg1: [40位十六进制字符串]
✅ 计算得到 acw_sc__v2: [计算结果]
🔄 已更新 Cookie，准备重试请求...
```

详细说明请查看 [ACW_SOLUTION.md](./ACW_SOLUTION.md)

## License

MIT
