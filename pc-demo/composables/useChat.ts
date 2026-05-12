/**
 * 聊天业务逻辑 — 使用悟空IM SDK 作为消息传输层
 */
import { useChatStore } from '../stores/chat'
import type { Message, ActionPayload, Attachment, PlatformAction, Session } from '../stores/chat'
import { useWukongIM } from './useWukongIM'
import { useAuth } from './useAuth'
import { useIframeBridge } from './useIframeBridge'
import { useBacklog } from './useBacklog'
import { addChat, addChatRecordData, deleteAgent, getUserAccountChatList, chatRecordDataSearchPage, type BacklogItemVo } from '../api/agent'

function safeJsonParse(str: string): unknown {
  try { return JSON.parse(str.replace(/(\d{16,})/g, '"$1"')) } catch { return undefined }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

let initialized = false
let streamingId: string | null = null
let currentChatId: number | null = null
type SendMode = 'full' | 'im_only' | 'im' | 'session_only'
interface PendingReply { requestId: number; streamingId: string | null; sessionId: string; mode: SendMode; iframeRelay: boolean; chatId: number | null; pkId?: number; onComplete?: () => void }
// replyMessageSeq 关联：clientSeq → PendingReply → messageSeq → PendingReply
const clientSeqToReply = new Map<number, PendingReply>()
const messageSeqToReply = new Map<number, PendingReply>()
const REPLY_SEQ_PREFIX_RE = /^\s*(?:\[replyMessageSeq=(\d+)\]|<replyMessageSeq>(\d+)<\/replyMessageSeq>)\s*/i
let replyRequestSeed = 0
let activeReplyRequestId: number | null = null
const stoppedReplyRequestIds = new Set<number>()
let _store: ReturnType<typeof useChatStore> | null = null
/** messageType===1 待办的 IM 发送队列（一条条顺序发送）*/
const privateItemQueue: Array<import('../api/agent').BacklogItemVo> = []
let processingPrivateQueue = false

interface IframeNavigateAction {
  isSkip: boolean
  operateType: number
  menuPath: string
  menuButtonCode: string
}

function parseJsonBlock(content: string): Record<string, unknown> | undefined {
  const match = content.match(/```json\s*([\s\S]*?)```/)
  if (!match) return undefined
  try { return safeJsonParse(match[1]) as Record<string, unknown> } catch { return undefined }
}

function extractJsBlock(content: string): string | undefined {
  const match = content.match(/```javascript\s*([\s\S]*?)```/)
  return match ? match[1].trim() : undefined
}

function stripJsBlock(content: string): string {
  return content.replace(/```javascript\s*[\s\S]*?```/g, '').trim()
}

function extractAction(content: string): ActionPayload | undefined {
  const parsed = parseJsonBlock(content)
  return parsed?.action === 'open_modal' ? parsed as unknown as ActionPayload : undefined
}

function extractIframeAction(content: string): IframeNavigateAction | undefined {
  const parsed = parseJsonBlock(content)
  if (parsed && typeof parsed.isSkip === 'boolean' && parsed.menuPath) {
    return parsed as unknown as IframeNavigateAction
  }
  return undefined
}

function stripActionJson(content: string): string {
  return content.replace(/```json[\s\S]*?```/g, '').trim()
}

function stripSystemBlock(content: string): string {
  return content.replace(/<system>[\s\S]*?<\/system>\n*/gi, '').trim()
}


function stripThinkingTags(text: string): string {
  return text
    .replace(/<\s*think(?:ing)?\s*>[\s\S]*?<\s*\/\s*think(?:ing)?\s*>/gi, '')
    .trim()
}

function extractThinking(text: string): string {
  const match = text.match(/<\s*think(?:ing)?\s*>([\s\S]*?)<\s*\/\s*think(?:ing)?\s*>/i)
  return match ? match[1].trim() : ''
}

/** 平台检测 */
function detectPlatform(): 'pc' | 'app' | 'desk' {
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__ELECTRON__) return 'desk'
  if (typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)) return 'app'
  return 'pc'
}

/** 检测是否为360浏览器（其安全过滤器会剥离 HTML-like 标签） */
function is360Browser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /360SE|360EE|QIHU/i.test(navigator.userAgent)
}

