<template>
  <!-- 用户消息：右对齐粉色气泡 + 用户头像 -->
  <div v-if="message.role === 'user'" class="flex items-start justify-end gap-2 mb-3">
    <div class="max-w-[75%] flex flex-col items-end gap-1">
      <!-- 附件缩略图（图片） -->
      <div v-if="message.attachments?.length" class="flex flex-wrap justify-end gap-1">
        <template v-for="att in message.attachments" :key="att.name">
          <img
            v-if="att.mimeType.startsWith('image/')"
            :src="att.data"
            @click="openImagePreview(att.data)"
            @load="emit('image-loaded')"
            class="max-w-[160px] max-h-[120px] rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
            :alt="att.name"
          />
          <AudioPlayer
            v-else-if="att.mimeType.startsWith('audio/')"
            :src="att.data"
          />
          <div
            v-else
            @click="openFile(att.data)"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 hover:bg-white border border-gray-100 rounded-lg text-xs text-gray-700 cursor-pointer transition-all hover:shadow-sm active:scale-95 select-none"
            title="点击预览"
          >
            <Paperclip :size="12" class="text-blue-500" />
            <span class="max-w-[120px] truncate">{{ att.name }}</span>
            <ExternalLink :size="10" class="text-gray-400 group-hover:text-blue-500" />
          </div>
        </template>
      </div>
      <!-- 文字气泡 -->
      <div v-if="message.content" class="px-4 py-2.5 bg-pink-100 rounded-2xl rounded-tr-sm text-sm text-gray-800">
        <MarkdownContent :content="message.content" />
      </div>
      <div v-if="message.status === 'error'" class="flex items-center gap-1 text-xs text-red-500">
        <AlertCircle :size="10" /> 发送失败
        <button @click="emit('retry')" class="underline">重试</button>
      </div>
    </div>
    <!-- 用户头像 -->
    <div
      class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0 mt-0.5">
      我
    </div>
  </div>

  <!-- AI 消息：左对齐白色卡片 + 角色头像 -->
  <div v-else class="flex items-start gap-2 mb-4 max-w-[85%]">
    <div class="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5 border border-gray-100 shadow-sm"
      :title="projectName">
      <img :src="logoUrl" class="object-cover w-full h-full" />
    </div>
    <div class="flex flex-col min-w-0">
      <!-- <span class="mb-1 text-xs text-gray-400">Assistant{{ projectName }}</span> -->
      <div class="px-4 py-3 bg-white border border-gray-100 rounded-tl-sm shadow-sm rounded-2xl">
        <ThinkingBlock v-if="message.thinking" :content="message.thinking"
          :streaming="message.status === 'streaming'" />
        <MarkdownContent :content="message.content || ''" :streaming="message.status === 'streaming'" :disabled="store.aiReplying" />
        <!-- <ActionCard v-if="message.actionJson && !message.actionJson.autoOpen" :modal="message.actionJson.modal"
          @trigger="emit('open-modal', message.actionJson!)" /> -->
        <div v-if="message.platformActions?.length" class="flex flex-wrap gap-2 mt-1">
          <ActionTagButton v-for="(act, i) in message.platformActions" :key="i" :action="act" :disabled="store.aiReplying" />
        </div>
      </div>
      <!-- 第一条消息 <MSG_SPLIT> 后半段竖向展示 -->
      <div v-if="message.splitContents?.length" class="flex flex-col gap-2 mt-2">
        <div v-for="(item, idx) in message.splitContents" :key="idx">
          <template v-for="(action) in parseSplitAction(item)" :key="ai">
            <div
              class="px-3 py-1 mb-2 text-sm text-gray-600 transition-colors border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 w-max"
              @click="chat.send(action.userInput); clearSplit(message.id)">
              {{ action.label }}
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>

  <!-- 图片预览弹窗 -->
  <Teleport to="body">
    <div
      v-if="previewImage"
      @click="previewImage = null"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 cursor-zoom-out"
    >
      <img
        :src="previewImage"
        class="object-contain max-w-full max-h-full"
        @click.stop
      />
      <button
        @click="previewImage = null"
        class="absolute flex items-center justify-center w-10 h-10 text-2xl text-white transition-colors rounded-full top-4 right-4 bg-white/10 hover:bg-white/20"
      >
        ×
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { AlertCircle, Paperclip, ExternalLink } from 'lucide-vue-next'
import type { Message, ActionPayload } from '../../stores/chat'
import { useChatStore } from '../../stores/chat'
import ThinkingBlock from './ThinkingBlock.vue'
import ActionTagButton from './ActionTagButton.vue'
import MarkdownContent from './MarkdownContent.vue'
import AudioPlayer from '../ui/AudioPlayer.vue'
import logoUrl from '../../assets/logo.png'
import { useChat } from '../../composables/useChat'

const chat = useChat()

defineProps<{ message: Message }>()
const emit = defineEmits<{ retry: []; 'open-modal': [action: ActionPayload]; 'image-loaded': [] }>()

const store = useChatStore()
const projectName = computed(() => store.activeProject()?.name ?? '')
const previewImage = ref<string | null>(null)

function openImagePreview(url: string) {
  previewImage.value = url
}

function openFile(url: string) {
  window.open(url, '_blank')
}

function clearSplit(msgId: string) {
  const msg = store.messages.find(m => m.id === msgId)
  if (msg) msg.splitContents = []
}

interface SplitAction { label: string; userInput: string }

function parseSplitAction(raw: string): SplitAction[] {
  const results: SplitAction[] = []
  const re = /<pcAction>([\s\S]*?)<\/pcAction>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim())
      if (parsed.label) results.push({ label: parsed.label, userInput: parsed.userInput || parsed.label })
    } catch { /* ignore */ }
  }
  return results
}
</script>
