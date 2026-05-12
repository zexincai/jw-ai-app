<template>
  <div :class="[
    'bg-white shrink-0 transition-all duration-500',
    isWelcome ? 'border-0' : 'border-t border-gray-100'
  ]">
    <QuickActions v-if="!isWelcome" @action="selectedAction = $event" :aiReplying="store.aiReplying" :hasInput="!!text.trim()" :hasFiles="files.length > 0" />
    <div :class="['px-4 pb-3', isWelcome ? 'pt-0' : 'pt-2']">
      <div v-if="isRecording" class="transition-all">
        <VoiceRecorder @cancel="isRecording = false" @finish="handleVoiceFinish" />
      </div>

      <div v-else-if="isTranscribing"
        class="flex items-center gap-3 px-4 bg-blue-50/50 border border-blue-200 rounded-xl h-[56px] shadow-inner mb-2">
        <svg class="w-4 h-4 text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
        <span class="text-sm text-blue-700">正在识别语音...</span>
      </div>

      <div v-else :class="[
        'flex flex-col border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 transition-all relative group',
        isWelcome ? 'border-gray-200' : 'border-gray-200 focus-within:border-blue-300',
        isDragging ? 'border-blue-400 bg-blue-50/20 ring-2 ring-blue-100' : ''
      ]"
      @dragover.prevent
      @dragenter.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      >
        <!-- 拖拽提示层 -->
        <div v-if="isDragging" class="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-blue-500/5">
          <div class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-100 rounded-full shadow-lg">
            <Upload :size="16" /> 释放鼠标以上传文件
          </div>
        </div>

        <!-- 上传进度条 -->
        <div v-if="uploadProgress !== null" class="absolute top-0 left-0 right-0 h-0.5 bg-gray-100 z-10">
          <div class="h-full transition-all duration-300 ease-out bg-blue-500" :style="{ width: `${uploadProgress}%` }"></div>
        </div>
        
        <!-- 快捷语 tag 展示 -->
        <div v-if="selectedAction" class="flex items-center gap-2 px-4 pt-3 pb-0">
          <span class="flex items-center gap-1 px-2 py-1 text-xs text-red-500 border border-red-200 rounded-full bg-red-50 shrink-0">
            {{ selectedAction.title }}
            <button @click="selectedAction = null; text = ''" class="leading-none transition-colors hover:text-red-700">×</button>
          </span>
        </div>
        <textarea v-model="text" @keydown.enter.exact.prevent="submit" @paste="handlePaste" rows="2" placeholder="可以描述任务或提问任何问题"
          class="px-4 pt-3 text-sm text-gray-700 placeholder-gray-400 bg-white outline-none resize-none" />
        <div class="flex items-center justify-between px-3 pb-3 bg-white">
          <div class="flex gap-2 text-gray-400">
            <FileUpload accept="image/*" @file="handleFile" @progress="uploadProgress = $event" @error="toast = $event">
              <Image :size="18" class="transition-colors hover:text-blue-500" />
            </FileUpload>
            <FileUpload accept=".pdf,.txt,image/*" @file="handleFile" @progress="uploadProgress = $event" @error="toast = $event">
              <Paperclip :size="18" class="transition-colors hover:text-blue-500" />
            </FileUpload>
          </div>
          <div class="flex items-center gap-3">
            <button @click="isRecording = true" class="p-1.5 text-gray-400 hover:text-blue-500 transition-colors" title="语音输入">
              <Mic :size="18" />
            </button>
            <button v-if="store.aiReplying" @click="chat.stopReply()"
              class="p-2 text-white transition-all bg-red-500 rounded-full shadow-md hover:bg-red-600 active:scale-95"
              title="停止回复">
              <StopCircle :size="16" />
            </button>
            <button v-else @click="submit" :disabled="!selectedAction && !text.trim() && files.length === 0"
              class="p-2 text-white transition-all bg-blue-500 rounded-full shadow-md disabled:opacity-30 hover:bg-blue-600 active:scale-95">
              <Send :size="16" />
            </button>
          </div>
        </div>
      </div>

      <!-- 附件预览 -->
      <div v-if="files.length" class="flex flex-wrap gap-1.5 mt-2">
        <div v-for="(f, i) in files" :key="i"
          class="flex items-center gap-1 px-2 py-1 bg-blue-50/50 border border-blue-100 rounded-lg text-[10px] text-blue-700">
          <img v-if="f.previewUrl" :src="f.previewUrl" class="object-cover w-4 h-4 rounded" />
          <Paperclip v-else :size="10" />
          <span class="truncate max-w-[80px] font-medium">{{ f.name }}</span>
          <button @click="files.splice(i, 1)" class="text-blue-300 transition-colors hover:text-blue-500">×</button>
        </div>
      </div>

      <p v-if="toast" class="mt-1 text-xs text-red-500">{{ toast }}</p>
      <p v-if="!isWelcome" class="mt-2 text-[10px] text-gray-300 text-center tracking-wider">内容由AI生成，请注意甄别</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Image, Paperclip, Mic, Send, Upload, StopCircle } from 'lucide-vue-next'
