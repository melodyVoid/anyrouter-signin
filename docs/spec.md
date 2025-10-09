## anyrouter-signin 签到定时程序规范（spec）

### 1. 目标与范围

- **目标**：在本地电脑常驻运行，按每日固定时间（默认 10:00，可配置）为多个用户执行签到；签到成功后记录结果到 `result.md`，并为每个用户计算余额展示表格。
- **范围**：
  - 定时调度执行签到与余额查询
  - 多用户同时请求与配置管理
  - 结果落盘为 Markdown 表格，按日期倒序展示
  - 仅当全部用户失败时不写入；若有用户成功则写入，失败用户金额填“签到失败”

### 2. 关键术语

- **USER_ID**：即接口头 `New-Api-User` 的取值，例如 3542。
- **Cookie**：包含会话等鉴权信息的整段 `Cookie` 请求头字符串（例如包含 `session=...`），每个用户可不同。
- **签到接口（sign_in）**：`POST https://anyrouter.top/api/user/sign_in`。
- **余额接口（self）**：`GET https://anyrouter.top/api/user/self`。

### 3. 接口契约（最小集）

- 共用必备请求头：
  - `Content-Type: application/json`
  - `Referer: https://anyrouter.top/console/topup`
  - `User-Agent: <可配置>`
  - `Cookie: <可配置，整段字符串>`
  - `New-Api-User: <USER_ID>`
- 签到接口：`POST /api/user/sign_in`，无请求体。期望 2xx；响应 JSON 至少包含 `message` 字段。
- 查询接口：`GET /api/user/self`，期望 2xx；响应 JSON 至少包含 `quota` 数值字段。

### 4. 配置设计

- 配置文件固定为：`config.yaml`（YAML）。示例：

```yaml
# config.yaml
schedule:
  - '10:00' # 每天的 10:00 执行
  # - "22:30"       # 可配置多个时间点

signInAPI: https://anyrouter.top/api/user/sign_in # 可省略，默认值同此
userInfoAPI: https://anyrouter.top/api/user/self # 可省略，默认值同此
referer: https://anyrouter.top/console/topup # 可省略，默认值同此
userAgent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 # 可省略，默认值同此

concurrency: 4 # 可省略，默认 4
resultFile: result.md # 可省略，默认 result.md
dryRun: false # 可省略，默认 false（落盘）

users: # 必填，多用户支持
  - userId: 3542
    cookie: 'session=...; ...'
  - userId: 6159
    cookie: 'session=...; ...'
```

说明：

- 时区固定为 `Asia/Shanghai`，无需配置。
- 去掉 `cron` 配置，改用 `schedule`，支持配置多个时间点，到点即执行任务。
- 字段重命名与默认值：
  - `signInUrl` → `signInAPI`（可省略，默认 `https://anyrouter.top/api/user/sign_in`）
  - `selfUrl` → `userInfoAPI`（可省略，默认 `https://anyrouter.top/api/user/self`）
  - `referer`、`userAgent` 可省略，均有默认值（见示例）。
- `users` 为必填；每个用户需提供 `userId` 与整段 `cookie`。
- 删除 `http`、`currencySymbol`、`onFailure` 等配置项：HTTP 超时与重试在代码中约定；金额符号固定 `$`。
- `cookie` 已在 `config.yaml` 中配置，无需 `.env`。

### 5. 执行流程

1. 定时触发（按 `schedule` 列表的多个时间点）。
2. 并发（上限 `concurrency`）对每个用户执行：
   - `POST sign_in`：使用该用户对应的 `New-Api-User` 与 `Cookie`；记录响应 `message`。
   - 若签到成功，再 `GET self`：读取 `quota`。
3. 若至少一名用户成功（签到+查询），本次任务判为成功；若全部用户失败，判为失败。
4. 成功时按照“写入规则”写入/更新 `result.md`；全部失败时不写入（可记录日志）。

### 6. 计算与格式规则

- 金额计算：`amount = 四舍五入( quota / 500000 , 2)`；四舍五入采用标准“half-up”。
- 列命名：
  - 第 1 列表头固定为 `日期`，值为当天（按 `timezone`）日期，格式 `YYYY/MM/DD`；若当日重复写入，追加顺序编号 `(n)`，例如 `2025/09/29(1)`。
  - 其后各列按配置用户顺序生成，表头为 `github_<USER_ID>`（例如 `github_3542`）。
- 金额展示：固定以 `$` 前缀，如 `$1572.76`。
- 表格顺序：按时间倒序（最新在上）。当存在同一“基础日期”的多条（如 `2025/09/29` 与 `2025/09/29(1)`），新写入的放在该日期分组顶部，并将编号设为“已有相同基础日期行数 + 1”。

### 7. 写入 `result.md` 的规则

- 若文件不存在：
  - 创建文件，并写入表头与当日数据。
