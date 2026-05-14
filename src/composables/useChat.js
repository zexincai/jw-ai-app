import { useChatStore } from '../stores/chat.js'
import { useWukongIM } from './useWukongIM.js'
import { useAuth } from './useAuth.js'
import { useBacklog } from './useBacklog.js'
import {
  addChat,
  addChatRecordData,
  deleteAgent,
  getUserAccountChatList,
  chatRecordDataSearchPage,
} from '../api/agent.js'

let _initialized = false
let _streamingId = null
let _doneTimer = null
let _currentChatId = null

// ── Private item queue (messageType===1 自动发送) ──
const privateItemQueue = []
let processingPrivateQueue = false
const replySeed = { count: 0 }
const pendingReplies = new Map() // requestId → { pkId, onComplete }

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function stripSystemBlock(text) {
  return text.replace(/<system>[\s\S]*?<\/system>\n*/gi, '').trim()
}

function extractThinking(text) {
  const m = text.match(/<\s*think(?:ing)?\s*>([\s\S]*?)<\s*\/\s*think(?:ing)?\s*>/i)
  return m ? m[1].trim() : ''
}

function stripThinkingTags(text) {
  return text.replace(/<\s*think(?:ing)?\s*>[\s\S]*?<\s*\/\s*think(?:ing)?\s*>/gi, '').trim()
}

function stripActionTags(text) {
  return text
    .replace(/<pcAction>[\s\S]*?<\/pcAction>/gi, '')
    .replace(/<appAction>[\s\S]*?<\/appAction>/gi, '')
    .replace(/<deskAction>[\s\S]*?<\/deskAction>/gi, '')
    .replace(/<system>[\s\S]*?<\/system>/gi, '')
    .trim()
}

/** Parse platform action tags and return extracted actions */
function extractActions(text) {
  const actions = []
  // Extract <appAction> tags
  const appMatch = text.match(/<appAction>([\s\S]*?)<\/appAction>/gi)
  if (appMatch) {
    for (const tag of appMatch) {
      try {
        const inner = tag.replace(/<\/?appAction>/gi, '').trim()
        const parsed = JSON.parse(inner)
        if (parsed) actions.push({ type: 'app', ...parsed })
      } catch { /* ignore */ }
    }
  }
  // Extract <deskAction> tags
  const deskMatch = text.match(/<deskAction>([\s\S]*?)<\/deskAction>/gi)
  if (deskMatch) {
    for (const tag of deskMatch) {
      try {
        const inner = tag.replace(/<\/?deskAction>/gi, '').trim()
        const parsed = JSON.parse(inner)
        if (parsed) actions.push({ type: 'desk', ...parsed })
      } catch { /* ignore */ }
    }
  }
  return actions
}

/** Extract open_modal action from content */
function extractOpenModal(text) {
  const match = text.match(/"open_modal"\s*:\s*"(\w+)"/)
  if (match) return match[1]
  const match2 = text.match(/open_modal:\s*(\w+)/)
  if (match2) return match2[1]
  return null
}

/** Extract material table data from JSON code blocks */
function extractMaterialTable(text) {
  const match = text.match(/```json\s*([\s\S]*?)```/)
  if (!match) return null
  try {
    const data = JSON.parse(match[1])
    // Check if it looks like a material table
    if (data.materials && Array.isArray(data.materials)) {
      return data.materials.map(m => ({
        material: m.material || m.name || '',
        subtext: m.subtext || m.category || '',
        spec: m.spec || m.specifications || '',
        quantity: String(m.quantity || m.qty || ''),
        priority: m.priority || 'Normal',
      }))
    }
    // Check for table data format
    if (data.rows && Array.isArray(data.rows)) return data.rows.map(r => ({
      material: r.material || r[0] || '',
      subtext: r.subtext || r.category || '',
      spec: r.spec || r.specifications || r[1] || '',
      quantity: String(r.quantity || r.qty || r[2] || ''),
      priority: r.priority || r[3] || 'Normal',
    }))
  } catch { /* ignore */ }
  return null
}


