# GitHub Actions 设置指南

本项目使用 GitHub Actions 实现自动定时签到。

## 🚀 快速设置

### 1. Fork 本仓库

点击右上角的 Fork 按钮，将仓库 fork 到你的账号下。

### 2. 设置 GitHub Secrets

在你的仓库中，进入 **Settings** → **Secrets and variables** → **Actions**，添加以下 secrets：

| Secret 名称                 | 说明                   | 示例               |
| --------------------------- | ---------------------- | ------------------ |
| `NOTIFICATION_APPKEY`       | 通知接口的 appkey      | `49529a60...`      |
| `NOTIFICATION_APPSECRET`    | 通知接口的 appsecret   | `e24bc46d...`      |
| `NOTIFICATION_TO_WORK_CODE` | 通知接收人的 work code | `297615`           |
| `USER_ID_1`                 | 第一个用户的 ID        | `3542`             |
| `USER_COOKIE_1`             | 第一个用户的 Cookie    | `session=MTc1N...` |
| `USER_ID_2`                 | 第二个用户的 ID        | `6159`             |
| `USER_COOKIE_2`             | 第二个用户的 Cookie    | `session=MTc1O...` |

#### 如何获取 Cookie？

1. 登录 [anyrouter.top](https://anyrouter.top)
2. 打开浏览器开发者工具（F12）
3. 切换到 **Network** 标签
4. 刷新页面或进行签到操作
5. 找到请求，在 **Headers** 中复制 `Cookie` 的值

#### 如何获取通知配置？

通知配置用于在签到成功后发送通知消息。需要配置：

- `appkey` 和 `appsecret`：通知服务的认证信息
- `toWorkCode`：接收通知的用户工作码

### 3. 修改用户数量（可选）

如果你的用户数量不是 2 个，需要修改 `.github/workflows/signin.yml` 文件：

```yaml
- name: 创建配置文件
  run: |
    cat > config.yaml << 'EOF'
    dryRun: false

    users:
      - userId: ${{ secrets.USER_ID_1 }}
        cookie: ${{ secrets.USER_COOKIE_1 }}
      - userId: ${{ secrets.USER_ID_2 }}
        cookie: ${{ secrets.USER_COOKIE_2 }}
      # 添加更多用户...
      # - userId: ${{ secrets.USER_ID_3 }}
      #   cookie: ${{ secrets.USER_COOKIE_3 }}
    EOF
```

同时在 GitHub Secrets 中添加对应的 `USER_ID_3`、`USER_COOKIE_3` 等。

### 4. 修改定时时间（可选）

默认每 8 小时执行一次（北京时间 08:00, 16:00, 00:00）。如需修改，编辑 `.github/workflows/signin.yml`：

```yaml
schedule:
  # cron 表达式使用 UTC 时间
  # 北京时间 = UTC + 8
  - cron: '0 */8 * * *' # 每 8 小时执行一次
```

常用定时配置：

- 每 8 小时一次 → `'0 */8 * * *'`（UTC 00:00, 08:00, 16:00）
- 每 12 小时一次 → `'0 */12 * * *'`（UTC 00:00, 12:00）
- 每天一次 → `'0 1 * * *'`（北京时间 09:00）
- 每天两次 → `'0 1,13 * * *'`（北京时间 09:00, 21:00）

特定时间转换：

- 北京时间 08:00 → UTC 00:00 → `'0 0 * * *'`
- 北京时间 09:00 → UTC 01:00 → `'0 1 * * *'`
- 北京时间 10:00 → UTC 02:00 → `'0 2 * * *'`
- 北京时间 12:00 → UTC 04:00 → `'0 4 * * *'`
- 北京时间 22:00 → UTC 14:00 → `'0 14 * * *'`

### 5. 启用 GitHub Actions

1. 进入你的仓库的 **Actions** 标签
2. 如果提示需要启用，点击 **I understand my workflows, go ahead and enable them**
3. 你会看到 **签到任务** 工作流

### 6. 测试运行

点击 **签到任务** → **Run workflow** → **Run workflow** 按钮，手动触发一次工作流，验证配置是否正确。

## 📊 查看结果

每次签到后，结果会通过通知接口发送到配置的接收人。通知内容包括：

- 签到日期
- 各用户的签到状态
- 账户余额信息

## 🔧 故障排查

### 工作流执行失败

1. 检查 **Actions** 标签中的执行日志
2. 确认 GitHub Secrets 配置正确
3. 确认 Cookie 是否过期（重新登录获取新的 Cookie）

### Cookie 过期

Cookie 通常会在一段时间后过期。如果签到失败，请：

1. 重新登录网站
2. 获取新的 Cookie
3. 更新 GitHub Secrets 中的对应值

### 通知发送失败

如果通知发送失败，但签到成功：

1. 检查通知配置（appkey、appsecret、toWorkCode）是否正确
2. 确认通知接收人的 work code 有效
3. 签到仍然会正常完成，只是通知没有发送

### 签到未按时执行

GitHub Actions 的定时任务可能会有延迟（通常 5-15 分钟），这是正常现象。如果长时间未执行，可以手动触发一次。

## 🔒 安全提示

- ⚠️ **不要将 Cookie 和通知配置提交到代码仓库中**
- ✅ 所有敏感信息都应存储在 GitHub Secrets 中
- ✅ 确保你的仓库是私有的（Private），或者不要在公开仓库中使用真实配置
- ⚠️ appkey 和 appsecret 是认证凭据，不要泄露

## 📝 注意事项

1. **GitHub Actions 免费额度**：公开仓库无限制，私有仓库每月 2000 分钟
2. **定时任务限制**：最短间隔为 5 分钟，建议每天执行 1-2 次
3. **仓库活跃度**：如果仓库长期无活动，GitHub 可能会自动禁用定时任务

## 🆘 需要帮助？

如果遇到问题，请提交 Issue，附上执行日志（记得移除敏感信息）。
