## anyrouter-signin 技术方案（design）

### 1. 背景与目标

- 基于 `spec.md` 定义，实现一个 Node.js + TypeScript 的常驻程序，按 `config.yaml` 中配置的多个时间点定时执行签到任务。
- 支持多用户，并发调用 `signInAPI`、`userInfoAPI`，成功后更新 `result.md` 表格与 `github_<USER_ID>.log` 日志；若全部用户失败则不落盘。
- 提供 `dry-run` 模式以验证流程；默认在 `Asia/Shanghai` 时区运行。

### 2. 系统总体架构

- **入口 (`src/index.ts`)**：解析配置、初始化调度器、注册退出钩子。
- **配置模块 (`src/config.ts`)**：读取 `config.yaml`，应用默认值并做 schema 校验，生成强类型配置对象。
- **调度器 (`src/scheduler.ts`)**：基于 `node-cron` 为每个 HH:mm 时间点注册独立任务，触发后委派 `task-runner` 执行；支持在配置热更新/重启时重新注册。
- **任务执行器 (`src/task-runner.ts`)**：接受配置，协调并发执行用户签到、请求余额、汇总结果与写文件。
- **HTTP 客户端 (`src/http.ts`)**：封装 axios 实例，统一默认请求头、超时、重试策略。
- **结果写入模块 (`src/result-writer.ts`)**：读取/生成 Markdown 表格，按时间倒序写入数据行，并处理“签到失败”、日期编号与列同步。
- **日志模块 (`src/logger.ts`)**：负责将每个用户的 message 追加写入独立日志文件，并在 `dry-run` 模式下改为控制台输出。
- **时间工具 (`src/time.ts`)**：封装 dayjs 时区、日期格式化、编号递增逻辑。

### 3. 配置管理

- 文件路径：`config.yaml`（与程序同目录或 CLI 参数指定）。
- Schema 关键字段：
  - `schedule: string[]`（必填，格式 `HH:mm`，采用 24 小时制）。
  - `users: { userId: number; cookie: string; }[]`（必填，至少 1 条）。
  - 可选字段：`signInAPI`、`userInfoAPI`、`referer`、`userAgent`、`concurrency`、`resultFile`、`dryRun`。
- 默认值：
  - `signInAPI = https://anyrouter.top/api/user/sign_in`
  - `userInfoAPI = https://anyrouter.top/api/user/self`
  - `referer = https://anyrouter.top/console/topup`
  - `userAgent = Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36`
  - `concurrency = 4`
  - `resultFile = result.md`
  - `dryRun = false`
- 校验策略：使用 `zod` 或自定义校验确保必填字段存在、时间格式正确、`userId` 为正整数、`cookie` 非空。
- `config.example.yaml` 将提供示例，真实 `config.yaml` 加入 `.gitignore`。

### 4. 调度与时间管理

- 时区固定 `Asia/Shanghai`：通过 `dayjs.tz` 格式化当前时间。
- `node-cron` 使用方案：
  1. 启动时遍历 `schedule` 列表，将每个 `HH:mm` 转换为 cron 表达式 `0 mm HH * * *`（秒位固定为 0，按日重复）。
  2. 对每个表达式注册 `cron.schedule` 任务；任务触发后调用 `task-runner`。
  3. 若需要重新加载配置，先停止旧的 job，再按新 `schedule` 重新注册。
- 防抖策略：对每次 job 调度设置互斥锁，避免任务执行超过 1 分钟时被下一次同一时刻重复触发。
- 可扩展：保留 CLI `--once` 参数直接运行一次任务（不注册 cron），便于调试。

### 5. HTTP 客户端与重试策略

- axios 实例：
  - 默认头：`Content-Type: application/json`、`Referer`、`User-Agent`、`Cookie`、`New-Api-User`。
  - 超时：15000ms。
  - 重试：失败或网络错误时最多重试 2 次，退避策略固定 2000ms；使用手写 Promise 包装。
- 请求流程：
  - **签到**：`POST signInAPI`，无 body。若非 2xx 或无 `message` 字段 → 视为失败。
  - **查询**：`GET userInfoAPI`，成功需有数值 `quota`。
- 失败处理：区分“请求错误”、“响应缺字段”等原因；返回结构包含 `success`, `message`, `quota?`, `error?`。

### 6. 任务执行流程

1. 按配置并发度将用户数组分批执行（使用 `p-limit` 或自实现的并发控制）。
2. 对每个用户：
   - 调用签到接口，记录结果。
   - 成功后调用 userInfo 接口获取 quota。
   - 生成 `TaskResult`：包括用户列名、签到成功标记、金额（成功时 `quota/500000` 四舍五入两位；失败时标记 `签到失败`）、日志内容。
3. 汇总所有结果：
   - 判断是否全部失败：若是 → 记录日志后退出（dry-run 下仅打印）。
   - 否则进入写文件流程。
