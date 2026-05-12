<template>
  <span>
    <input ref="input" type="file" class="hidden" :accept="accept" @change="onChange" />
    <button
      @click="input?.click()"
      :disabled="uploading"
      class="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    ><slot /></button>
  </span>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Attachment } from '../../stores/chat'
import { uploadFile } from '../../utils/upload'

const MAX = 10 * 1024 * 1024
defineProps<{ accept?: string }>()
const emit = defineEmits<{ file: [Attachment]; error: [string]; progress: [number] }>()
const input = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

async function onChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > MAX) {
    emit('error', `文件过大（最大 10MB）：${file.name}`)
    return
  }

  uploading.value = true
  emit('progress', 0)

  try {
    // 上传文件到腾讯云，获取真实 URL
    const fileUrl = await uploadFile(file, (p) => {
      // p 可能含有 percent (MinIO) 或者直接是进度对象 (COS)
      const percent = Math.round(p.percent || (p.loaded / p.total) * 100)
      emit('progress', percent)
    })

    // 生成预览 URL（图片类型）
    let previewUrl: string | undefined
    let mimeType = file.type
    
    // 如果浏览器没能识别 mimeType，尝试根据后缀名识别
    if (!mimeType) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const mimeMap: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'm4a': 'audio/mp4'
      }
      if (ext && mimeMap[ext]) {
        mimeType = mimeMap[ext]
      }
    }

    if (mimeType.startsWith('image/')) {
      const reader = new FileReader()
      previewUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
    }

    emit('file', {
      name: file.name,
      mimeType: mimeType || 'application/octet-stream',
      data: fileUrl, // 存储真实的 URL 而不是 base64
      previewUrl
    })
  } catch (error) {
    console.error('文件上传失败:', error)
    emit('error', error instanceof Error ? error.message : '文件上传失败，请重试')
  } finally {
    uploading.value = false
    // 重置 input，允许再次选同一文件
    ;(e.target as HTMLInputElement).value = ''
  }
}
</script>
