<template>
  <view
    class="voice-btn"
    :class="recording ? 'voice-btn--active' : ''"
    @touchstart.prevent="startRecording"
    @touchend.prevent="stopRecording"
    @touchcancel.prevent="cancelRecording"
  >
    <image src="/static/icon-mic.svg" class="voice-icon" mode="aspectFit" />
    <text v-if="recording" class="voice-label">松开发送</text>
    <text v-else class="voice-label">按住说话</text>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { getAliyunToken } from '@/api/agent.js'

const emit = defineEmits(['text', 'file'])
const recording = ref(false)
let _cancelled = false

// #ifdef H5
let _mediaRecorder = null
let _chunks = []
let _mimeType = ''

function getH5MimeType() {
  return ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm']
    .find(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || 'audio/webm'
}

async function startH5() {
  _chunks = []
  _mimeType = getH5MimeType()
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  _mediaRecorder = new MediaRecorder(stream, { mimeType: _mimeType })
  _mediaRecorder.ondataavailable = e => { if (e.data.size > 0) _chunks.push(e.data) }
  _mediaRecorder.start(100)
}

async function stopH5() {
  if (!_mediaRecorder) return
  return new Promise(resolve => {
    _mediaRecorder.onstop = async () => {
      const blob = new Blob(_chunks, { type: _mimeType })
      _mediaRecorder.stream.getTracks().forEach(t => t.stop())
      _mediaRecorder = null
      resolve(blob)
    }
    _mediaRecorder.stop()
  })
}
// #endif

// #ifndef H5
const _recManager = uni.getRecorderManager()
let _recResolve = null
_recManager.onStop(res => { if (_recResolve) { _recResolve(res); _recResolve = null } })
// #endif

function getAsrFormat(mimeType) {
  if (!mimeType) return 'pcm'
  if (mimeType.includes('webm') || mimeType.includes('ogg')) return 'opus'
  if (mimeType.includes('mp4') || mimeType.includes('aac')) return 'aac'
  return 'pcm'
}

async function startRecording() {
  _cancelled = false
  recording.value = true
  // #ifdef H5
  try { await startH5() } catch { recording.value = false }
  // #endif
  // #ifndef H5
  _recManager.start({ format: 'aac', duration: 60000 })
  // #endif
}

async function stopRecording() {
  if (!recording.value) return
  recording.value = false
  if (_cancelled) return

  // #ifdef H5
  const blob = await stopH5()
  if (!blob) return
  await sendToAsr(blob, _mimeType)
  // #endif

  // #ifndef H5
  await new Promise(resolve => {
    _recResolve = resolve
    _recManager.stop()
  }).then(async res => {
    if (!res?.tempFilePath) return
    const arrayBuffer = await new Promise((ok, fail) => {
      const fs = uni.getFileSystemManager()
      fs.readFile({ filePath: res.tempFilePath, success: r => ok(r.data), fail })
    })
    await sendToAsr(arrayBuffer, 'audio/aac', res.tempFilePath)
  })
  // #endif
}

function cancelRecording() {
  _cancelled = true
  recording.value = false
  // #ifdef H5
  if (_mediaRecorder) { _mediaRecorder.stop(); _mediaRecorder = null }
  // #endif
  // #ifndef H5
  _recManager.stop()
  // #endif
}

async function sendToAsr(audioData, mimeType, filePath) {
  try {
    const tokenRes = await getAliyunToken()
    const tokenData = tokenRes.data || tokenRes
    const asrToken = tokenData.token || tokenData.aliyunToken || ''
    const format = getAsrFormat(mimeType)
    const wsUrl = `wss://nls-gateway-cn-shenzhen.aliyuncs.com/ws/v1?token=${asrToken}`

    const ws = new WebSocket(wsUrl)
    let text = ''
    const taskId = Math.random().toString(36).slice(2)

    ws.onopen = () => {
      ws.send(JSON.stringify({
        header: { message_id: taskId, task_id: taskId, namespace: 'SpeechRecognizer', name: 'StartRecognition', appkey: tokenData.appKey || '' },
        payload: { format, sample_rate: 16000, enable_punctuation_prediction: true, enable_inverse_text_normalization: true },
      }))
    }

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      const name = msg.header?.name
      if (name === 'RecognitionStarted') {
        // Send audio data
        if (audioData instanceof Blob) {
          audioData.arrayBuffer().then(buf => ws.send(buf))
        } else {
          ws.send(audioData)
        }
        ws.send(JSON.stringify({
          header: { message_id: taskId, task_id: taskId, namespace: 'SpeechRecognizer', name: 'StopRecognition', appkey: tokenData.appKey || '' },
        }))
      } else if (name === 'RecognitionResultChanged') {
        text = msg.payload?.result || text
      } else if (name === 'RecognitionCompleted') {
        text = msg.payload?.result || text
        ws.close()
        if (text) emit('text', text)
      }
    }

    ws.onerror = () => {
      uni.showToast({ title: '语音识别失败', icon: 'none' })
      // Fallback: emit file for manual upload
      if (filePath) emit('file', { path: filePath, mimeType })
    }
  } catch {
    uni.showToast({ title: '语音识别失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.voice-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: transparent;

  &--active {
    background: rgba($primary, 0.15);
  }
}

.voice-icon {
  width: 40rpx;
  height: 40rpx;
}

.voice-label {
  font-size: 18rpx;
  color: $on-surface-variant;
  margin-top: 4rpx;
  white-space: nowrap;
}
</style>
