import { getUploadToken } from '../api/agent.js'

async function uploadToCOS(file, tokenData, onProgress) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: tokenData.uploadUrl || tokenData.url,
      filePath: file.path || file,
      name: 'file',
      header: {
        Authorization: tokenData.authorization || tokenData.token,
      },
      success(res) {
        const url = tokenData.cdnUrl || tokenData.uploadUrl || res.data
        resolve(url)
      },
      fail: reject,
    })
  })
}

async function uploadToMinIO(file, tokenData, onProgress) {
  const uploadUrl = tokenData.uploadUrl || tokenData.url
  const fileUrl = tokenData.fileUrl || tokenData.cdnUrl || uploadUrl

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: uploadUrl,
      filePath: file.path || file,
      name: tokenData.fieldName || 'file',
      formData: tokenData.formData || {},
      success() {
        resolve(fileUrl)
      },
      fail: reject,
    })
  })
}

export async function uploadFile(file, onProgress) {
  const res = await getUploadToken()
  const tokenData = res.data || res
  if (tokenData.usageType === 1) {
    return uploadToCOS(file, tokenData, onProgress)
  }
  return uploadToMinIO(file, tokenData, onProgress)
}
