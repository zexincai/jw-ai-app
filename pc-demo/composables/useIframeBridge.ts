/**
 * 模块级单例 iframe 桥接 — iframeRef 在 BusinessPanel 中绑定，
 * 其他组件调用 openModal 时共享同一引用
 */
import { ref } from 'vue'
import { useChat } from './useChat'

type SavedHandler = (modal: string, record: unknown) => void
type CancelledHandler = (modal: string) => void

const ORIGIN = (import.meta.env.VITE_BUSINESS_SYSTEM_ORIGIN as string | undefined) ?? ''

// 模块级单例
const iframeRef = ref<HTMLIFrameElement | null>(null)
const isVisible = ref(false)
const savedHandlers = new Set<SavedHandler>()
const cancelledHandlers = new Set<CancelledHandler>()
let listenerAttached = false
let cachedToken = ''

function attachListener() {
  if (listenerAttached) return
  listenerAttached = true
  window.addEventListener('message', (e: MessageEvent) => {
    const data = e.data as { type?: string; modal?: string; record?: unknown; origin?: string; text?: string; message?: string; mode?: string }
    if (!data?.type) return
    if (data.origin === 'JWKJ') {
      console.log('Received message from JWKJ:', data)
      if (data.type === 'INIT') {
        console.log('Received INIT from iframe, sending token if available')
        if (cachedToken) sendToken(cachedToken)
      } else if (data.type === 'JCLAW_MODAL_SAVED') {
        // 监听类 1：用户点击操作类 — 用户保存表单
        savedHandlers.forEach(h => h(data.modal!, data.record))
      } else if (data.type === 'JCLAW_MODAL_CANCELLED') {
        // 监听类 1：用户点击操作类 — 用户取消弹窗
        cancelledHandlers.forEach(h => h(data.modal!))
      } else if (data.type === 'SEND') {
        // 监听类 3：用户输入类 — 根据 mode 决定发送行为
        // mode: 'full'         → 用户端保存记录，发送IM，收到IM后保存AI记录（默认）
        // mode: 'im_only'      → 用户端不保存记录，发送IM，收到IM后不保存AI记录
        // mode: 'im'           → 用户端不保存记录，发送IM，收到IM后保存AI记录
        // mode: 'session_only' → 用户端保存记录，不发送IM
        if (data.message) {
          console.log('Received SEND message:', data)
          const { send } = useChat()
          const validModes = ['full', 'im_only', 'im', 'session_only'] as const
          type SendMode = typeof validModes[number]
          const mode: SendMode = validModes.includes(data.mode as SendMode) ? (data.mode as SendMode) : 'full'
          send(data.message, [], mode, true)
          if (mode === 'im') {
            // 关闭iframe面板，避免用户重复发送消息
            closePanel()
          }
        }
      }
    }

  })
}

function plain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function openModal(modal: string, data: Record<string, unknown>) {
  attachListener()
  isVisible.value = true
  iframeRef.value?.contentWindow?.postMessage(
    plain({ type: 'JCLAW_OPEN_MODAL', modal, data, origin: 'JCLAW', access_token: cachedToken }),
    ORIGIN || '*'
  )
}

function closePanel() {
  isVisible.value = false
  // 如果左边的收起状态 则展开
}

function navigate(params: { menuPath: string; menuButtonCode: string; operateType: number }) {
  attachListener()
  isVisible.value = true
  iframeRef.value?.contentWindow?.postMessage(
    plain({ type: 'JCLAW_NAVIGATE', ...params, origin: 'JCLAW', access_token: cachedToken }),
    ORIGIN || '*'
  )
}

function onSaved(handler: SavedHandler) {
  attachListener()
  savedHandlers.add(handler)
  return () => savedHandlers.delete(handler)
}

function onCancelled(handler: CancelledHandler) {
  cancelledHandlers.add(handler)
  return () => cancelledHandlers.delete(handler)
}
/** AI 回复中包含 ```javascript ... ``` 代码块时，提取内容发给 iframe（JCLAW_JS_CODE） */
function relayJsCode(code: string) {
  if (!iframeRef.value?.contentWindow) return
  iframeRef.value.contentWindow.postMessage(
    plain({ type: 'JCLAW_JS_CODE', code, origin: 'JCLAW', access_token: cachedToken }),
    ORIGIN || '*'
  )
}

/** AI 回复到达时，同步通知 iframe（JCLAW_AI_RESPONSE） */
function relayAIResponse(content: string, thinking?: string) {
  if (!iframeRef.value?.contentWindow) return
  iframeRef.value.contentWindow.postMessage(
    plain({ type: 'JCLAW_AI_RESPONSE', message: content, thinking, origin: 'JCLAW', access_token: cachedToken }),
    ORIGIN || '*'
  )
}

/** 用户在聊天区发送消息时，同步通知 iframe（JCLAW_USER） */
function relayUserMessage(message: string) {
  if (!iframeRef.value?.contentWindow) return
  iframeRef.value.contentWindow.postMessage(
    plain({ type: 'JCLAW_USER', message, origin: 'JCLAW', access_token: cachedToken }),
    ORIGIN || '*'
  )
}

function dispatchAction(payload: unknown) {
  console.log('Dispatching action to iframe with payload:', payload)
  attachListener()
  isVisible.value = true
  iframeRef.value?.contentWindow?.postMessage(
    plain({ type: 'JCLAW_ACTION', ...(payload || {}), origin: "JCLAW", access_token: cachedToken, mobileType: 6 }),
    ORIGIN || '*'
  )
}

function sendToken(token: string) {
  if (!token) return
  cachedToken = token
  iframeRef.value?.contentWindow?.postMessage(
    plain({ type: 'JCLAW_SET_TOKEN', access_token: token, origin: 'JCLAW' }),
    ORIGIN || '*'
  )
}

export function useIframeBridge() {
  return { iframeRef, isVisible, openModal, closePanel, navigate, onSaved, onCancelled, dispatchAction, sendToken, relayUserMessage, relayAIResponse, relayJsCode }
}
