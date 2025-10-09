/**
 * ACW 算法使用示例
 * 演示如何手动计算和使用 acw_sc__v2
 */

import { calculateAcwScV2, extractArg1FromHtml } from './src/acw.js'

console.log('🔐 ACW 算法使用示例')
console.log('='.repeat(60))

// 示例 1: 直接计算（当你已经知道 arg1 值）
console.log('\n📌 示例 1: 直接计算 acw_sc__v2')
console.log('-'.repeat(60))

const arg1 = 'F806D672A2E5525838EF046B8156D7A059844D57'
const acwScV2 = calculateAcwScV2(arg1)

console.log(`输入 arg1: ${arg1}`)
console.log(`输出 acw_sc__v2: ${acwScV2}`)
console.log(`\n完整 Cookie: acw_sc__v2=${acwScV2}`)

// 示例 2: 从服务器响应中提取并计算
console.log('\n📌 示例 2: 从 HTML 响应中提取并计算')
console.log('-'.repeat(60))

const serverResponse = `
<html><script>
var arg1='A1B2C3D4E5F6789012345678901234567890ABCD';
var _0x4818=function(name, arg1){
  // ... ACW 验证代码 ...
}
_0x4818("acw_sc__v2", arg1);
document.location.reload()
</script></html>
`

const extractedArg1 = extractArg1FromHtml(serverResponse)
if (extractedArg1) {
  const calculatedAcw = calculateAcwScV2(extractedArg1)
  console.log(`从响应中提取的 arg1: ${extractedArg1}`)
  console.log(`计算得到的 acw_sc__v2: ${calculatedAcw}`)
} else {
  console.log('❌ 无法从响应中提取 arg1')
}

// 示例 3: 更新 Cookie
console.log('\n📌 示例 3: 更新 Cookie 字符串')
console.log('-'.repeat(60))

const oldCookie = 'session=abc123; user_id=456'
const newAcwValue = acwScV2

// 简单的 Cookie 更新逻辑
const updatedCookie = `${oldCookie}; acw_sc__v2=${newAcwValue}`
console.log(`原始 Cookie: ${oldCookie}`)
console.log(`新增 acw_sc__v2: ${newAcwValue}`)
console.log(`更新后的 Cookie:\n${updatedCookie}`)

console.log('\n' + '='.repeat(60))
console.log('💡 提示：')
console.log('   - 在实际使用中，HTTP 客户端会自动处理 ACW 验证')
console.log('   - 无需手动调用这些函数')
console.log('   - 此示例仅用于理解算法原理')
console.log('='.repeat(60))
