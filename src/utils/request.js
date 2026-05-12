import { getDeviceId } from './device.js'

let BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://100.112.82.63:9199'
// #ifdef H5
if (import.meta.env.DEV) BASE_URL = '/api'
// #endif

// 并发请求计数器，所有请求完成后统一隐藏 loading
let _loadingCount = 0

// 设备 ID 缓存（懒加载）
let _deviceIdCache = null
async function _ensureDeviceId() {
  if (!_deviceIdCache) {
    try { _deviceIdCache = await getDeviceId() } catch { _deviceIdCache = '' }
  }
  return _deviceIdCache
}

function _showLoading() {
  _loadingCount++
  if (_loadingCount === 1) {
    uni.showLoading({ title: '加载中...', mask: true })
  }
}

function _hideLoading() {
  _loadingCount = Math.max(0, _loadingCount - 1)
  if (_loadingCount === 0) {
    uni.hideLoading()
  }
}

function buildQs(params) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

export function request(url, { method = 'GET', params = {}, data, silent = false } = {}) {
  return new Promise(async (resolve, reject) => {
    const token = uni.getStorageSync('jclaw_token') || ''
    const deviceId = await _ensureDeviceId()
    const qs = buildQs({ ...params, operatePort: 2 })
    const sep = url.includes('?') ? '&' : '?'
    const fullUrl = `${BASE_URL}${url}${sep}${qs}`

    if (!silent) _showLoading()

    uni.request({
      url: fullUrl,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        Authorization: token,
        clientid: deviceId,
      },
      success(res) {
        if (!silent) _hideLoading()
        const body = res.data
        if (body && (body.code === 503 || body.code === 504)) {
          uni.request({
            url: `${BASE_URL}/auth/ai/sysLogout?operatePort=2`,
            method: 'POST',
            header: { Authorization: token, 'Content-Type': 'application/json' },
          })
          uni.removeStorageSync('jclaw_token')
          uni.reLaunch({ url: '/pages/login/login' })
          return
        }
        if (body && body.code !== undefined && body.code !== 200) {
          uni.showToast({ title: body.msg || '请求失败', icon: 'none', duration: 2000 })
          const err = new Error(body.msg || '请求失败')
          err.code = body.code
          err.handled = true
          reject(err)
          return
        }
        resolve(body)
      },
      fail(err) {
        if (!silent) _hideLoading()
        reject(err)
      },
    })
  })
}

export const http = {
  get:    (url, params, opts)       => request(url, { method: 'GET',    params, ...opts }),
  post:   (url, data, params, opts) => request(url, { method: 'POST',   data, params, ...opts }),
  put:    (url, data, params, opts) => request(url, { method: 'PUT',    data, params, ...opts }),
  delete: (url, params, opts)       => request(url, { method: 'DELETE', params, ...opts }),
}
