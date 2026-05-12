<template>
  <div class="flex flex-col h-full bg-white">
    <div v-if="bridge.isVisible.value" class="flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-50/80 border-b border-blue-100/50 backdrop-blur-sm">
      <span class="text-xs font-medium text-blue-600">JClaw 正在与业务界面交互中…</span>
    </div>
    <iframe
      :ref="
        (el) => {
          bridge.iframeRef.value = el as HTMLIFrameElement | null
        }
      "
      :src="businessUrl"
      class="flex-1 w-full border-0"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      @load="onIframeLoad" />
    <!-- 悬浮关闭按钮，固定在窗口最右边垂直居中 -->
    <Teleport to="body">
      <button
        v-if="bridge.isVisible.value"
        @click="bridge.closePanel()"
        style="top: 58px"
        class="fixed right-0 top-1/2 -translate-y-1/2 z-[9999] flex items-center justify-center w-7 h-14 border-r-0 rounded-l-lg rgb(0 0 0) transition-colors"
        title="收起面板">
        <X :size="16" />
      </button>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useIframeBridge } from '../../composables/useIframeBridge'
import { useChatStore } from '../../stores/chat'
import { useAuth } from '../../composables/useAuth'

const bridge = useIframeBridge()
const store = useChatStore()
const auth = useAuth()
const businessUrl = (import.meta.env.VITE_IFRAME_URL as string | undefined) || (import.meta.env.VITE_BUSINESS_SYSTEM_ORIGIN as string | undefined) || ''

// 当 token 发生变化时，如果 iframe 已加载，则同步同步过去
watch(
  auth.token,
  (newToken) => {
    if (newToken) {
      bridge.sendToken(newToken)
    }
  },
  { immediate: true },
)

// iframe 加载完成后的回调：确保 token 已送达
function onIframeLoad() {
  if (auth.token.value) {
    bridge.sendToken(auth.token.value)
  }
}

function onAutoOpen(e: Event) {
  const { modal, data } = (e as CustomEvent<{ modal: string; data: Record<string, unknown> }>).detail
  bridge.openModal(modal, data)
  store.agentRunning = true
}
onMounted(() => window.addEventListener('jclaw:open-modal', onAutoOpen))
onUnmounted(() => window.removeEventListener('jclaw:open-modal', onAutoOpen))

bridge.onSaved((modal, record) => {
  const r = record as { title?: string; id?: string; createdAt?: string }
  const msg = [...store.messages].reverse().find((m) => m.actionJson?.modal === modal)
  if (msg) {
    const date = r.createdAt ? r.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
    msg.content += `\n\n✅ 提交成功！\n📋 ${date} ${r.title ?? modal} [查看]`
  }
  store.agentRunning = false
})

bridge.onCancelled(() => {
  store.agentRunning = false
})
</script>
