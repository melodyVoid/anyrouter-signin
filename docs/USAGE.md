# 使用指南

## 快速开始

### 1. 复制配置文件

```bash
cp config.example.yaml config.yaml
```

### 2. 获取 Cookie

1. 浏览器打开 https://anyrouter.top 并登录
2. 按 F12 打开开发者工具
3. 切换到 Network（网络）标签页
4. 刷新页面，选择任意请求
5. 在请求头中找到 `Cookie` 字段
6. 复制完整的 Cookie 值

### 3. 获取 User ID

在请求头中找到 `New-Api-User` 字段的值，这就是你的 User ID。

### 4. 编辑配置文件

打开 `config.yaml`，填入你的信息：

```yaml
schedule:
  - '10:00' # 每天 10:00 执行

users:
  - userId: 你的用户ID
    cookie: '你的完整Cookie字符串'
```

### 5. 测试运行

使用 dry-run 模式测试（不会写入文件）：

```bash
# 先在 config.yaml 中设置 dryRun: true
pnpm once
```

查看控制台输出，确认签到和余额查询是否成功。

### 6. 正式运行

确认无误后，在 config.yaml 中设置 `dryRun: false`，然后：

```bash
# 单次执行
pnpm once

# 或启动定时调度
pnpm dev
```

## 多用户配置

如果要添加多个用户，直接在 `users` 数组中追加即可：

```yaml
users:
  - userId: 3542
    cookie: 'session=xxx; ...'
  - userId: 6159
    cookie: 'session=yyy; ...'
  - userId: 7890
    cookie: 'session=zzz; ...'
```

程序会自动并发执行所有用户的签到任务。

## 查看结果

### 查看余额表格

打开 `result.md`，可以看到按日期倒序排列的签到结果：

```markdown
| 日期       | github_3542 | github_6159 |
| :--------- | ----------: | ----------: |
| 2025/09/30 |    $1572.76 |     $148.00 |
| 2025/09/29 |    $1570.50 |    签到失败 |
```

### 查看详细日志

每个用户都有独立的日志文件 `github_<USER_ID>.log`：

```
2025-09-30 10:00:03	SUCCESS	message: "签到成功"
2025-09-29 10:00:05	FAIL	message: "HTTP 500: Internal Server Error"
```

## 常见问题排查

### 签到失败

1. 检查 Cookie 是否过期（重新获取）
2. 检查 User ID 是否正确
3. 检查网络连接
4. 查看日志文件中的具体错误信息

### Cookie 获取技巧

完整的 Cookie 字符串通常包含多个键值对，用分号分隔：

```
session=abcd1234; token=xyz789; other=value
```

请**完整复制**整个 Cookie 字符串，不要只复制部分。

### 同一天多次执行

如果同一天执行多次，程序会自动添加编号：

```markdown
| 2025/09/30(1) | $1573.00 | $149.00 | | 2025/09/30 | $1572.76 | $148.00 |
```

## 生产部署

### 使用 PM2

```bash
# 构建
pnpm build

# 启动
pm2 start dist/index.js --name anyrouter-signin

# 查看状态
pm2 ls

# 查看日志
pm2 logs anyrouter-signin

# 停止
pm2 stop anyrouter-signin

# 重启
pm2 restart anyrouter-signin
```

### 使用 macOS launchd

创建 `~/Library/LaunchAgents/com.anyrouter.signin.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.anyrouter.signin</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/anyrouter-signin/dist/index.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/anyrouter-signin</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/path/to/anyrouter-signin/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/path/to/anyrouter-signin/stderr.log</string>
</dict>
</plist>
```

加载服务：

```bash
launchctl load ~/Library/LaunchAgents/com.anyrouter.signin.plist
```

## 高级配置

### 自定义调度时间

可以配置多个时间点：

```yaml
schedule:
  - '10:00' # 每天 10:00
  - '22:30' # 每天 22:30
```

### 调整并发数

如果用户较多，可以调整并发数：

```yaml
concurrency: 8 # 同时处理 8 个用户
```

### 自定义结果文件

```yaml
resultFile: my-result.md # 自定义结果文件名
```

## 安全建议

1. **不要提交 config.yaml**：该文件包含敏感信息，已被 `.gitignore` 忽略
2. **定期更新 Cookie**：Cookie 可能会过期，建议定期检查和更新
3. **保护日志文件**：日志文件不包含敏感信息，但建议定期清理
4. **限制文件权限**：在 Linux/macOS 上，可以设置 `chmod 600 config.yaml`

## 故障恢复

如果 `result.md` 损坏或格式错误：

1. 备份当前文件：`cp result.md result.md.backup`
2. 删除或重命名文件：`mv result.md result.md.old`
3. 重新运行程序，会自动创建新文件

程序会尝试解析现有文件，但如果格式严重错误，建议手动修复或重新开始。