4. dry-run：
   - 请求仍会发送；输出计划写入的表头、行数据、日志行，但不修改任何文件。
5. 错误传播：调度器捕获异常，写入标准错误日志并继续调度下一次。

### 7. Markdown 表格写入策略

- 读取阶段：
  - 若 `resultFile` 不存在 → 初始化表头。
  - 若存在：解析 Markdown 表格，可采用简单分割（按 `\n`、管道符）或使用 `markdown-table` 生成/格式化。
- 表头同步：
  - 生成目标表头 `["日期", ...users.map(u => \`github\_${u.userId}\`)]`。
  - 若历史表头缺列 → 追加并在历史行填空字符串。
  - 若历史表头多列 → 移除并同步删除历史数据列。
- 数据插入：
  - 构造当日基础日期 `YYYY/MM/DD`。
  - 查找现有行中基础日期相同的数量 `n`，新行日期为 `date` 或 `date(n)`。
  - 行内容：对成功用户填 `$${amount}`（例如 `$1572.76`），失败用户填 `签到失败`，缺列填空。
  - 将新行插入表格顶部或同日期分组顶部（保持倒序）。
- 写入：
  - 先在内存生成 Markdown 字符串（使用 `markdown-table` 确保对齐）。
  - 写入临时文件（如 `result.md.tmp`），再原子替换。

### 8. 日志文件设计

- 每个用户一个日志文件：`github_<USER_ID>.log`。
- 追加行格式：`<ISO8601> <SUCCESS|FAIL> message: "..."`。
- 成功 case 记录签到返回 `message` 与金额；失败 case 记录失败原因（HTTP 状态、错误码或异常消息）。
- dry-run 模式：不写日志文件，改为在控制台打印模拟日志行。
- 可选：未来支持日志轮转或大小限制。

### 9. 错误处理与告警

- 对于配置错误（schema 校验失败） → 启动即抛出并退出。
- HTTP 请求异常带上上下文字段（userId、API、重试次数）。
- 写文件异常：抛出并记录，同时保留原文件。
- 任务层面捕获所有错误并输出到 console，同时继续后续调度。
- 可扩展：预留钩子上报（如 webhook）。

### 10. 依赖与工具链

- `axios`：HTTP 客户端。
- `yaml` 或 `js-yaml`：读取 `config.yaml`。
- `dayjs` + `timezone` 插件：时间处理。
- `node-cron`：注册定时任务。
- `fs-extra`：文件操作（确保原子写、创建目录）。
- `p-limit`：并发控制（也可自实现）。
- `zod`（可选）：配置校验。
- `markdown-table`（可选）：表格生成。
- 开发运行：使用 `tsx` 直接执行 TypeScript 源码（如 `tsx src/index.ts`，参考 tsx 文档）。
- 构建产物：使用 `tsup` 打包并生成声明文件（例如 `tsup src/index.ts --format esm --dts --clean`）。
- 安装工具：遵循要求使用 `ni`。

### 11. 开发与测试计划

- **单元测试**：
  - 配置解析、默认值合并。
  - 日期编号逻辑（含 `(n)` 追加）。
  - 表头增删列与历史数据对齐。
  - 金额计算与失败填充。
- **集成测试**：
  - 使用 mock server（如 `msw` 或自写 Express）模拟 API 成功/失败。
  - 验证 dry-run 不落盘。
  - 并发执行下的正确性。
- **手动验证**：
  - `tsx src/index.ts --once` 立即执行一次。
  - 检查 `result.md`、`github_<USER_ID>.log` 输出。
- **构建验证**：
  - 执行 `tsup` 构建产物并在 `dist/` 目录通过 Node 运行，确保生产流程正常。

### 12. 运行与运维

- 启动命令：`ni && pnpm dev`（示例，`dev` 脚本使用 `tsx src/index.ts` 直接运行源文件）。
- 构建发布：`pnpm build`（调用 `tsup`，产物输出至 `dist/`），上线时以 `node dist/index.js` 运行。
- 常驻方案：`pm2 start dist/index.js --name anyrouter-signin` 或 macOS `launchd`。
  - `--name anyrouter-signin` 用于给该进程自定义名称，便于在 `pm2 ls`、日志/监控中识别。
- 日志与结果文件应放在项目根目录，确保有写权限。
- `config.yaml` 维护在同目录，变更后需重启或实现热加载（可选后续需求）。

### 13. 风险与后续优化

- API 限频：需要关注多用户并发请求是否触发限流；必要时增加 jitter 或串行化。
- Markdown 解析鲁棒性：现阶段采用结构化生成，若文件被手工修改可能导致解析异常，需要容错处理。
- 时间调度精度：`node-cron` 在极端情况下仍可能受 Node 事件循环阻塞影响；必要时可结合 `cron-parser` 或外部调度器提升可靠性。
- 日志文件体积：长期运行可能较大，可后续增加按月切换或大小限制。
- 配置热更新、Web 控制台等功能可未来扩展。
