# 迁移说明：从本地文件到通知推送

## 📋 改动概述

已成功将签到结果从写入本地 `result.md` 文件改为通过通知接口发送。

## ✅ 完成的改动

### 1. 代码改动

#### 新增文件

- ✅ `src/notification.ts` - 通知发送模块

#### 修改的文件

**`src/types.ts`**

- 新增 `NotificationConfig` 接口
- 在 `Config` 接口中添加 `notification` 字段
- 移除 `resultFile` 字段

**`src/config.ts`**

- 新增 `NotificationConfigSchema` 验证规则
- 在 `ConfigSchema` 中添加 `notification` 验证
- 移除 `resultFile` 相关配置

**`src/task-runner.ts`**

- 移除 `writeResult` 调用
- 改为调用 `sendNotification`
- 添加通知发送失败的错误处理

**配置文件**

- `config.yaml` - 添加 `notification` 配置
- `config.example.yaml` - 更新示例配置
- `config.test.yaml` - 添加测试通知配置

#### 删除的文件

- ❌ `src/result-writer.ts` - 结果写入模块（不再需要）

### 2. GitHub Actions 改动

**`.github/workflows/signin.yml`**

- 移除了提交 `result.md` 的步骤
- 移除了推送更改的步骤
- 添加了通知配置相关的 Secrets

需要添加的新 Secrets：

- `NOTIFICATION_APPKEY` - 通知服务的 appkey
- `NOTIFICATION_APPSECRET` - 通知服务的 appsecret
- `NOTIFICATION_TO_WORK_CODE` - 接收通知的用户工作码

### 3. 文档更新

**`GITHUB_ACTIONS_SETUP.md`**

- 更新 Secrets 配置说明
- 添加通知配置获取方法
- 更新查看结果的说明
- 添加通知发送失败的故障排查

## 🔄 功能对比

### 之前（写入本地文件）

```yaml
# 配置文件
resultFile: result.md

users:
  - userId: 3542
    cookie: '...'
```

执行流程：

1. 签到
2. 查询余额
3. 写入 `result.md` 文件
4. 提交到 Git 仓库
5. 推送到远程仓库

### 现在（通知推送）

```yaml
# 配置文件
notification:
  appkey: 'your_appkey'
  appsecret: 'your_appsecret'
  toWorkCode: 'your_work_code'

users:
  - userId: 3542
    cookie: '...'
```

执行流程：

1. 签到
2. 查询余额
3. 生成结果表格
4. 通过通知接口发送
5. 任务完成

## 🎯 优势

1. **实时通知** - 签到结果即时推送，无需查看仓库
2. **简化流程** - 不再需要 Git 提交和推送
3. **减少开销** - 不占用仓库空间和提交历史
4. **更好的体验** - 通过聊天工具直接接收通知
5. **失败容错** - 即使通知失败，签到仍然正常完成

## 📊 通知格式

通知以 Markdown 格式发送，包含：

```markdown
# AnyRouter 签到结果

**日期**: 2025/10/09

| 用户 ID | 状态    | 余额     |
| ------- | ------- | -------- |
| 3542    | ✅ 成功 | $1797.63 |
| 6159    | ✅ 成功 | $375.00  |
```

## 🔧 配置迁移

如果你正在使用旧版本，需要进行以下迁移：

### 1. 更新配置文件

在 `config.yaml` 中添加通知配置：

```yaml
notification:
  appkey: 'your_appkey_here'
  appsecret: 'your_appsecret_here'
  toWorkCode: 'your_work_code_here'
```

移除（如果有）：

```yaml
resultFile: result.md # 不再需要
```

### 2. 更新 GitHub Secrets

添加以下新 Secrets：

- `NOTIFICATION_APPKEY`
- `NOTIFICATION_APPSECRET`
- `NOTIFICATION_TO_WORK_CODE`

### 3. 更新代码

```bash
git pull origin master
pnpm install
pnpm build
```

### 4. 测试运行

```bash
pnpm start
```

如果看到 `✅ 通知发送成功`，说明配置正确。

## ⚠️ 注意事项

1. **通知配置必填** - 没有通知配置将无法启动
2. **通知失败不影响签到** - 签到会正常完成，只是通知没有发送
3. **保护敏感信息** - appkey 和 appsecret 不要泄露
4. **result.md 不再更新** - 旧的结果文件不会再被更新

## 📝 版本历史

- **v2.1.0** - 通知推送（当前版本）
- **v2.0.0** - 迁移到 GitHub Actions
- **v1.0.0** - 本地定时任务 + 文件写入

---

如有任何问题，请查看 [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md) 或提交 Issue。
