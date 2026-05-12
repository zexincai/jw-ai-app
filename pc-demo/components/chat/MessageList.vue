<template>
  <div ref="listEl" class="overflow-y-auto overflow-x-hidden scrollbar-hover-thin px-4 py-4 space-y-1">
    <!-- 重连 / 断连横幅 -->
    <div v-if="store.wsStatus === 'disconnected' && !store.wsMaxRetries"
      class="sticky top-0 z-10 mb-3 py-1.5 px-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700 text-center">
      连接断开，正在重连…
    </div>
    <div v-if="store.wsMaxRetries"
      class="sticky top-0 z-10 mb-3 py-1.5 px-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 text-center">
      无法连接，请检查 OpenClaw 是否运行
    </div>

    <MessageBubble v-for="msg in store.activeSessionMessages()" :key="msg.id" :message="msg"
      @retry="chat.send(msg.content, msg.attachments)"
      @open-modal="(action) => bridge.openModal(action.modal, action.data)"
      @image-loaded="onImageLoaded" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted } from 'vue'
import { useChatStore } from '../../stores/chat'
import { useChat } from '../../composables/useChat'
import { useIframeBridge } from '../../composables/useIframeBridge'
import MessageBubble from './MessageBubble.vue'

const store = useChatStore()
const chat = useChat()
const bridge = useIframeBridge()
const listEl = ref<HTMLDivElement | null>(null)

// 组件挂载时，如果已有消息则滚动到底部
onMounted(async () => {
  if (store.activeSessionMessages().length > 0) {
    await nextTick()
    setTimeout(() => scrollToBottom('auto'), 100)
  }
})

/**
 * 检查是否处于底部附近
 * 阈值设为 100px 以确保在流式输出时有较好的容错性
 */
const isAtBottom = () => {
  if (!listEl.value) return false
  const { scrollTop, scrollHeight, clientHeight } = listEl.value
  return scrollHeight - scrollTop - clientHeight < 100
}

const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
  if (!listEl.value) return
  listEl.value.scrollTo({
    top: listEl.value.scrollHeight,
    behavior
  })
}

// 监听消息数量变化（新消息产生时，强制滚动到底部）
watch(() => store.messages.length, async () => {
  await nextTick()
  scrollToBottom('smooth')
})

// 监听当前会话的消息列表变化（切换会话或加载历史消息时滚动到底部）
watch(() => store.activeSessionMessages().length, async (newLen, oldLen) => {
  console.log('消息数量变化:', { newLen, oldLen })
  // 只在消息列表从空变为有内容，或者消息数量发生变化时滚动
  if (newLen > 0 && newLen !== oldLen) {
    await nextTick()
    // 使用 setTimeout 确保 DOM 完全渲染后再滚动
    setTimeout(() => {
      console.log('执行滚动到底部')
      scrollToBottom('auto')
    }, 50)
  }
})

// 监听最后一条 AI 消息内容的变化（用于流式输出时自动跟进滚动）
const lastMessageContent = computed(() => {
  const msgs = store.activeSessionMessages()
  if (msgs.length === 0) return ''
  const last = msgs[msgs.length - 1]
  // 只有当最后一条消息是助手且正在 streaming 时才触发内容监听
  return last.role === 'assistant' && last.status === 'streaming'
    ? (last.content + (last.thinking || ''))
    : ''
})

watch(lastMessageContent, async (newVal) => {
  if (!newVal) return

  // 如果在内容更新前用户就在底部，则继续保持在底部
  if (isAtBottom()) {
    await nextTick()
    scrollToBottom('auto') // 流向更新使用 'auto' 性能更好，避免平滑滚动带来的延迟感
  }
})

// 监听最后一条消息状态变化，回复完成时滚动到底部
const lastMessageStatus = computed(() => {
  const msgs = store.activeSessionMessages()
  if (msgs.length === 0) return ''
  return msgs[msgs.length - 1].status
})

watch(lastMessageStatus, async (newStatus) => {
  if (newStatus === 'done') {
    await nextTick()
    scrollToBottom('smooth')
  }
})

// 图片加载完成后滚动到底部
const onImageLoaded = async () => {
  await nextTick()
  scrollToBottom('smooth')
}
</script>