export function useChat() {
  const store = useChatStore()
  const wkIM = useWukongIM()
  const auth = useAuth()

  if (!_initialized) {
    _initialized = true

    wkIM.onMessage((rawMsg) => {
      const msg = rawMsg
      const currentRole = auth.currentRole.value
      if (!currentRole) return
      if (msg.fromUID === String(currentRole.userId)) return
      if (msg.contentType !== 1 && msg.contentType !== 103) return

      const content = msg.content
      let rawText = ''
      if (content && typeof content.content === 'string') rawText = content.content
      else if (content && typeof content.text === 'string') rawText = content.text
      else if (typeof content === 'string') rawText = content
      if (!rawText) return

      console.log('[IM Receive text]', rawText)
      _handleIncoming(store, rawText)
    })
  }

  function _handleIncoming(store, rawText) {
    const thinking = extractThinking(rawText)
    const cleaned = stripActionTags(stripThinkingTags(rawText))
    const actions = extractActions(rawText)
    const openModal = extractOpenModal(rawText)
    const materialTable = extractMaterialTable(rawText)

    // Check for private item reply completion
    if (_streamingId) {
      // Find all pending replies that don't have a streamingId yet
      for (const [requestId, pending] of pendingReplies) {
        if (!pending.streamingId && pending.pkId) {
          pending.streamingId = _streamingId
          break
        }
      }
    }

    if (!_streamingId) return

    const existing = store.messages.find(m => m.id === _streamingId)
    if (!existing) return

    const updated = {
      ...existing,
      content: cleaned,
      thinking: thinking || undefined,
      status: 'streaming',
      actions: actions.length ? actions : undefined,
      openModal: openModal || undefined,
      materialTable: materialTable || undefined,
    }
    store.upsertMessage(updated)

    // Reset debounce timer — mark done after 2s silence
    if (_doneTimer) clearTimeout(_doneTimer)
    _doneTimer = setTimeout(() => {
      const msg = store.messages.find(m => m.id === _streamingId)
      if (msg) {
        store.upsertMessage({ ...msg, status: 'done' })
        if (_currentChatId && msg.content) {
          addChatRecordData({
            fkChatId: _currentChatId,
            chatContent: msg.content,
            chatObject: '1',
          }).catch(() => {})
        }
        // Handle private item reply: update backlog and resolve pending
        for (const [requestId, pending] of pendingReplies) {
          if (pending.streamingId === _streamingId && pending.pkId) {
            const backlog = useBacklog()
            backlog.updatePrivateItemReply(pending.pkId, cleaned)
            backlog.revealPrivateItem(pending.pkId)
            if (pending.onComplete) pending.onComplete()
            pendingReplies.delete(requestId)
            break
          }
        }
      }
      _streamingId = null
      _doneTimer = null
      store.aiReplying = false
    }, 2000)
  }

  async function send(text, attachments = []) {
    if (!store.activeSessionId) store.newLocalSession()

    const sessionId = store.activeSessionId
    const userMsgId = uid()

    const userMsg = {
      id: userMsgId,
      sessionId,
      role: 'user',
      content: text,
      attachments: attachments.length ? attachments : undefined,
      status: 'sent',
      createdAt: new Date().toISOString(),
    }
    store.pushMessage(userMsg)

    const placeholderId = uid()
    store.pushMessage({
      id: placeholderId,
      sessionId,
      role: 'assistant',
      content: '',
      thinking: ' ',
      status: 'streaming',
      createdAt: new Date().toISOString(),
    })
    _streamingId = placeholderId
    store.aiReplying = true

    // Update session title
    const session = store.sessions.find(s => s.id === sessionId)
    const hasContent = text || attachments.length > 0
    if (session && session.title === '新对话' && hasContent) {
      session.title = text ? text.slice(0, 20) : '语音消息'
    }

    // Ensure backend session
    if (session && !session.backendId && hasContent) {
      try {
        const res = await addChat({ chatTitle: text ? text.slice(0, 50) : '语音消息' })
        const pkId = (res.data || res)
        if (pkId) session.backendId = typeof pkId === 'object' ? pkId.pkId : pkId
      } catch {}
    }
    _currentChatId = session?.backendId ?? null

    // Build system block
    const role = auth.currentRole.value
    const sysLines = [
      role?.userRolePrompt || '',
      'operate-port: 2',
      auth.token.value ? `用户令牌：${auth.token.value}` : '',
    ].filter(Boolean).join('\n')
    const sysBlock = sysLines ? `<system>\n${sysLines}\n</system>\n\n` : ''

    // Save user msg to backend
    if (_currentChatId && hasContent) {
      addChatRecordData({
        fkChatId: _currentChatId,
        chatContent: sysBlock + (text || ''),
        chatObject: '0',
        ...(attachments.length ? {
          chatRecordFileList: attachments.map(a => {
            let fileType = 1
            if (a.mimeType.startsWith('image/')) fileType = 0
            else if (a.mimeType.startsWith('audio/')) fileType = 2
            return { fileName: a.name, fileType: String(fileType), fileUrl: a.url || a.data }
          }),
        } : {}),
      }).catch(() => {})
    }

    // Build message text with attachments
    let textToSend = text || ''
    if (attachments.length) {
      const imgs = attachments
        .filter(a => a.mimeType.startsWith('image/'))
        .map(a => `![${a.name}](${a.url || a.data})`)
        .join('\n')
      // 当 text 非空时（即语音转文字路径），音频 URL 不发给 AI
      // 音频已通过 chatRecordFileList 存档到后端
      const audio = text ? '' : attachments
        .filter(a => a.mimeType.startsWith('audio/'))
        .map(a => { const u = a.url || a.data; return `[\uD83C\uDFB5 语音消息，URL: ${u}](${u})` })
        .join('\n')
      const files = attachments
        .filter(a => !a.mimeType.startsWith('image/') && !a.mimeType.startsWith('audio/'))
        .map(a => `[📄 文件: ${a.name}](${a.url || a.data})`)
        .join('\n')
      const media = [imgs, audio, files].filter(Boolean).join('\n')
      if (media) textToSend = media + (text ? '\n' + text : '')
    }

    try {
      console.log('[IM Send chat]', sysBlock + textToSend)
      wkIM.sendText(sysBlock + textToSend)
    } catch {
      store.upsertMessage({ ...userMsg, status: 'error' })
      store.removeMessage(placeholderId)
      _streamingId = null
      store.aiReplying = false
    }
  }

  async function loadSessions() {
    try {
      const res = await getUserAccountChatList()
      const data = res.data || res
      const list = Array.isArray(data) ? data : (data?.records ?? data?.data ?? [])
      const sessions = list.map(item => ({
        id: String(item.pkId),
        title: item.chatTitle || '对话',
        createdAt: item.createTime || new Date().toISOString(),
        backendId: item.pkId,
      }))
      store.setSessions(sessions)
    } catch {}
  }

  async function loadSession(sessionId) {
    store.switchSession(sessionId)
    const session = store.sessions.find(s => s.id === sessionId)
    if (!session?.backendId) return
    try {
      const res = await chatRecordDataSearchPage({ fkChatId: session.backendId, pageNum: 1, pageSize: 200 })
      const data = res.data || res
      const records = Array.isArray(data?.records) ? data.records : (Array.isArray(data) ? data : [])
      const msgs = records
        .map(r => {
          const raw = stripSystemBlock(r.chatContent || '')
          return {
            id: String(r.pkId),
            sessionId,
            role: String(r.chatObject) === '0' ? 'user' : 'assistant',
            content: stripActionTags(raw),
            status: 'done',
            createdAt: r.createTime || new Date().toISOString(),
            attachments: r.chatRecordFileList?.length ? r.chatRecordFileList.map(f => {
              const ft = String(f.fileType)
              return {
                name: f.fileName || 'file',
                mimeType: ft === '0' ? 'image/png'
                  : ft === '2' || /\.(wav|mp3|aac|m4a|ogg|webm|flac)$/i.test(f.fileName || '')
                    ? 'audio/wav'
                    : 'application/octet-stream',
                url: f.fileUrl || '',
                previewUrl: ft === '0' ? f.fileUrl : undefined,
              }
            }) : undefined,
          }
        })
        .filter(m => m.content.trim() || m.attachments)
        .reverse()
      store.setMessages(sessionId, msgs)
    } catch {}
  }

  async function deleteSession(sessionId) {
    const session = store.sessions.find(s => s.id === sessionId)
    if (session?.backendId) {
      try { await deleteAgent(String(session.backendId)) } catch {}
    }
    store.sessions = store.sessions.filter(s => s.id !== sessionId)
    store.messages = store.messages.filter(m => m.sessionId !== sessionId)
    if (store.activeSessionId === sessionId) {
      store.activeSessionId = store.sessions[0]?.id ?? ''
    }
  }

  // ── Backlog: messageType===1 自动发送 ──

  /** 将缓存中属于当前角色的 messageType===1 待办项逐条发送到 IM */
  async function autoSendPrivateItems() {
    const { getUnsentPrivateItems, markPrivateItemsSent, typeItemsMap } = useBacklog()
    const currentUserId = String(auth.currentRole.value?.userId ?? '')
    const items = getUnsentPrivateItems([currentUserId])
    if (!items.length) return

    markPrivateItemsSent(items.filter(i => i.pkId != null))

    for (const item of items) privateItemQueue.push(item)

    if (!processingPrivateQueue) _processPrivateQueue()
  }

  async function _processPrivateQueue() {
    if (processingPrivateQueue) return
    processingPrivateQueue = true
    while (privateItemQueue.length > 0) {
      const item = privateItemQueue.shift()
      await _sendPrivateItemToIM(item)
    }
    processingPrivateQueue = false
  }

  function _sendPrivateItemToIM(item) {
    return new Promise((resolve) => {
      const rawText = item.quickWords || ''
      if (!rawText) { resolve(); return }

      const role = auth.currentRole.value
      const sysLines = [
        role?.userRolePrompt || '',
        ' operate-port: 2',
        auth.token.value ? `用户令牌：${auth.token.value}` : '',
      ].filter(Boolean).join('\n')
      const sysBlock = sysLines ? `<system>\n${sysLines}\n</system>\n\n` : ''

      const requestId = ++replySeed.count
      pendingReplies.set(requestId, {
        pkId: item.pkId,
        streamingId: null,
        onComplete: resolve,
      })

      // Create a placeholder message for this private item reply
      if (!store.activeSessionId) store.newLocalSession()
      const sessionId = store.activeSessionId
      const placeholderId = uid()
      _streamingId = placeholderId
      store.aiReplying = true
      store.pushMessage({
        id: placeholderId,
        sessionId,
        role: 'assistant',
        content: '',
        thinking: ' ',
        status: 'streaming',
        createdAt: new Date().toISOString(),
      })

      wkIM.sendText(sysBlock + rawText).catch(() => {
        pendingReplies.delete(requestId)
        store.removeMessage(placeholderId)
        _streamingId = null
        store.aiReplying = false
        resolve()
      })
    })
  }

  // ── Backlog: 发送单条待办 ──

  /** 发送单条待办事项作为聊天消息 */
  async function sendBacklogItem(item) {
    if (!store.activeSessionId) store.newLocalSession()
    const session = store.sessions.find(s => s.id === store.activeSessionId)

    // Ensure backend session
    if (session && !session.backendId) {
      try {
        const res = await addChat({ chatTitle: (item.title || '待办消息').slice(0, 50) })
        const pkId = (res.data || res)
        if (pkId) session.backendId = typeof pkId === 'object' ? pkId.pkId : pkId
      } catch { /* ignore */ }
    }

    const chatId = session?.backendId ?? null
    const userText = item.quickWords || ''
    const aiText = item.quickLobsterWords || ''

    // Display user side
    if (userText) {
      const userMsgId = uid()
      store.pushMessage({
        id: userMsgId,
        sessionId: store.activeSessionId,
        role: 'user',
        content: userText,
        status: 'done',
        createdAt: new Date().toISOString(),
      })
    }

    // Display AI side
    if (aiText) {
      const aiMsgId = uid()
      store.pushMessage({
        id: aiMsgId,
        sessionId: store.activeSessionId,
        role: 'assistant',
        content: aiText,
        status: 'done',
        createdAt: new Date().toISOString(),
      })
    }

    // Save to backend
    if (chatId) {
      if (userText) {
        addChatRecordData({ fkChatId: chatId, chatContent: userText, chatObject: '0' }).catch(() => {})
      }
      if (aiText) {
        addChatRecordData({ fkChatId: chatId, chatContent: aiText, chatObject: '1' }).catch(() => {})
      }
    }
  }

  return { send, loadSessions, loadSession, deleteSession, autoSendPrivateItems, sendBacklogItem }
}
