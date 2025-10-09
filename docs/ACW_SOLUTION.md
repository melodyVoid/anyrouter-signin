# ACW 反爬虫验证解决方案

## 问题背景

当请求接口时，如果鉴权信息过期或触发反爬虫机制，服务器会返回一个包含混淆 JavaScript 代码的 HTML 页面。这个页面会计算一个 `acw_sc__v2` cookie 值，浏览器需要在后续请求中携带这个 cookie。

## ACW 验证机制分析

### 1. 响应格式

服务器返回的 HTML 包含：

```html
<html>
  <script>
    var arg1 = 'F806D672A2E5525838EF046B8156D7A059844D57'
    // ... 混淆的 JavaScript 代码 ...
    _0x4818('acw_sc__v2', arg1)
    document.location.reload()
  </script>
</html>
```

### 2. 核心算法

ACW 验证的核心逻辑包括三个步骤：

#### 步骤 1：字符重排

使用固定的位置序列 `posList` 重新排列 `arg1` 的字符：

```javascript
const posList = [
  0xf, 0x23, 0x1d, 0x18, 0x21, 0x10, 0x1, 0x26, 0xa, 0x9, 0x13, 0x1f, 0x28, 0x1b, 0x16, 0x17, 0x19,
  0xd, 0x6, 0xb, 0x27, 0x12, 0x14, 0x8, 0xe, 0x15, 0x20, 0x1a, 0x2, 0x1e, 0x7, 0x4, 0x11, 0x5, 0x3,
  0x1c, 0x22, 0x25, 0xc, 0x24,
]
```

#### 步骤 2：XOR 运算

将重排后的字符串与固定的 `mask` 进行异或运算：

```javascript
const mask = '3000176000856006061501533003690027800375'
```

#### 步骤 3：生成结果

XOR 运算的结果即为 `acw_sc__v2` 的值。

## 实现方案

### 文件结构

```
src/
├── acw.ts          # ACW 验证算法实现
└── http.ts         # HTTP 客户端（集成 ACW 处理）
```

### 核心功能

#### 1. `acw.ts` - ACW 算法模块

- `extractArg1FromHtml(html: string)`: 从 HTML 响应中提取 arg1 参数
- `calculateAcwScV2(arg1: string)`: 计算 acw_sc\_\_v2 cookie 值
- `isAcwChallenge(html: string)`: 检测响应是否包含 ACW 验证

#### 2. `http.ts` - HTTP 客户端

增强的 HTTP 请求处理：

- 自动检测 ACW 验证挑战
- 计算并更新 cookie
- 自动重试请求

### 工作流程

```
1. 发送 HTTP 请求
   ↓
2. 收到响应
   ↓
3. 检测是否为 ACW 验证？
   ├─ 否 → 返回正常响应
   └─ 是 → 4. 提取 arg1
           ↓
           5. 计算 acw_sc__v2
           ↓
           6. 更新 Cookie
           ↓
           7. 重试请求
```

## 使用方法

### 自动处理（推荐）

无需任何修改，系统会自动处理 ACW 验证：

```typescript
import { signIn, getUserInfo } from './src/http.js'

// 正常调用，系统会自动处理 ACW 验证
const result = await signIn(config)
```

### 手动计算（测试用）

```typescript
import { calculateAcwScV2 } from './src/acw.js'

const arg1 = 'F806D672A2E5525838EF046B8156D7A059844D57'
const acwScV2 = calculateAcwScV2(arg1)
console.log(`acw_sc__v2=${acwScV2}`)
```

## 测试

运行测试脚本：

```bash
npx tsx test-acw.ts
```

## 算法验证

使用 `acw.md` 中的示例：

- **输入**: `F806D672A2E5525838EF046B8156D7A059844D57`
- **预期输出**: 计算得到的 `acw_sc__v2` 值
- **验证**: 携带该 cookie 重新请求应该成功

## 注意事项

1. **时效性**: `acw_sc__v2` cookie 通常有时效性（1 小时左右）
2. **自动重试**: 系统最多自动重试 2 次
3. **失败处理**: 如果 ACW 验证失败，会返回相应的错误信息
4. **日志输出**: 验证过程会输出详细的日志信息

## 常见问题

### Q1: 为什么还是验证失败？

- 确保服务器返回的 `arg1` 被正确提取
- 检查网络连接和代理设置
- 确认 cookie 中的其他字段是否有效

### Q2: 如何查看验证过程？

系统会自动输出日志：

```
🔐 检测到 ACW 验证挑战，正在计算 acw_sc__v2...
📝 提取到 arg1: F806D672A2E5525838EF046B8156D7A059844D57
✅ 计算得到 acw_sc__v2: [计算结果]
🔄 已更新 Cookie，准备重试请求...
```

### Q3: 支持哪些请求类型？

- ✅ POST 请求（signIn）
- ✅ GET 请求（getUserInfo）
- ✅ 所有其他 HTTP 方法

## 技术细节

### 算法复杂度

- 时间复杂度: O(n)，n 为 arg1 长度（通常为 40）
- 空间复杂度: O(n)

### 安全性

- 算法完全在客户端执行
- 不涉及敏感信息泄露
- 仅用于绕过反爬虫验证

## 更新日志

- **2025-09-30**: 初始实现
  - 实现 ACW 算法逆向
  - 集成自动验证处理
  - 添加测试脚本和文档
