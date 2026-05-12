import COS from 'cos-js-sdk-v5'
import { http } from './request'

interface UploadTokenResponse {
  usageType: number
  tmpSecretId: string
  tmpSecretKey: string
  token: string
  startTime: number
  expiredTime: number
  objectKey: string
  endpoint: string
  bucketName: string
  folderName: string
  regionName: string
}
// 分片合并
// postFileComposeObject: (data = {}) =>
//   httpPost(
//     {
//       url: "/eng/file/composeObject",
//       data
//     }
//   )
const config = {
  videoBucket: 'epms-1307524156',
  imageBucket: 'epms-1307524156',
  region: 'ap-guangzhou',
}

/**
 * 获取上传凭证
 */
async function getUploadToken(): Promise<UploadTokenResponse> {
  const res = await http.get<UploadTokenResponse>('/eng/file/temporary/token')
  return res.data
}

/**
 * 获取预签名 URL（用于 MinIO 分片上传）
 */
async function getPresignedUrl(): Promise<{ presignedObjectUrl: string; objectKey: string }> {
  const res = await http.get<{ presignedObjectUrl: string; objectKey: string }>('/eng/file/getPresignedObjectUrl')
  return res.data
}

/**
 * 合并分片文件
 */
async function composeObject(
  bucketName: string,
  sourceObjectName: string,
  objectNameList: string[]
): Promise<string> {
  const res = await http.post<string>('/eng/file/composeObject', {
    bucketName,
    sourceObjectName,
    objectNameList,
  })
  return res.data
}

/**
 * MinIO 分片上传
 */