/** 提取当前平台的所有 action 标签，支持 <pcAction> 和 [pcAction] 两种格式 */
function extractPlatformActions(content: string): PlatformAction[] {
  const tagMap = { pc: 'pcAction', app: 'appAction', desk: 'deskAction' }
  const platformTag = tagMap[detectPlatform()]
  const tagsToTry = [platformTag, ...Object.values(tagMap).filter(t => t !== platformTag)]

  for (const tag of tagsToTry) {
    const patterns = [
      new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'gi'),
      new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'gi'),
    ]
    for (const re of patterns) {
      const actions: PlatformAction[] = []
      let match: RegExpExecArray | null
      while ((match = re.exec(content)) !== null) {
        try {
          const parsed = safeJsonParse(match[1].trim()) as Record<string, unknown> | undefined
          if (parsed?.label) actions.push({ label: String(parsed.label), payload: parsed })
        } catch { /* ignore */ }
      }
      if (actions.length > 0) return actions
    }
  }
  return []
}

/** 判断 action 标签是否出现在 Markdown 表格行中 */
function hasActionInTableCell(content: string): boolean {
  const tagPattern = /<pcAction>|<appAction>|<deskAction>|\[pcAction\]|\[appAction\]|\[deskAction\]/i
  return content.split('\n').some(line => line.trim().startsWith('|') && tagPattern.test(line))
}

/** 剥离所有平台 action 标签（同时支持 <tag> 和 [tag] 两种格式） */
function stripAllActionTags(content: string): string {
  return content
    .replace(/<pcAction>[\s\S]*?<\/pcAction>/gi, '')
    .replace(/<appAction>[\s\S]*?<\/appAction>/gi, '')
    .replace(/<deskAction>[\s\S]*?<\/deskAction>/gi, '')
    .replace(/\[pcAction\][\s\S]*?\[\/pcAction\]/gi, '')
    .replace(/\[appAction\][\s\S]*?\[\/appAction\]/gi, '')
    .replace(/\[deskAction\][\s\S]*?\[\/deskAction\]/gi, '')
    .trim()
}

function extractReplySeq(text: string): number | null {
  const match = text.match(REPLY_SEQ_PREFIX_RE)
  if (!match) return null
  return Number(match[1] ?? match[2])
}

/** 从 WKSDK message 对象中提取文本，并剥离 AI 回复前缀 */
function extractText(message: unknown): string {
  if (!message || typeof message !== 'object') return ''
  const msg = message as { content?: unknown; text?: string }
  const content = msg.content as any
  let text = ''
  if (content && typeof content.content === 'string') text = content.content
  else if (content && typeof content.text === 'string') text = content.text
  else if (typeof content === 'string') text = content
  else if (typeof msg.text === 'string') text = msg.text
  return text.replace(REPLY_SEQ_PREFIX_RE, '')
}

function persistMessage(msg: Message) {
  if (msg.role === 'assistant' && !msg.content.trim() && !msg.thinking?.trim() && !msg.platformActions?.length && !msg.actionJson) {
    return
  }
  const key = `jclaw_msgs_${msg.sessionId}`
  try {
    const existing: Message[] = safeJsonParse(localStorage.getItem(key) ?? '[]') as Message[] || []
    const idx = existing.findIndex(m => m.id === msg.id)
    if (idx >= 0) existing[idx] = msg; else existing.push(msg)
    localStorage.setItem(key, JSON.stringify(existing))
  } catch { /* ignore */ }
}