import { useChatStore } from '../../stores/chat'
import type { Attachment } from '../../stores/chat'
import { useChat } from '../../composables/useChat'
import QuickActions from '../ui/QuickActions.vue'
import FileUpload from '../ui/FileUpload.vue'
import VoiceRecorder from './VoiceRecorder.vue'
import { uploadAudio, uploadFile } from '../../utils/upload'
import { getAliyunToken, transcribeAudio, getAsrFormat } from '../../api/voice'

defineProps<{
  isWelcome?: boolean
}>()

const chat = useChat()
const store = useChatStore()
const text = ref('')
const selectedAction = ref<{ title: string; words: string } | null>(null)
watch(selectedAction, (action) => {
  text.value = action?.words ?? ''
})
watch(text, (val) => {
  if (!val && selectedAction.value) selectedAction.value = null
})
const files = ref<Attachment[]>([])
const toast = ref('')
const isRecording = ref(false)
const isTranscribing = ref(false)
const isDragging = ref(false)
const uploadProgress = ref<number | null>(null)

function handleFile(f: Attachment) {
  files.value.push(f)
  uploadProgress.value = null
}

async function processFile(file: File) {
  const MAX = 10 * 1024 * 1024
  if (file.size > MAX) {
    toast.value = `文件过大（最大 10MB）：${file.name}`
    return
  }

  uploadProgress.value = 0
  try {
    const url = await uploadFile(file, (p) => {
      const percent = Math.round(p.percent || (p.loaded / p.total) * 100)
      uploadProgress.value = percent
    })

    let previewUrl: string | undefined
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      previewUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
    }

    files.value.push({
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      data: url,
      previewUrl
    })
  } catch (err) {
    toast.value = err instanceof Error ? err.message : '上传失败'
  } finally {
    uploadProgress.value = null
  }
}

async function handleDrop(e: DragEvent) {
  isDragging.value = false
  const droppedFiles = e.dataTransfer?.files
  if (!droppedFiles?.length) return
  
  for (const file of Array.from(droppedFiles)) {
    await processFile(file)
  }
}

async function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  
  for (const item of Array.from(items)) {
    if (item.kind === 'file') {
      const file = item.getAsFile()
      if (file) await processFile(file)
    }
  }
}

async function submit() {
  if (store.aiReplying) return
  const t = text.value.trim()
  if (!t && files.value.length === 0) return
  toast.value = ''
  const att = [...files.value]
  text.value = ''
  selectedAction.value = null
  files.value = []
  await chat.send(t, att)
}

async function handleVoiceFinish(file: File) {
  if (store.aiReplying) return  // AI回复中禁止发送
  if (isTranscribing.value) return  // 防重入
  isRecording.value = false
  isTranscribing.value = true
  toast.value = ''

  // 最小有效录音：< 1KB 视为意外触发
  if (file.size < 1024) {
    toast.value = '录音时间太短，请重试'
    isTranscribing.value = false
    return
  }

  try {
    const format = getAsrFormat(file.type)
    // 并行：上传音频 + 取Token后立即 ASR
    const [audioUrl, asrText] = await Promise.all([
      uploadAudio(file),
      getAliyunToken().then(({ token, appKey }) =>
        transcribeAudio(file, token, appKey, format)
      ),
    ])

    if (!asrText.trim()) {
      toast.value = '未能识别语音内容，请重试'
      return
    }

    await chat.send(asrText, [{
      name: file.name,
      mimeType: file.type,
      data: audioUrl,
    }])
  } catch (err) {
    toast.value = err instanceof Error ? err.message : '语音识别失败，请重试'
  } finally {
    isTranscribing.value = false
  }
}
</script>
