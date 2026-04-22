<template><!-- 纯逻辑组件，无 UI --></template>

<script setup>
let _cancelled = false

// ── H5 ──────────────────────────────────────────────────────────
// #ifdef H5
let _audioCtx = null
let _scriptProcessor = null
let _mediaStream = null
let _pcmSamples = []

function _float32ToInt16(input) {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

function _buildWav(samples, sampleRate) {
  const totalSamples = samples.reduce((n, s) => n + s.length, 0)
  const dataBytes = totalSamples * 2
  const buf = new ArrayBuffer(44 + dataBytes)
  const view = new DataView(buf)
  const ws = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)) }
  ws(0, 'RIFF'); view.setUint32(4, 36 + dataBytes, true)
  ws(8, 'WAVE'); ws(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  ws(36, 'data'); view.setUint32(40, dataBytes, true)
  let offset = 44
  for (const chunk of samples) {
    for (let i = 0; i < chunk.length; i++, offset += 2) view.setInt16(offset, chunk[i], true)
  }
  return new Blob([buf], { type: 'audio/wav' })
}

async function _startH5() {
  _pcmSamples = []
  _mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  _audioCtx = new AudioContext({ sampleRate: 16000 })
  const source = _audioCtx.createMediaStreamSource(_mediaStream)
  _scriptProcessor = _audioCtx.createScriptProcessor(4096, 1, 1)
  _scriptProcessor.onaudioprocess = (e) => {
    if (!_cancelled) _pcmSamples.push(_float32ToInt16(e.inputBuffer.getChannelData(0)))
  }
  const sink = _audioCtx.createMediaStreamDestination()
  source.connect(_scriptProcessor)
  _scriptProcessor.connect(sink)
}

function _stopH5() {
  _scriptProcessor?.disconnect(); _audioCtx?.close()
  _mediaStream?.getTracks().forEach(t => t.stop())
  _scriptProcessor = null; _audioCtx = null; _mediaStream = null
}
// #endif

// ── 原生 ─────────────────────────────────────────────────────────
// #ifndef H5
const _recManager = uni.getRecorderManager()
let _recResolve = null
_recManager.onStop(res => { if (_recResolve) { _recResolve(res); _recResolve = null } })
// #endif

// ── 公开方法 ──────────────────────────────────────────────────────
async function start() {
  _cancelled = false
  // #ifdef H5
  try { await _startH5() } catch {
    uni.showToast({ title: '无法访问麦克风', icon: 'none' })
    throw new Error('mic_denied')
  }
  // #endif
  // #ifndef H5
  _recManager.start({ format: 'aac', duration: 60000 })
  // #endif
}

function cancel() {
  _cancelled = true
  // #ifdef H5
  _stopH5()
  // #endif
  // #ifndef H5
  _recManager.stop()
  // #endif
}

/**
 * 停止录音，返回音频数据。
 * H5:     { blob: Blob, mimeType: 'audio/wav' }
 * 原生:   { path: string, mimeType: 'audio/aac' }
 * 取消时返回 null。
 */
async function finish() {
  // #ifdef H5
  _stopH5()
  if (_cancelled) return null
  const blob = _buildWav(_pcmSamples, 16000)
  return { blob, mimeType: 'audio/wav' }
  // #endif

  // #ifndef H5
  return new Promise(resolve => {
    _recResolve = (res) => {
      if (!res?.tempFilePath || _cancelled) { resolve(null); return }
      resolve({ path: res.tempFilePath, mimeType: 'audio/aac' })
    }
    _recManager.stop()
  })
  // #endif
}

defineExpose({ start, cancel, finish })
</script>
