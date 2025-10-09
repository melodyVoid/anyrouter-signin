# ACW 验证快速指南

## 概述

本项目已集成阿里云 ACW (Alibaba Cloud WAF) 反爬虫验证自动处理功能，无需任何额外配置即可使用。

## 工作原理

当服务器返回 ACW 验证挑战时，系统会自动：

1. 🔍 **检测验证请求** - 识别包含 `acw_sc__v2` 的 HTML 响应
2. 📝 **提取参数** - 从响应中提取 40 位十六进制 `arg1` 参数
3. ⚙️ **计算 cookie** - 使用逆向算法计算 `acw_sc__v2` 值
4. 🔄 **自动重试** - 更新 Cookie 并重新发起请求

## 使用示例

### 自动处理（推荐）

```typescript
import { signIn, getUserInfo } from './src/http.js'

// 正常调用，系统会自动处理 ACW 验证
const result = await signIn(config)
// 如果遇到 ACW 验证，会自动计算并重试
```

### 查看验证过程

运行程序时，如果触发 ACW 验证，会看到：

```
🔐 检测到 ACW 验证挑战，正在计算 acw_sc__v2...
📝 提取到 arg1: F806D672A2E5525838EF046B8156D7A059844D57
✅ 计算得到 acw_sc__v2: 68db4f9d2a6f1540837b59a11002ee761a869721
🔄 已更新 Cookie，准备重试请求...
```

## 测试验证

### 1. 测试算法

```bash
npx tsx test-acw.ts
```

### 2. 测试 HTTP 集成

```bash
npx tsx test-acw-http.ts
```

### 3. 查看示例

```bash
npx tsx acw-example.ts
```

## 算法演示

```typescript
import { calculateAcwScV2 } from './src/acw.js'

// 输入：服务器返回的 arg1 参数
const arg1 = 'F806D672A2E5525838EF046B8156D7A059844D57'

// 输出：计算得到的 acw_sc__v2 值
const acwScV2 = calculateAcwScV2(arg1)
// => '68db4f9d2a6f1540837b59a11002ee761a869721'

// 在 Cookie 中使用
const cookie = `session=xxx; acw_sc__v2=${acwScV2}`
```

## 常见问题

### Q: 需要手动配置吗？

不需要！ACW 验证处理是自动的，无需任何配置。

### Q: 验证失败怎么办？

如果 ACW 验证失败，会返回明确的错误信息：

```
ACW 验证失败：已尝试多次但仍无法通过验证
```

此时建议：

1. 检查网络连接
2. 确认 Cookie 中的其他字段是否有效
3. 查看日志文件了解详细错误

### Q: 性能影响如何？

- 仅在触发 ACW 验证时才会执行
- 计算时间 < 1ms
- 自动重试一次，总耗时增加约 1-2 秒

### Q: 支持并发吗？

完全支持！每个请求独立处理 ACW 验证，不会相互影响。

## 核心文件

- `src/acw.ts` - ACW 验证算法实现
- `src/http.ts` - HTTP 客户端（已集成 ACW 处理）
- `ACW_SOLUTION.md` - 详细技术说明
- `test-acw.ts` - 算法测试脚本
- `acw-example.ts` - 使用示例

## 技术细节

想了解更多技术细节？查看：

- [ACW_SOLUTION.md](./ACW_SOLUTION.md) - 完整技术文档
- [src/acw.ts](./src/acw.ts) - 源代码实现

## 总结

✅ **自动化** - 无需手动干预 ✅ **透明化** - 详细的日志输出 ✅ **可靠性** - 经过测试验证 ✅ **高性能** - 毫秒级计算 ✅ **易维护** - 清晰的代码结构