/** 处理收到的 AI 响应消息 */
function handleIncomingAIMessage(store: ReturnType<typeof useChatStore>, bridge: ReturnType<typeof useIframeBridge>, rawText: string, resolvedPending?: PendingReply) {
  const thinking = extractThinking(rawText)
  const text = stripThinkingTags(rawText)

  const pending = resolvedPending
  const msgMode = pending?.mode ?? 'full'
  const shouldRelayToIframe = pending?.iframeRelay ?? false
  const pendingStreamId = pending?.streamingId ?? null
  const msgChatId = pending?.chatId ?? null

  const msgId = pendingStreamId || uuid()

  // 优先提取 <MSG_SPLIT> 后的内容作为 splitContents
  let splitContents: string[] | undefined
  let cleanedContent = text
  const splitIdx = cleanedContent.indexOf('<MSG_SPLIT>')
  if (splitIdx >= 0) {
    const after = cleanedContent.substring(splitIdx + '<MSG_SPLIT>'.length).trim()
    splitContents = [after]
    cleanedContent = cleanedContent.substring(0, splitIdx).trim()
  }

  // 平台 Action 标签（基于去掉 <MSG_SPLIT> 后的内容）
  const platformActions = extractPlatformActions(cleanedContent)
  const hasPlatformActions = platformActions.length > 0
  const actionsInTable = hasPlatformActions && hasActionInTableCell(cleanedContent)
  // iframe 跳转指令
  const iframeAction = !hasPlatformActions ? extractIframeAction(cleanedContent) : undefined
  console.log('platformActions', platformActions, 'iframeAction', iframeAction)
  // 如果platformActions有值，找到第一个数据中isSkip为true时，调用 dispatchIframeAction 方法
  if (platformActions.length > 0) {
    const action = platformActions.find((action: any) => action?.payload?.isSkip === true)
    if (action) {
      const bridge = useIframeBridge()
      bridge.dispatchAction(action.payload)
    }
  }
  // open_modal 指令
  const action = !hasPlatformActions && !iframeAction ? extractAction(cleanedContent) : undefined

  // 进一步清理 action 标签和 JS 代码块
  cleanedContent = stripJsBlock(hasPlatformActions
    ? (actionsInTable ? cleanedContent : stripAllActionTags(cleanedContent))
    : (iframeAction || action)
      ? stripActionJson(cleanedContent)
      : cleanedContent)

  const msg: Message = {
    id: msgId,
    sessionId: pending?.sessionId ?? store.activeSessionId,
    role: 'assistant',
    content: cleanedContent,
    thinking: thinking || undefined,
    status: 'done',
    createdAt: new Date().toISOString(),
    // 表格内联 action 已由 MarkdownContent 渲染，不重复设置 platformActions
    ...(!actionsInTable && hasPlatformActions ? { platformActions } : {}),
    ...(action ? { actionJson: action } : {}),
    ...(splitContents ? { splitContents } : {}),
  }

  // im_only 不显示 AI 回复 UI，其余模式替换占位或追加
  if (msgMode !== 'im_only') {
    const existingIdx = store.messages.findIndex(m => m.id === pendingStreamId)
    if (existingIdx >= 0) {
      store.messages[existingIdx] = msg
    } else {
      store.messages.push(msg)
    }
    persistMessage(msg)
  }

  // 保存 AI 消息到后端（im_only 模式不保存，剥离 JS 代码块）
  if (text && msgChatId && msgMode !== 'im_only') {
    addChatRecordData({
      fkChatId: msgChatId,
      chatContent: stripJsBlock(text),
      chatObject: '1',
    }).catch(() => { })
  }

  // iframe 跳转
  if (iframeAction?.isSkip) {
    bridge.navigate({
      menuPath: iframeAction.menuPath,
      menuButtonCode: iframeAction.menuButtonCode,
      operateType: iframeAction.operateType,
    })
  }

  // open_modal 自动弹窗
  if (action?.autoOpen) {
    window.dispatchEvent(new CustomEvent('jclaw:open-modal', {
      detail: { modal: action.modal, data: action.data }
    }))
  }

  if (!pendingStreamId || pendingStreamId === streamingId) {
    streamingId = null
    if (pending && activeReplyRequestId === pending.requestId) activeReplyRequestId = null
    if (_store) _store.aiReplying = false
  }

  // im_only 始终 relay 到 iframe；其他模式仅当来自 iframe 时 relay
  if ((msgMode === 'im_only' || shouldRelayToIframe) && msg.content) {
    bridge.relayAIResponse(msg.content, msg.thinking)
  }

  // 提取 ```javascript ... ``` 代码块并发给 iframe
  const jsCode = extractJsBlock(rawText)
  if (jsCode) bridge.relayJsCode(jsCode)

  // messageType===1 队列：将 AI 回复存入 item.quickLobsterWords，然后揭示到列表
  if (pending?.pkId != null) {
    const backlog = useBacklog()
    backlog.updatePrivateItemReply(pending.pkId, rawText)
    backlog.revealPrivateItem(pending.pkId)
  }
  pending?.onComplete?.()
}

