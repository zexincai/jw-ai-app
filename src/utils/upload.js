// 与 request.js 保持一致：H5 开发环境走代理，其余走真实地址
let BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://100.112.82.63:9199'
// #ifdef H5
if (import.meta.env.DEV) BASE_URL = '/api'
// #endif

const UPLOAD_URL = `${BASE_URL}/app/file/upload/picture?operatePort=2`

const MAX_FILE_SIZE  = 10 * 1024 * 1024   // 10 MB
const MAX_AUDIO_SIZE = 20 * 1024 * 1024   // 20 MB

// ── 底层上传 ──────────────────────────────────────────────────────

/**
 * 通过 uni.uploadFile 上传本地文件或 blob URL，返回 CDN URL 字符串。
 * @param {string} filePath  本地临时路径 或 blob:// URL（H5）
 * @param {function} [onProgress]  进度回调 ({ percent: number })
 */
function _upload(filePath, onProgress) {
  const token = uni.getStorageSync('jclaw_token') || ''

  return new Promise((resolve, reject) => {
    const task = uni.uploadFile({
      url: UPLOAD_URL,
      filePath,
      name: 'file',
      header: { Authorization: token },
      success(res) {
        let body
        try { body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data } catch {}
        if (body?.code === 503 || body?.code === 504) {
          uni.removeStorageSync('jclaw_token')
          uni.reLaunch({ url: '/pages/login/login' })
          reject(new Error(body.msg || '登录已过期'))
          return
        }
        if (body?.code === 200 || body?.code === undefined) {
          resolve(body?.data || body?.url || '')
        } else {
          reject(new Error(body?.msg || '上传失败'))
        }
      },
      fail: reject,
    })
    if (onProgress && task?.onProgressUpdate) {
      task.onProgressUpdate(({ progress }) => onProgress({ percent: progress }))
    }
  })
}

/** 获取文件大小（native 用 getFileInfo，H5 File 对象直接取 .size） */
function _getSize(file) {
  if (file instanceof Blob) return Promise.resolve(file.size)
  if (file.size != null)   return Promise.resolve(file.size)
  return new Promise(resolve => {
    uni.getFileInfo({
      filePath: file.path || file,
      success: res => resolve(res.size),
      fail: () => resolve(0), // 获取失败不阻断，由服务端兜底
    })
  })
}

// ── 公开上传接口 ──────────────────────────────────────────────────

/**
 * 上传图片（10 MB 限制）
 * @param {{ path: string }} file
 */
export async function uploadImage(file, onProgress) {
  const size = await _getSize(file)
  if (size > MAX_FILE_SIZE) throw new Error('图片大小不能超过 10MB')
  return _upload(file.path || file, onProgress)
}

/**
 * 上传文档 / 通用附件（10 MB 限制）
 * @param {{ path: string } | File} file  native 传 { path }，H5 传 File 对象
 */
export async function uploadAttachment(file, onProgress) {
  const size = await _getSize(file)
  if (size > MAX_FILE_SIZE) throw new Error('文件大小不能超过 10MB')

  // H5 File 对象需先转为 blob URL
  // #ifdef H5
  if (file instanceof File) {
    const blobUrl = URL.createObjectURL(file)
    try {
      return await _upload(blobUrl, onProgress)
    } finally {
      URL.revokeObjectURL(blobUrl)
    }
  }
  // #endif

  return _upload(file.path || file, onProgress)
}

/**
 * 上传音频（20 MB 限制）
 * @param {{ path: string }} file  path 可以是本地路径或 blob URL（H5）
 */
export async function uploadAudio(file, onProgress) {
  // H5 blob URL 无法通过 getFileInfo 获取大小，由调用方在录音阶段校验 blob.size
  // #ifndef H5
  const size = await _getSize(file)
  if (size > MAX_AUDIO_SIZE) throw new Error('音频大小不能超过 20MB')
  // #endif
  return _upload(file.path || file, onProgress)
}
