import { getDeviceId } from './device'
import { showToast } from './toast'

const BASE_URL = import.meta.env.VITE_API_BASE_URL
let isLoggingOut = false

// 统一响应结构
export interface ApiResponse<T = unknown> {
  code: number
  data: T
  msg?: string
}

// 请求配置
interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>
}

/**
 * 统一请求封装
 */
async function request<T>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const { params, ...fetchOptions } = options

  // 处理 URL 参数
  let finalUrl = url
  const allParams = { ...params, operatePort: 2 }
  const searchParams = new URLSearchParams(
    Object.entries(allParams).map(([k, v]) => [k, String(v)])
  )
  finalUrl = `${url}${url.includes('?') ? '&' : '?'}${searchParams}`

  try {
    const token = localStorage.getItem('jclaw_token')
    const clientId = await getDeviceId()
    const res = await fetch(`${BASE_URL}${finalUrl}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token || '',
        'clientid': clientId,
        ...fetchOptions.headers,
      },
      ...fetchOptions,
    })

    const json: ApiResponse<T> = await res.json()

    // 登录过期处理（防抖）
    if (json.code === 503 && !isLoggingOut) {
      isLoggingOut = true
      localStorage.removeItem('jclaw_token')
      localStorage.removeItem('jclaw_auth')
      showToast('登录已过期，请重新登录', 'warning')
      setTimeout(() => window.location.reload(), 1500)
      throw new Error('登录已过期，请重新登录')
    }

    // 业务错误处理
    if (json.code !== 200) {
      const msg = json.msg || '请求失败，请稍后重试'
      showToast(msg, 'error')
      throw new Error(msg)
    }
    return json
  } catch (err) {
    if (err instanceof Error) throw err
    const msg = '网络请求失败，请检查网络连接'
    showToast(msg, 'error')
    throw new Error(msg)
  }
}

export const http = {
  get<T>(url: string, params?: Record<string, string | number | boolean>) {
    return request<T>(url, { method: 'GET', params })
  },
  post<T>(url: string, data?: unknown) {
    return request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  },
  put<T>(url: string, data?: unknown) {
    return request<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  },
  delete<T>(url: string, params?: Record<string, string | number | boolean>) {
    return request<T>(url, { method: 'DELETE', params })
  },
}