export function useChat() {
  const store = useChatStore()
  _store = store
  const wkIM = useWukongIM()
  const auth = useAuth()

  /**
   * 将缓存中属于当前登录角色的 messageType===1 待办项加入队列，逐条发送给 IM。
   * 每条发送后等待 AI 回复，回复到来后揭示到列表再发下一条。
   */
  async function autoSendPrivateItems() {
    const { getUnsentPrivateItems, markPrivateItemsSent, typeItemsMap } = useBacklog()
    const currentUserId = String(auth.currentRole.value?.userId ?? '')
    console.log('[Private] autoSendPrivateItems 触发，当前账号 userId:', currentUserId)
    console.log('[Private] typeItemsMap[1] 全部数据:', typeItemsMap.value[1])
    const items = getUnsentPrivateItems([currentUserId])
    console.log('[Private] getUnsentPrivateItems 结果:', items.length, '条', items.map(i => ({ pkId: i.pkId, fkUserId: i.fkUserId })))
    if (!items.length) {
      console.log('[Private] 无待发送项，退出')
      return
    }

    // 先标记已加入队列，防止重复添加（按 userId 持久化到 localStorage）
    markPrivateItemsSent(items.filter(i => i.pkId != null))

    for (const item of items) privateItemQueue.push(item)
    console.log('[Private] 已加入队列，当前队列长度:', privateItemQueue.length, '，processingPrivateQueue:', processingPrivateQueue)

    if (!processingPrivateQueue) _processPrivateQueue()
  }

  /** 内部：按队列顺序逐条发送 messageType===1 待办到 IM */
  async function _processPrivateQueue() {
    if (processingPrivateQueue) return
    processingPrivateQueue = true
    console.log('[Private] 开始处理队列，共', privateItemQueue.length, '条')
    while (privateItemQueue.length > 0) {
      const item = privateItemQueue.shift()!
      console.log('[Private] 处理队列项 pkId:', item.pkId, 'title:', item.title)
      await _sendPrivateItemToIM(item)
      console.log('[Private] pkId:', item.pkId, '已收到 AI 回复，继续下一条')
    }
    processingPrivateQueue = false
    console.log('[Private] 队列处理完毕')
  }

  /** 内部：发送单条 messageType===1 待办到 IM，返回 Promise 在 AI 回复后 resolve */
  function _sendPrivateItemToIM(item: import('../api/agent').BacklogItemVo): Promise<void> {
    return new Promise<void>((resolve) => {
      const rawText = item.quickWords || ''
      if (!rawText) {
        console.log('[Private] pkId:', item.pkId, 'quickWords 为空，跳过发送')
        resolve()
        return
      }
      const { clean } = extractPromptQuick(rawText)
      const role = auth.currentRole.value
      const actionFormatHint = is360Browser() ? ' action-tag-format: bracket ' : ''
      const sysLines = [
        role?.userRolePrompt || '',
        ` operate-port: 2 ${actionFormatHint}`,
        auth.token.value ? `用户令牌：${auth.token.value}` : '',
      ].filter(Boolean).join('\n')
      const sysBlock = sysLines ? `<system>\n${sysLines}\n</system>\n\n` : ''
      console.log('[Private] 发送 IM，pkId:', item.pkId, '内容长度:', clean.length)
      const pending: PendingReply = {
        requestId: ++replyRequestSeed,
        streamingId: null,
        sessionId: store.activeSessionId,
        mode: 'im_only',
        iframeRelay: false,
        chatId: null,
        pkId: item.pkId ?? undefined,
        onComplete: resolve,
      }
      wkIM.sendText(sysBlock + clean).then((e: any) => {
        console.log('[Private] wkIM.sendText 返回:', e)
        if (e?.clientSeq && !stoppedReplyRequestIds.has(pending.requestId)) {
          clientSeqToReply.set(e.clientSeq, pending)
          console.log('[Private] clientSeq', e.clientSeq, '已映射 pending pkId:', item.pkId)
        } else {
          console.warn('[Private] 发送失败或无 clientSeq，直接推进队列，e:', e)
          resolve()
        }
      }).catch((err: unknown) => {
        console.error('[Private] wkIM.sendText 异常:', err)
        resolve()
      })
    })
  }

  // 只初始化一次全局消息监听
  if (!initialized) {
    initialized = true
    const bridge = useIframeBridge()

    // 监听发送状态：clientSeq → messageSeq，建立 replyMessageSeq 映射
    wkIM.onMessageStatus(({ clientSeq, messageSeq, reasonCode }) => {
      const reply = clientSeqToReply.get(clientSeq)
      clientSeqToReply.delete(clientSeq)
      if (reasonCode === 1 && reply && !stoppedReplyRequestIds.has(reply.requestId)) {
        messageSeqToReply.set(messageSeq, reply)
        console.log('[Chat] 发送成功，messageSeq:', messageSeq, '→ streamingId:', reply.streamingId)
      }
    })

    // 监听来自悟空IM的消息
    wkIM.onMessage((rawMsg: unknown) => {
      console.log('rawMsg', rawMsg)
      const msg = rawMsg as { fromUID?: string; contentType?: number; content?: any }
      const currentUser = auth.currentRole.value
      if (!currentUser) return
      if (msg.content?.contentType == 1006 || msg?.contentType === 1006) {
        useBacklog().fetchTypeTotals()
        return
      }
      if (msg.fromUID === `${currentUser.userId}`) return
      if (msg.contentType !== 1 && msg.contentType !== 103 && msg.contentType !== 101) return
      // 解析 [replyMessageSeq=xxx] 前缀，找到对应 pending
      const rawText: string = msg.content?.content ?? msg.content?.text ?? ''
      const replySeq = extractReplySeq(rawText)
      let pending: PendingReply | undefined
      if (replySeq != null) {
        pending = messageSeqToReply.get(replySeq)
        if (pending) messageSeqToReply.delete(replySeq)
        else return
        console.log('[Chat] AI 回复 replyMessageSeq:', replySeq, '命中:', !!pending)
      }

      const text = extractText(rawMsg) // 已剥离 [replyMessageSeq=xxx] 前缀
      if (!text) return

      // msg.fromUID == 用户手机号码（AI 账号）
      if (msg.fromUID === `${currentUser.telephone}`) {
        handleIncomingAIMessage(store, bridge, text, pending)
      }
    })
  }

  function ensureSession() {
    if (!store.activeSessionId) newSession()
  }

  function newSession() {
    const project = store.activeProject()
    if (!project) return
    const session: Session = {
      id: uuid(),
      projectId: project.id,
      title: '新对话',
      createdAt: new Date().toISOString(),
    }
    store.sessions.unshift(session)
    store.activeSessionId = session.id
  }

  async function send(text: string, attachments: Attachment[] = [], mode: SendMode = 'full', fromIframe = false) {
    const project = store.activeProject()
    if (!project) return
    ensureSession()

    const userMsg: Message = {
      id: uuid(),
      sessionId: store.activeSessionId,
      role: 'user',
      content: text,
      attachments: attachments.length ? attachments : undefined,
      status: 'sending',
      createdAt: new Date().toISOString(),
    }
    // im / im_only 模式不在对话框显示用户消息
    if (mode !== 'im' && mode !== 'im_only') {
      store.messages.push(userMsg)
      persistMessage(userMsg)
    }

    // iframe 可见时，把用户消息同步发给 iframe
    // const bridge = useIframeBridge()
    // if (bridge.isVisible.value && text && mode === 'full') {
    //   return bridge.relayUserMessage(text)
    // }

    // 创建占位 AI 消息（session_only / im_only 不显示 UI）
    if (mode !== 'session_only' && mode !== 'im_only') {
      const placeholder: Message = {
        id: uuid(),
        sessionId: store.activeSessionId,
        role: 'assistant',
        content: '',
        thinking: ' ', // 触发 ThinkingBlock 动画
        status: 'streaming',
        createdAt: new Date().toISOString(),
      }
      store.messages.push(placeholder)
      streamingId = placeholder.id
      store.aiReplying = true
    }

    const session = store.sessions.find(s => s.id === store.activeSessionId)
    const hasContent = text || attachments.length > 0
    if (session?.title === '新对话' && hasContent) {
      session.title = text ? text.slice(0, 20) : '语音消息'
    }

    // 确保后端会话存在（full / session_only 才需要后端记录）
    if ((mode === 'full' || mode === 'session_only') && session && !session.backendId && hasContent) {
      try {
        const title = text ? text.slice(0, 50) : '语音消息'
        const res = await addChat({ chatTitle: title })
        const pkId = (res as any).data
        if (pkId) session.backendId = pkId
      } catch { /* 接口失败时继续 */ }
    }
    currentChatId = (mode === 'full' || mode === 'session_only' || mode === 'im') ? (session?.backendId ?? null) : null

    // 构建系统上下文（token + 角色系统提示），对 IM 和后端接口共用
    const role = auth.currentRole.value
    // 360浏览器安全过滤会剥离 <pcAction> 标签，改用方括号格式
    const actionFormatHint = is360Browser() ? ' action-tag-format: bracket ' : ''
    const sysLines = [
      role?.userRolePrompt || '',
      ` operate-port: 2 ${actionFormatHint}`,
      fromIframe ? 'source: iframe' : '',
      auth.token.value ? `用户令牌：${auth.token.value}` : '',
    ].filter(Boolean).join('\n')
    const sysBlock = sysLines ? `<system>\n${sysLines}\n</system>\n\n` : ''

    // 发送前快照当前 pending 数据，sendText 回调时注册 clientSeq → PendingReply
    const requestId = ++replyRequestSeed
    const pendingReply: PendingReply = {
      requestId,
      streamingId: mode !== 'im_only' ? streamingId : null,
      sessionId: store.activeSessionId,
      mode,
      iframeRelay: fromIframe,
      chatId: currentChatId,
    }
    if (pendingReply.streamingId) activeReplyRequestId = requestId

    // 保存用户消息到后端（full / session_only 才保存）
    if ((mode === 'full' || mode === 'session_only') && currentChatId && hasContent) {
      addChatRecordData({
        fkChatId: currentChatId,
        chatContent: sysBlock + (text || ''),
        chatObject: '0',
        ...(attachments.length ? {
          chatRecordFileList: attachments.map(a => {
            let fileType = 1
            if (a.mimeType.startsWith('image/')) fileType = 0
            else if (a.mimeType.startsWith('audio/')) fileType = 2
            return { fileName: a.name, fileType: String(fileType), fileUrl: a.data }
          })
        } : {}),
      }).catch(() => { })
    }

    // 发送新消息后，清除所有消息的 splitContents
    for (const msg of store.messages) {
      if (msg.splitContents?.length) {
        msg.splitContents = []
      }
    }

    // session_only：已存后端记录，不发 IM，直接结束
    if (mode === 'session_only') {
      userMsg.status = 'done'
      persistMessage(userMsg)
      return
    }
    const bridge = useIframeBridge()
    if (bridge.isVisible.value && text && mode === 'full') {
      store.messages = store.messages.filter(m => m.id !== streamingId)
      streamingId = null
      if (activeReplyRequestId === pendingReply.requestId) activeReplyRequestId = null
      store.aiReplying = false
      return bridge.relayUserMessage(text)
    }
    try {
      // 构建发送文本（包含附件 markdown）
      let textToSend = text || ''
      if (attachments.length > 0) {
        const imageMarkdown = attachments
          .filter(a => a.mimeType.startsWith('image/'))
          .map(a => `![${a.name}](${a.data})`)
          .join('\n')
        // 当 text 非空时（即语音转文字路径），音频 URL 不发给 AI
        // 音频已通过 chatRecordFileList 存档到后端
        const audioMarkdown = text
          ? ''
          : attachments
              .filter(a => a.mimeType.startsWith('audio/'))
              .map(a => `[🎵 语音消息，URL: ${a.data}](${a.data})`)
              .join('\n')
        const fileMarkdown = attachments
          .filter(a => !a.mimeType.startsWith('image/') && !a.mimeType.startsWith('audio/'))
          .map(a => `[📄 文件: ${a.name}](${a.data})`)
          .join('\n')
        const mediaMarkdown = [imageMarkdown, audioMarkdown, fileMarkdown].filter(Boolean).join('\n')
        if (mediaMarkdown) textToSend = mediaMarkdown + (text ? '\n' + text : '')
      }

      // 通过悟空IM发送消息，状态回调后通过 replyMessageSeq 与 AI 回复关联
      wkIM.sendText(sysBlock + textToSend).then((e: any) => {
        if (e?.clientSeq && !stoppedReplyRequestIds.has(pendingReply.requestId)) {
          clientSeqToReply.set(e.clientSeq, pendingReply)
          console.log('[Chat] 发送，clientSeq:', e.clientSeq)
        }
      })
      userMsg.status = 'done'
      persistMessage(userMsg)
    } catch {
      userMsg.status = 'error'
      persistMessage(userMsg)
      // 移除占位消息
      store.messages = store.messages.filter(m => m.id !== streamingId)
      streamingId = null
      if (activeReplyRequestId === pendingReply.requestId) activeReplyRequestId = null
      store.aiReplying = false
    }
  }

  async function loadSession(sessionId: string) {
    store.activeSessionId = sessionId
    const session = store.sessions.find(s => s.id === sessionId)
    if (!session?.backendId) return
    try {
      const res = await chatRecordDataSearchPage({ fkChatId: session.backendId, pageNum: 1, pageSize: 200 })
      const data = (res as any).data
      const records: any[] = Array.isArray(data?.records) ? data.records : (Array.isArray(data) ? data : [])
      const msgs: Message[] = records
        .flatMap((r, recordIdx) => {
          let attachments: Attachment[] | undefined
          if (r.chatRecordFileList?.length) {
            attachments = r.chatRecordFileList.map((file: any) => {
              const fileType = String(file.fileType)
              return {
                name: file.fileName || 'unknown',
                mimeType: fileType === '0' ? 'image/png' : (fileType === '2' ? 'audio/mp3' : 'application/octet-stream'),
                data: file.fileUrl || '',
                previewUrl: fileType === '0' ? file.fileUrl : undefined,
              }
            })
          }

          let rawContent = stripSystemBlock(r.chatContent || '')
          const isAssistant = String(r.chatObject) === '1'
          const splitIdx = rawContent.indexOf('<MSG_SPLIT>')

          // 非第一条记录：直接截断 <MSG_SPLIT> 及之后的内容
          if (recordIdx !== 0 && splitIdx >= 0) {
            rawContent = rawContent.substring(0, splitIdx)
          }

          // 第一条记录：<MSG_SPLIT> 前的做 content，之后的收集到 splitContents
          if (recordIdx === 0 && splitIdx >= 0) {
            const parts = rawContent.split(/<MSG_SPLIT>/).reverse().filter(v => v !== '') // [后半段, 前半段]
            const afterSplit = (parts[0] || '').trim()
            const beforeSplit = (parts[1] || '').trim()

            let platformActions: PlatformAction[] = []
            let cleanedContent = beforeSplit
            if (isAssistant) {
              platformActions = extractPlatformActions(beforeSplit)
              if (platformActions.length > 0) {
                if (hasActionInTableCell(beforeSplit)) {
                  platformActions = []
                } else {
                  cleanedContent = stripAllActionTags(beforeSplit)
                }
              } else {
                const iframeAction = extractIframeAction(beforeSplit)
                if (iframeAction) cleanedContent = stripActionJson(beforeSplit)
              }
              cleanedContent = stripJsBlock(cleanedContent)
            }

            return [{
              id: String(r.pkId),
              sessionId,
              role: (String(r.chatObject) === '0' ? 'user' : 'assistant') as 'user' | 'assistant',
              content: cleanedContent,
              status: 'done' as const,
              createdAt: r.createTime || new Date().toISOString(),
              ...(attachments ? { attachments } : {}),
              ...(platformActions.length > 0 ? { platformActions } : {}),
              // 竖向展示的后半段内容（去掉 action 标签后原文显示）
              ...(afterSplit ? { splitContents: [afterSplit] } : {}),
            }]
          }

          // 其他记录：正常处理
          let platformActions: PlatformAction[] = []
          let cleanedContent = rawContent

          if (isAssistant) {
            platformActions = extractPlatformActions(rawContent)
            if (platformActions.length > 0) {
              if (hasActionInTableCell(rawContent)) {
                platformActions = []
              } else {
                cleanedContent = stripAllActionTags(rawContent)
              }
            } else {
              const iframeAction = extractIframeAction(rawContent)
              if (iframeAction) cleanedContent = stripActionJson(rawContent)
            }
            cleanedContent = stripJsBlock(cleanedContent)
          }

          return [{
            id: String(r.pkId),
            sessionId,
            role: (String(r.chatObject) === '0' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: cleanedContent,
            status: 'done' as const,
            createdAt: r.createTime || new Date().toISOString(),
            ...(attachments ? { attachments } : {}),
            ...(platformActions.length > 0 ? { platformActions } : {}),
          }]
        })
        .filter(m => m.content.trim() || m.attachments || m.platformActions)
        .reverse()
      const existing = store.messages.filter(m => m.sessionId !== sessionId)
      const merged = [...existing, ...msgs]
      const latestById = new Map([...merged].reverse().map(m => [m.id, m]))
      store.messages = [...latestById.values()].reverse()
    } catch { /* ignore */ }
  }

  async function deleteSession(sessionId: string) {
    const session = store.sessions.find(s => s.id === sessionId)
    if (session?.backendId) {
      try { await deleteAgent(String(session.backendId)) } catch { /* ignore */ }
    }
    store.sessions = store.sessions.filter(s => s.id !== sessionId)
    store.messages = store.messages.filter(m => m.sessionId !== sessionId)
    localStorage.removeItem(`jclaw_msgs_${sessionId}`)
    if (store.activeSessionId === sessionId) {
      store.activeSessionId = store.sessions[0]?.id ?? ''
    }
  }

  async function loadSessions() {
    try {
      const res = await getUserAccountChatList('')
      const data = (res as any).data
      const list = Array.isArray(data) ? data : (data?.data ?? [])
      const project = store.activeProject()
      const projectId = project?.id ?? ''
      const mapped: Session[] = list.map((chat: any) => ({
        id: String(chat.pkId),
        projectId,
        title: chat.chatTitle || '对话',
        createdAt: chat.createTime || new Date().toISOString(),
        backendId: chat.pkId,
      }))
      store.sessions = mapped
      if (!mapped.find(s => s.id === store.activeSessionId)) {
        store.activeSessionId = mapped[0]?.id ?? ''
      }
    } catch { /* ignore */ }
  }

  /** 中断当前 AI 回复：保留已收到的内容，清理流式状态 */
  function stopReply() {
    if (activeReplyRequestId != null) {
      stoppedReplyRequestIds.add(activeReplyRequestId)
      activeReplyRequestId = null
    }
    if (streamingId) {
      const idx = store.messages.findIndex(m => m.id === streamingId)
      if (idx >= 0) {
        const msg = store.messages[idx]
        if (!msg.content.trim()) {
          store.messages.splice(idx, 1)
        } else {
          store.messages[idx] = { ...msg, status: 'done', thinking: undefined }
          persistMessage(store.messages[idx])
        }
      }
      streamingId = null
    }
    clientSeqToReply.clear()
    messageSeqToReply.clear()
    store.aiReplying = false
  }

  function resetState() {
    streamingId = null
    currentChatId = null
    activeReplyRequestId = null
    clientSeqToReply.clear()
    messageSeqToReply.clear()
    stoppedReplyRequestIds.clear()
  }

  /**
   * 从文本中提取并移除 <promptQuick> 标签，返回 { clean, payload }。
   * payload 为标签内解析出的对象（若无标签则为 null）。
   */
  function extractPromptQuick(text: string): { clean: string; payload: Record<string, unknown> | null } {
    const match = text.match(/<promptQuick>([\s\S]*?)<\/promptQuick>/i)
    if (!match) return { clean: text, payload: null }
    let payload: Record<string, unknown> | null = null
    try {
      payload = safeJsonParse(match[1].trim()) as Record<string, unknown> | null
    } catch { /* ignore */ }
    const clean = text.replace(match[0], '').trim()
    return { clean, payload }
  }

  /** 从文本中提取并移除 <pcAction> 标签，返回 { clean, pcAction } */
  function extractPcAction(text: string): { clean: string; pcAction: Record<string, unknown> | null } {
    const match = text.match(/<pcAction>([\s\S]*?)<\/pcAction>/i)
    if (!match) return { clean: text, pcAction: null }
    let parsed: Record<string, unknown> | null = null
    try {
      parsed = safeJsonParse(match[1].trim()) as Record<string, unknown> | null
    } catch { /* ignore */ }
    const clean = text.replace(match[0], '').trim()
    return { clean, pcAction: parsed }
  }

  /**
   * 待办事项"模拟发送"：
   * - quickWords 中若含 <promptQuick> 标签，提取后调用 dispatchAction，标签本身不保存到后端
   * - 用户侧显示 quickWords（已去标签），AI 侧显示 quickLobsterWords
   * - 两条记录均保存到后端，不经过 IM
   */
  async function sendBacklogItem(item: BacklogItemVo) {
    const project = store.activeProject()
    if (!project) return
    ensureSession()

    const rawUserText = item.quickWords || ''
    const rawAiText   = item.quickLobsterWords || ''

    // 提取 <promptQuick> 并得到干净文本
    const { clean: userText, payload: quickPayload } = extractPromptQuick(rawUserText)
    // 提取 <pcAction> 并剥离标签（标签本身不保存到后端）
    const { clean: aiText, pcAction } = extractPcAction(rawAiText)

    const bridge = useIframeBridge()
    // quickWords 中若含 <promptQuick>，触发 dispatchAction
    if (quickPayload) {
      const params = (quickPayload.params as Record<string, unknown>) ?? quickPayload
      bridge.dispatchAction(params)
    }
    // quickLobsterWords 中若含 <pcAction isSkip=true>，自动打开 iframe
    if (pcAction?.isSkip) {
      bridge.dispatchAction(pcAction)
    }

    // messageType===2：只处理 AI 记录，跳过用户记录
    const isType2 = item.messageType === 2
    const showUser = !isType2 && !!userText
    const showAI   = !!rawAiText

    if (!showUser && !showAI) return

    const now = new Date().toISOString()

    // 用户消息入 store（messageType===2 不处理）
    if (showUser) {
      const userMsg: Message = {
        id: uuid(),
        sessionId: store.activeSessionId,
        role: 'user',
        content: userText,
        status: 'done',
        createdAt: now,
      }
      store.messages.push(userMsg)
      persistMessage(userMsg)
    }

    // AI 消息入 store（保留 rawAiText 含 <pcAction> 标签，供界面渲染按钮）
    if (showAI) {
      const aiMsg: Message = {
        id: uuid(),
        sessionId: store.activeSessionId,
        role: 'assistant',
        content: rawAiText,
        status: 'done',
        createdAt: now,
      }
      store.messages.push(aiMsg)
      persistMessage(aiMsg)
    }

    // 更新会话标题
    const session = store.sessions.find(s => s.id === store.activeSessionId)
    const titleSrc = isType2 ? aiText : (userText || aiText)
    if (session?.title === '新对话' && titleSrc) {
      session.title = titleSrc.slice(0, 20)
    }

    // 确保后端会话存在
    if (session && !session.backendId) {
      try {
        const res = await addChat({ chatTitle: (titleSrc || '待办消息').slice(0, 50) })
        const pkId = (res as any).data
        if (pkId) session.backendId = pkId
      } catch { /* ignore */ }
    }

    const chatId = session?.backendId ?? null
    if (!chatId) return

    // 保存记录到后端（messageType===2 不保存用户记录）
    if (showUser) {
      addChatRecordData({ fkChatId: chatId, chatContent: userText, chatObject: '0' }).catch(() => {})
    }
    if (showAI) {
      addChatRecordData({ fkChatId: chatId, chatContent: rawAiText, chatObject: '1' }).catch(() => {})
    }
  }

  return { send, newSession, loadSession, deleteSession, loadSessions, resetState, stopReply, sendBacklogItem, autoSendPrivateItems }
}
