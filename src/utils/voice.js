const WS_ENDPOINT = 'wss://nls-gateway-cn-shenzhen.aliyuncs.com/ws/v1'
const ASR_TIMEOUT_MS = 20000

export function getAsrFormat(mimeType = '') {
  if (mimeType.includes('wav'))  return 'wav'
  if (mimeType.includes('webm') || mimeType.includes('opus')) return 'opus'
  if (mimeType.includes('aac') || mimeType.includes('mp4'))   return 'aac'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'aac'
}

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(16)
    crypto.getRandomValues(arr)
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
  }
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

/**
 * 通过 WebSocket 将录音 ArrayBuffer 发至阿里云 ASR，返回识别文字。
 * 识别失败时抛出 Error，识别为空返回空字符串。
 */
export function transcribeAudio(arrayBuffer, mimeType, token, appKey) {
  return new Promise((resolve, reject) => {
    const taskId = randomId()
    let result = ''
    let settled = false

    const done = (val) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try { ws.close() } catch {}
      resolve(val)
    }

    const fail = (msg) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try { ws.close() } catch {}
      reject(new Error(msg))
    }

    const timer = setTimeout(() => fail('语音识别超时，请重试'), ASR_TIMEOUT_MS)
    const format = getAsrFormat(mimeType)

    const ws = new WebSocket(`${WS_ENDPOINT}?token=${token}`)
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      ws.send(JSON.stringify({
        header: { message_id: randomId(), task_id: taskId, namespace: 'SpeechRecognizer', name: 'StartRecognition', appkey: appKey },
        payload: { format, sample_rate: 16000, enable_punctuation_prediction: true, enable_inverse_text_normalization: true },
      }))
    }

    ws.onmessage = (e) => {
      let msg
      try { msg = JSON.parse(e.data) } catch { return }
      const name = msg.header?.name
      if (name === 'RecognitionStarted') {
        // 分块发送（8 KB / chunk）
        const CHUNK = 8192
        for (let offset = 0; offset < arrayBuffer.byteLength; offset += CHUNK) {
          ws.send(arrayBuffer.slice(offset, offset + CHUNK))
        }
        ws.send(JSON.stringify({
          header: { message_id: randomId(), task_id: taskId, namespace: 'SpeechRecognizer', name: 'StopRecognition', appkey: appKey },
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
  })
}
