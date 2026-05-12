<template>
  <div class="flex items-center justify-between px-4 py-2 bg-blue-50/50 border border-blue-200 rounded-xl h-[56px] shadow-inner mb-2">
    <div class="flex items-center gap-3">
      <div class="relative flex items-center justify-center w-3 h-3">
        <div class="absolute w-full h-full bg-red-400 rounded-full animate-ping opacity-75"></div>
        <div class="relative w-2 h-2 bg-red-500 rounded-full"></div>
      </div>
      <span class="text-sm font-medium text-blue-900 tracking-wider font-mono">{{ formattedTime }}</span>
      <span class="text-xs text-blue-500 ml-2 animate-pulse">正在录音...</span>
    </div>

    <div class="flex items-center gap-3">
      <button @click="cancel" class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all" title="取消">
        <X :size="18" />
      </button>
      <button @click="finish" class="px-4 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-full shadow-md hover:bg-blue-600 hover:shadow-lg active:scale-95 transition-all focus:outline-none flex items-center gap-1.5">
        <Send :size="14" />
        发送
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { Send, X } from 'lucide-vue-next'

const emit = defineEmits<{
  cancel: []
  finish: [file: File]
}>()

const recordingTime = ref(0)
let clockTimer: ReturnType<typeof setInterval> | null = null

// AudioContext 录制 PCM 所需的引用
let audioCtx: AudioContext | null = null
let scriptProcessor: ScriptProcessorNode | null = null
let mediaStream: MediaStream | null = null
let pcmSamples: Int16Array[] = []
let cancelled = false

/** 将 Float32 PCM 转为 Int16 */
function float32ToInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
  }
  return out
}

/** 将 Int16 PCM 样本数组打包为 WAV 文件 */
function buildWav(samples: Int16Array[], sampleRate: number): File {
  const totalSamples = samples.reduce((n, s) => n + s.length, 0)
  const dataBytes = totalSamples * 2
  const buf = new ArrayBuffer(44 + dataBytes)
  const view = new DataView(buf)

  const writeStr = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)         // PCM chunk size
  view.setUint16(20, 1, true)          // PCM format
  view.setUint16(22, 1, true)          // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)  // byte rate
  view.setUint16(32, 2, true)          // block align
  view.setUint16(34, 16, true)         // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, dataBytes, true)

  let offset = 44
  for (const chunk of samples) {
    for (let i = 0; i < chunk.length; i++, offset += 2) {
      view.setInt16(offset, chunk[i], true)
    }
  }

  return new File([buf], `语音消息_${Date.now()}.wav`, { type: 'audio/wav' })
}

function stopAll() {
  scriptProcessor?.disconnect()
  audioCtx?.close()
  mediaStream?.getTracks().forEach(t => t.stop())
  if (clockTimer) clearInterval(clockTimer)
}

const startRecording = async () => {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioCtx = new AudioContext({ sampleRate: 16000 })
    const source = audioCtx.createMediaStreamSource(mediaStream)
    scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1)

    scriptProcessor.onaudioprocess = (e) => {
      if (cancelled) return
      pcmSamples.push(float32ToInt16(e.inputBuffer.getChannelData(0)))
    }

    // 路由到哑节点而非扬声器，避免关闭 AudioContext 时触发系统音频设备重置
    const sink = audioCtx.createMediaStreamDestination()
    source.connect(scriptProcessor)
    scriptProcessor.connect(sink)

    clockTimer = setInterval(() => { recordingTime.value += 1 }, 1000)
  } catch {
    alert('无法访问麦克风，请检查系统权限或是否处于 HTTPS/localhost 环境。')
    emit('cancel')
  }
}

const cancel = () => {
  cancelled = true
  stopAll()
  emit('cancel')
}

const finish = () => {
  stopAll()
  const file = buildWav(pcmSamples, 16000)
  emit('finish', file)
}

const formattedTime = computed(() => {
  const m = Math.floor(recordingTime.value / 60).toString().padStart(2, '0')
  const s = (recordingTime.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

onMounted(() => { startRecording() })

onBeforeUnmount(() => {
  cancelled = true
  stopAll()
})
</script>
