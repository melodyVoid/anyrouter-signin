/**
 * 阿里云 ACW (Alibaba Cloud WAF) 反爬虫验证模块
 */

/**
 * 从 HTML 响应中提取 arg1 参数
 */
export function extractArg1FromHtml(html: string): string | null {
  const match = html.match(/var arg1='([A-F0-9]{40})'/)
  return match ? match[1] : null
}

/**
 * 计算 acw_sc__v2 cookie 值
 * @param arg1 - 从服务器返回的 40 位十六进制字符串
 * @returns 计算得到的 acw_sc__v2 值
 */
export function calculateAcwScV2(arg1: string): string {
  // posList 定义了字符重排的顺序
  const posList = [
    0xf, 0x23, 0x1d, 0x18, 0x21, 0x10, 0x1, 0x26, 0xa, 0x9, 0x13, 0x1f, 0x28, 0x1b, 0x16, 0x17,
    0x19, 0xd, 0x6, 0xb, 0x27, 0x12, 0x14, 0x8, 0xe, 0x15, 0x20, 0x1a, 0x2, 0x1e, 0x7, 0x4, 0x11,
    0x5, 0x3, 0x1c, 0x22, 0x25, 0xc, 0x24,
  ]

  // mask 是固定的编码值（base64 解码后的结果）
  const mask = '3000176000856006061501533003690027800375'

  // 根据 posList 重排 arg1 字符
  const outPutList: string[] = []
  for (let i = 0; i < arg1.length; i++) {
    const thisChar = arg1[i]
    for (let j = 0; j < posList.length; j++) {
      if (posList[j] === i + 1) {
        outPutList[j] = thisChar
      }
    }
  }

  const arg2 = outPutList.join('')

  // 与 mask 进行 XOR 运算
  let arg3 = ''
  for (let i = 0; i < arg2.length && i < mask.length; i += 2) {
    // 每次处理两个字符（一个字节）
    const strChar = parseInt(arg2.slice(i, i + 2), 16)
    const maskChar = parseInt(mask.slice(i, i + 2), 16)

    // XOR 运算
    let xorChar = (strChar ^ maskChar).toString(16)

    // 确保是两位数
    if (xorChar.length === 1) {
      xorChar = '0' + xorChar
    }

    arg3 += xorChar
  }

  return arg3
}

/**
 * 检测响应是否包含 ACW 验证
 */
export function isAcwChallenge(html: string): boolean {
  return html.includes('acw_sc__v2') && html.includes('var arg1=')
}
