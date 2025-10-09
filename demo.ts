import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'

// 配置代理
const proxyUrl = 'http://127.0.0.1:7890'
const httpsAgent = new HttpsProxyAgent(proxyUrl)

async function signIn() {
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://anyrouter.top/api/user/sign_in',
      headers: {
        'Content-Type': 'application/json',
        'New-Api-User': '3542',
        Referer: 'https://anyrouter.top/console/topup',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        Cookie:
          'session=MTc1NzkwMjU2MnxEWDhFQVFMX2dBQUJFQUVRQUFEXzRQLUFBQWNHYzNSeWFXNW5EQW9BQ0hWelpYSnVZVzFsQm5OMGNtbHVad3dOQUF0bmFYUm9kV0pmTXpVME1nWnpkSEpwYm1jTUJnQUVjbTlzWlFOcGJuUUVBZ0FDQm5OMGNtbHVad3dJQUFaemRHRjBkWE1EYVc1MEJBSUFBZ1p6ZEhKcGJtY01Cd0FGWjNKdmRYQUdjM1J5YVc1bkRBa0FCMlJsWm1GMWJIUUdjM1J5YVc1bkRBVUFBMkZtWmdaemRISnBibWNNQmdBRU5WRTJhd1p6ZEhKcGJtY01EUUFMYjJGMWRHaGZjM1JoZEdVR2MzUnlhVzVuREE0QURFWnJhRzUxV0hKUFpEYzNWQVp6ZEhKcGJtY01CQUFDYVdRRGFXNTBCQVFBX2h1c3xmn7eu_CSts6oC_dyvrsMo5gtQvd9E4X3Ol0p72_97Mw==; acw_tc=a3b552d217594099776154678e56dd3d5820375e439b9580aece0d3b65; cdn_sec_tc=a3b552d217594099776154678e56dd3d5820375e439b9580aece0d3b65; acw_sc__v2=68de7739d32beafa0be4bef9a24cf99866c5350f'
      },
      // 使用代理
      httpsAgent,
      timeout: 15000,
      // 如果需要发送请求体数据，可以添加 data 字段
      // data: {}
    })

    console.log('响应状态:', response.status)
    console.log('响应数据:', response.data)
    return response.data
  } catch (error) {
    // if (axios.isAxiosError(error)) {
    //   console.error('请求失败:', error.message)
    //   console.error('响应数据:', error.response?.data)
    //   console.error('响应状态:', error.response?.status)
    // } else {
    //   console.error('发生错误:', error)
    // }
    console.error('发生错误:', error)
  }
}

// 执行签到
signIn()