- 若文件已存在：
  - 表头规则：第一列为 `日期`；其余列准确等于当前配置的用户集合（按配置顺序）。若历史表头与当前配置不一致：
    - 若新增用户：在表头末尾追加新列；历史行该列留空。
    - 若移除用户：表头移除相应列；历史数据该列一起移除。
  - 数据写入：
    - 计算“基础日期”`YYYY/MM/DD`；若当天基础日期不存在，直接插入一行到最顶部；
    - 若已存在同日数据，新增一行到该日期分组顶部，并在日期后追加顺序编号 `(n)`；
    - 各用户金额按其列位填充；失败用户该列填入 `签到失败`；不存在的列置空。
- 原子性：建议采用“读-改-写到临时文件-原子替换”的方式，避免并发/中断导致损坏。

### 8. 成功/失败判定与重试

- 单用户成功标准：
  - 签到 HTTP 状态 2xx 且响应可解析；记录 `message`（用于日志）。
  - 查询 HTTP 状态 2xx 且响应包含数值 `quota`。
- 任务成功标准：至少 1 名用户成功即判为成功；全部失败则判为失败（本次不写入）。
- 重试与超时：在代码层统一约定（不从配置读取）。
- dry-run：当 `dryRun=true` 时，执行网络请求与计算，但不对任何文件（含 `result.md` 与日志）进行写入；只在控制台输出即将写入的内容。

### 9. 日志与 message 的保存

- 为每个用户单独保存日志文件：`github_<USER_ID>.log`（例如：`github_3542.log`）。
- 每次任务对每位用户追加一行，格式建议：

```text
2025-09-29 10:00:03	SUCCESS	message: "<原样记录>"
2025-09-29 10:00:03	FAIL	message: "<错误或返回信息>"
```

- 无论整体任务成功或失败，都会记录每个用户的本次执行结果；若 `dryRun=true`，则不写日志文件，只打印到控制台。

### 10. 安全与隐私

- `Cookie`、`session` 等敏感信息不得入库或提交到公共仓库。
- `cookie` 已配置在 `config.yaml` 中，无需 `.env`。请确保 `config.yaml` 被 `.gitignore` 忽略（可提供 `config.example.yaml` 模板）。
- 日志中不得记录 Cookie 等敏感头；仅记录时间、状态与 `message`。

### 11. 建议实现栈（Node.js + TypeScript）

- 语言/运行时：Node.js ≥ 18，TypeScript。
- 依赖：
  - HTTP 客户端：`axios`
  - YAML 解析：`yaml`（或 `js-yaml`）
  - 文件：`fs-extra`
  - 时间：`dayjs` + `dayjs/plugin/utc` + `dayjs/plugin/timezone`（固定 `Asia/Shanghai`）
  - 调度：实现基于 `setInterval` 的整分检查触发器，匹配 `schedule` 列表的 HH:mm；或等价轻量库
- 安装：使用 `ni` 安装依赖。
- 常驻：可使用 `pm2` 守护或系统计划任务（macOS `launchd`）。
- 不使用 `dotenv`（无需读取 `.env`）。

### 12. 示例

- 表头（2 用户：3542、6159）：

```markdown
| 日期       | github_3542 | github_6159 |
| ---------- | ----------- | ----------- |
| 2025/09/29 | $1572.76    | 签到失败    |
```

- 重复当日示例（第二条）：

```markdown
| 2025/09/29(1) | $1570.76 | $148.00 |
```

### 13. 验收清单

1. 常驻运行，按 `schedule`（支持多个时间）在 `Asia/Shanghai` 执行
2. 调用 `signin.rest` 所述接口完成签到
3. 鉴权信息可配置，支持多用户；`users` 为必填；`cookie` 来自 `config.yaml`
4. `message` 分用户写入 `github_<USER_ID>.log`（失败/成功均记录；dry-run 不落盘）
5. 表头第一列为“日期”，格式 `YYYY/MM/DD`
6. 第二列起为 `github_<USER_ID>`，金额=四舍五入(quota/500000,2)，固定 `$` 前缀
7. 列数=1+用户数，顺序与配置一致；新增/删除用户自动增删列
8. 文件不存在则创建并写入当日数据；存在则按时间倒序插入；同日追加 `(n)`
9. 只要有用户成功即写入；失败用户列填“签到失败”；全部失败不写入
10. `User-Agent` 可配置；未配置使用默认 UA
11. 支持 `dry-run`（不写入任何文件）
12. 使用 `config.yaml`；移除 `http`、`currencySymbol`、`onFailure` 配置；`signInAPI`/`userInfoAPI`、`referer`、`concurrency`、`resultFile` 可缺省

### 14. 已确认与约束

- 部分成功即写入；失败用户列为“签到失败”；全部失败不写入。
- `message` 保存到 `github_<USER_ID>.log`，每次追加一行。
- 新增/删除用户自动增删列并对历史行补空/删列。
- 金额始终包含 `$` 前缀。
- 提供 `dry-run` 模式（不落盘）。
