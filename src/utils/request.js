import { getDeviceId } from './device.js'

let BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
// #ifdef H5
if (import.meta.env.DEV) BASE_URL = '/api'
// #endif

function buildQs(params) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

export function request(url, { method = 'GET', params = {}, data } = {}) {
  return new Promise(async (resolve, reject) => {
    const token = uni.getStorageSync('jclaw_token') || ''
    const clientId = await getDeviceId()
    const qs = buildQs({ ...params, operatePort: 2 })
    const sep = url.includes('?') ? '&' : '?'
    const fullUrl = `${BASE_URL}${url}${sep}${qs}`

    uni.request({
      url: fullUrl,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token,
        'clientid': clientId,
      },
      success(res) {
        const body = res.data
        if (body && body.code === 503) {
          uni.request({
            url: `${BASE_URL}/auth/ai/sysLogout?operatePort=2`,
            method: 'POST',
            header: { 'Authorization': token, 'Content-Type': 'application/json' },
          })
          uni.removeStorageSync('jclaw_token')
          uni.reLaunch({ url: '/pages/login/login' })
          return
        }
        resolve(body)
      },
      fail: reject,
    })
  })
}

export const http = {
  get: (url, params) => request(url, { method: 'GET', params }),
  post: (url, data, params) => request(url, { method: 'POST', data, params }),
  put: (url, data, params) => request(url, { method: 'PUT', data, params }),
  delete: (url, params) => request(url, { method: 'DELETE', params }),
}
