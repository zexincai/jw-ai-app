import { http } from '../utils/request'

/** 将 file.type 映射为阿里云 ASR format 参数 */
export function getAsrFormat(mimeType: string): string {
  if (mimeType.includes('webm')) return 'opus'   // Chrome/Edge: audio/webm;codecs=opus
  if (mimeType.includes('mp3'))  return 'mp3'
  if (mimeType.includes('wav'))  return 'wav'
  if (mimeType.includes('aac'))  return 'aac'
  if (mimeType.includes('ogg'))  return 'ogg'
  if (mimeType.includes('opus')) return 'opus'
  return 'mp3'
}

/** 从后端获取阿里云 Token + AppKey */
export async function getAliyunToken(): Promise<{ token: string; appKey: string }> {
  const res = await http.get<{ token: string; appKey: string }>('/eng/voice/aliyunToken')
  return res.data
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(16)
    crypto.getRandomValues(arr)
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
  }
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

const WS_ENDPOINT = 'wss://nls-gateway-cn-shenzhen.aliyuncs.com/ws/v1'
const ASR_TIMEOUT_MS = 20_000

/**
 * 通过 WebSocket 将录音文件发送至阿里云 ISI 一句话识别，返回识别文字。
 * 识别失败时抛出 Error，识别为空时返回空字符串（由调用方处理）。
 */
export function transcribeAudio(
  file: File,
  token: string,
  appKey: string,
  format: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const taskId = randomId()
    let result = ''
    let settled = false

    const done = (val: string) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      ws.close()
      resolve(val)
    }

    const fail = (msg: string) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      ws.close()
      reject(new Error(msg))
    }

    const timer = setTimeout(() => fail('语音识别超时，请重试'), ASR_TIMEOUT_MS)

    const ws = new WebSocket(`${WS_ENDPOINT}?token=${token}`)
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      ws.send(JSON.stringify({
        header: {
          message_id: randomId(),
          task_id: taskId,
          namespace: 'SpeechRecognizer',
          name: 'StartRecognition',
          appkey: appKey,
        },
        payload: {
          format,
          sample_rate: 16000,
          enable_punctuation_prediction: true,
          enable_inverse_text_normalization: true,
        },
      }))
    }

    ws.onmessage = async (e: MessageEvent) => {
      let msg: { header: { name: string; status: number; status_text?: string }; payload?: { result?: string } }
      try { msg = JSON.parse(e.data as string) } catch { return }

      const name = msg.header?.name

      if (name === 'RecognitionStarted') {
        // 分块发送音频二进制数据
        const buf = await file.arrayBuffer()
        const CHUNK = 8192
        for (let offset = 0; offset < buf.byteLength; offset += CHUNK) {
          ws.send(buf.slice(offset, offset + CHUNK))
        }
        // 发送停止指令
        ws.send(JSON.stringify({
          header: {
            message_id: randomId(),
            task_id: taskId,
            namespace: 'SpeechRecognizer',
            name: 'StopRecognition',
            appkey: appKey,
          },
        }))
      } else if (name === 'RecognitionResultChanged') {
        result = msg.payload?.result ?? result
      } else if (name === 'RecognitionCompleted') {
        done(msg.payload?.result ?? result)
      } else if (name === 'TaskFailed') {
        fail(msg.header?.status_text || '语音识别失败')
      }
    }

    ws.onerror = () => fail('语音识别连接失败，请检查网络')
    ws.onclose = () => { /* settled 状态由 done/fail 管理 */ }
  })
}