async function uploadChunk(
  file: File,
  uploadData: UploadTokenResponse,
  onProgress?: (progress: { percent: number }) => void
): Promise<string> {
  let CHUNK_SIZE = 6 * 1024 * 1024 // 6MB

  // 根据文件大小调整分片大小
  const fileSizeMB = file.size / (1024 * 1024)
  if (fileSizeMB >= 200 && fileSizeMB <= 1000) {
    CHUNK_SIZE = 20 * 1024 * 1024
  }
  if (fileSizeMB > 1000) {
    CHUNK_SIZE = 50 * 1024 * 1024
  }

  return new Promise(async (resolve, reject) => {
    const uploadPromises: Promise<string>[] = []
    let successNumber = 0

    // 超过 1GB，前 5 个切片 20MB，其余切片 50MB
    if (fileSizeMB > 1000) {
      const firstChunkSize = 20 * 1024 * 1024
      const firstChunks = 5
      const secondChunks = Math.ceil((file.size - firstChunkSize * firstChunks) / CHUNK_SIZE)
      const totalChunks = firstChunks + secondChunks

      for (let i = 0; i < totalChunks; i++) {
        let chunk: Blob
        if (i < firstChunks) {
          const start = i * firstChunkSize
          const end = (i + 1) * firstChunkSize
          chunk = file.slice(start, end)
        } else {
          const start = firstChunkSize * firstChunks + (i - firstChunks) * CHUNK_SIZE
          const end = Math.min(start + CHUNK_SIZE, file.size)
          chunk = file.slice(start, end)
        }

        const promise = new Promise<string>(async (resolve, reject) => {
          try {
            const { presignedObjectUrl, objectKey } = await getPresignedUrl()
            const response = await fetch(presignedObjectUrl, {
              method: 'PUT',
              body: chunk,
              headers: {
                'Content-Type': file.type || 'application/octet-stream',
              },
            })

            if (response.status !== 200) {
              console.error(`切片 ${i} 上传失败`, response)
              return reject(new Error(`切片 ${i} 上传失败`))
            }

            successNumber++
            const percent = Math.round((successNumber / totalChunks) * 100)
            console.log(`已成功数量：${successNumber}，总数量：${totalChunks}，进度：${percent}%`)
            resolve(objectKey)

            if (onProgress) {
              onProgress({ percent })
            }
          } catch (error) {
            reject(error)
          }
        })
        uploadPromises.push(promise)
      }
    } else {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

      if (totalChunks === 1) {
        const promise = new Promise<string>(async (resolve, reject) => {
          try {
            if (onProgress) onProgress({ percent: 10 })
            const { presignedObjectUrl, objectKey } = await getPresignedUrl()
            if (onProgress) onProgress({ percent: 30 })
            const response = await fetch(presignedObjectUrl, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': file.type || 'application/octet-stream',
              },
            })

            if (response.status !== 200) {
              console.error('切片上传失败', response)
              return reject(new Error('切片上传失败'))
            }

            if (onProgress) onProgress({ percent: 100 })
            resolve(objectKey)
          } catch (error) {
            reject(error)
          }
        })
        uploadPromises.push(promise)
      } else {
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE
          const end = Math.min(start + CHUNK_SIZE, file.size)
          const chunk = file.slice(start, end)

          const promise = new Promise<string>(async (resolve, reject) => {
            try {
              const { presignedObjectUrl, objectKey } = await getPresignedUrl()
              const response = await fetch(presignedObjectUrl, {
                method: 'PUT',
                body: chunk,
                headers: {
                  'Content-Type': file.type || 'application/octet-stream',
                },
              })

              if (response.status !== 200) {
                console.error(`切片 ${i} 上传失败`, response)
                return reject(new Error(`切片 ${i} 上传失败`))
              }

              successNumber++
              const percent = Math.round((successNumber / totalChunks) * 100)
              console.log(`已成功数量：${successNumber}，总数量：${totalChunks}，进度：${percent}%`)
              resolve(objectKey)

              if (onProgress) {
                onProgress({ percent })
              }
            } catch (error) {
              reject(error)
            }
          })
          uploadPromises.push(promise)
        }
      }
    }

    try {
      const results = await Promise.all(uploadPromises)

      // 如果有多个分片，需要调用合并接口
      if (results.length >= 1) {
        // 生成目标文件名（使用原始文件名）
        const fileName = file.name || 'unnamed'
        const fileExt = fileName.split('.').pop() || ''
        const timestamp = new Date().getTime()
        const sourceObjectName = `${uploadData.folderName}${timestamp}.${fileExt}`

        const fileUrl = await composeObject(
          uploadData.bucketName,
          sourceObjectName,
          results
        )
        resolve(fileUrl)
      } else {
        // 单个文件直接返回 URL
        const objectKey = results[0]
        const fileUrl = `${uploadData.endpoint}/${uploadData.bucketName}/${objectKey}`
        resolve(fileUrl)
      }
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 上传文件（自动选择 COS 或 MinIO）
 * @param file 要上传的文件
 * @param onProgress 上传进度回调
 * @returns 文件的 URL 地址
 */
export async function uploadFile(
  file: File,
  onProgress?: (progress: any) => void
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await getUploadToken()

      // usageType=0 使用 MinIO 分片上传，usageType=1 使用腾讯云 COS
      if (!data.usageType) {
        return uploadChunk(file, data, onProgress)
          .then((url) => resolve(url))
          .catch((err) => reject(err))
      }

      // 腾讯云 COS 上传
      const cos = new COS({
        getAuthorization: (_options, callback) => {
          callback({
            TmpSecretId: data.tmpSecretId,
            TmpSecretKey: data.tmpSecretKey,
            SecurityToken: data.token,
            StartTime: data.startTime,
            ExpiredTime: data.expiredTime,
            ScopeLimit: true,
          })
        },
        FileParallelLimit: 3000,
        ChunkParallelLimit: 3000,
        ProgressInterval: 1000,
      })

      const filename = file.name
      const index = filename.lastIndexOf('.')
      const ext = filename.substring(index + 1, filename.length)

      cos.uploadFile(
        {
          Bucket: config.imageBucket,
          Region: config.region,
          Key: `${data.objectKey}.${ext}`,
          Body: file,
          onProgress: (progressData) => {
            if (onProgress) onProgress(progressData)
            console.log(JSON.stringify(progressData))
          },
        },
        (err, data) => {
          if (err) {
            reject(err)
          } else if (data.statusCode === 200) {
            resolve(`https://${data.Location}`)
          } else {
            reject(new Error('上传失败'))
          }
        }
      )
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 上传图片（带类型校验）
 */
export async function uploadImage(
  file: File,
  onProgress?: (progress: any) => void
): Promise<string> {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    throw new Error('仅支持上传 JPG、PNG、GIF、WebP 格式的图片')
  }

  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('图片大小不能超过 10MB')
  }

  return uploadFile(file, onProgress)
}

/**
 * 上传视频（带类型校验）
 */
export async function uploadVideo(
  file: File,
  onProgress?: (progress: any) => void
): Promise<string> {
  const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv']
  if (!validTypes.includes(file.type)) {
    throw new Error('仅支持上传 MP4、AVI、MOV、WMV 格式的视频')
  }

  const maxSize = 100 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('视频大小不能超过 100MB')
  }

  return uploadFile(file, onProgress)
}

/**
 * 上传语音视频（带类型校验的录音文件）
 */
export async function uploadAudio(
  file: File,
  onProgress?: (progress: any) => void
): Promise<string> {
  // 对于手机端的宽容处理，有的可能是 audio/aac 或其他
  if (!file.type.startsWith('audio/')) {
    throw new Error('仅支持上传音频格式文件')
  }

  const maxSize = 20 * 1024 * 1024 // 录音一般不超过20MB
  if (file.size > maxSize) {
    throw new Error('音频大小不能超过 20MB')
  }

  return uploadFile(file, onProgress)
}

export default {
  uploadFile,
  uploadImage,
  uploadVideo,
  uploadAudio
}
