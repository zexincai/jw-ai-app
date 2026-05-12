/**
 * 悟空IM SDK 封装 — 替代 OpenClaw WebSocket 连接
 * 连接地址通过 /eng/chat/getChatIMLongConnection 获取
 */
import { ref } from 'vue'
import { WKSDK, MessageText, MessageContent, MessageContentManager, Channel, ChannelTypePerson } from 'wukongimjssdk'
import { getChatIMLongConnection } from '../api/agent'

// ── 自定义消息类型 ───────────────────────────────
const JCLAW_CONTENT_TYPE = 1007

class JClawMessageContent extends MessageContent {
  text: string = ''
  requestId: string = ''

  get contentType(): number {
    return JCLAW_CONTENT_TYPE
  }
  get conversationDigest(): string {
    return this.text
  }

  encodeJSON(): any {
    return { content: this.text, requestId: this.requestId }
  }

  decodeJSON(content: any): void {
    this.text = content?.content ?? content?.text ?? ''
    this.requestId = content?.requestId ?? ''
  }
}

MessageContentManager.shared().register(JCLAW_CONTENT_TYPE, () => new JClawMessageContent())
// ────────────────────────────────────────────────

// sourceType: 3 = 智能体-pc端
const SOURCE_TYPE = 3

// ── 模块级单例状态 ──────────────────────────────
const status = ref<'connecting' | 'connected' | 'disconnected'>('disconnected')
let linkStatus = 0 // WKSDK 原始连接状态，1 = 已连接
let currentTelephone = ''
type IncomingMsgHandler = (message: unknown) => void
const messageHandlers = new Set<IncomingMsgHandler>()

export type StatusPacket = { clientSeq: number; messageSeq: number; reasonCode: number }
type StatusHandler = (packet: StatusPacket) => void
const statusHandlers = new Set<StatusHandler>()
// ────────────────────────────────────────────────

function _connectStatusListener(s: number, _reasonCode: number) {
  linkStatus = s
  status.value = s === 1 ? 'connected' : 'disconnected'
}

function _messageListener(message: unknown) {
  console.log('[WukongIM] 收到原始消息', message)
  messageHandlers.forEach((h) => h(message))
}

function _statusListener(packet: any) {
  console.log('[WukongIM] 消息状态', packet)
  statusHandlers.forEach(h => h({
    clientSeq: packet.clientSeq,
    messageSeq: packet.messageSeq,
    reasonCode: packet.reasonCode,
  }))
}

export function useWukongIM() {
  async function connect(userId: string, telephone: string, token: string) {
    try {
      if (linkStatus === 1) return
      status.value = 'connecting'
      const res = await getChatIMLongConnection({ sourceType: SOURCE_TYPE })
      const { modelType, wsAddr } = (res as any).data as { modelType: number; wsAddr: string }
      if (modelType === 2) {
        WKSDK.shared().config.provider.connectAddrCallback = async (callback: (addr: string) => void) => {
          callback(wsAddr)
        }
      } else {
        WKSDK.shared().config.addr = wsAddr
      }
      currentTelephone = telephone
      WKSDK.shared().config.uid = userId
      WKSDK.shared().config.token = token

      WKSDK.shared().connectManager.addConnectStatusListener(_connectStatusListener)
      WKSDK.shared().chatManager.addMessageListener(_messageListener)
      WKSDK.shared().chatManager.addMessageStatusListener(_statusListener)
      WKSDK.shared().connectManager.connect()
    } catch (err) {
      status.value = 'disconnected'
      console.error('[WukongIM] 连接失败', err)
    }
  }

  /** 断开连接并清理监听器 */
  function disconnect() {
    WKSDK.shared().chatManager.removeMessageListener(_messageListener)
    WKSDK.shared().chatManager.removeMessageStatusListener(_statusListener)
    WKSDK.shared().connectManager.removeConnectStatusListener(_connectStatusListener)
    WKSDK.shared().connectManager.disconnect()
    linkStatus = 0
    currentTelephone = ''
    status.value = 'disconnected'
  }

  function sendText(text: string) {
    const msg = new MessageText(text)
    const channel = new Channel(currentTelephone, ChannelTypePerson)
    return WKSDK.shared().chatManager.send(msg, channel)
  }

  function sendCustom(text: string, requestId: string) {
    const msg = new JClawMessageContent()
    msg.text = text
    msg.requestId = requestId
    const channel = new Channel(currentTelephone, ChannelTypePerson)
    return WKSDK.shared().chatManager.send(msg, channel)
  }

  /**
   * 注册消息监听器，返回取消监听的函数
   */
  function onMessage(handler: IncomingMsgHandler) {
    messageHandlers.add(handler)
    return () => messageHandlers.delete(handler)
  }

  function onMessageStatus(handler: StatusHandler) {
    statusHandlers.add(handler)
    return () => statusHandlers.delete(handler)
  }

  return { status, connect, disconnect, sendText, sendCustom, onMessage, onMessageStatus }
}
