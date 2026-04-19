import { useChatStore } from '../stores/chat.js'
import { useWukongIM } from './useWukongIM.js'
import { useAuth } from './useAuth.js'
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

function persistMessages(sessionId, messages) {
  try {
    uni.setStorageSync(`jclaw_msgs_${sessionId}`, JSON.stringify(messages))
  } catch {}
}

function loadCachedMessages(sessionId) {
  try {
    const raw = uni.getStorageSync(`jclaw_msgs_${sessionId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
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

      _handleIncoming(store, rawText)
    })
  }

  function _handleIncoming(store, rawText) {
    const thinking = extractThinking(rawText)
    const cleaned = stripActionTags(stripThinkingTags(rawText))

    if (!_streamingId) return

    const existing = store.messages.find(m => m.id === _streamingId)
    if (!existing) return

    const updated = {
      ...existing,
      content: cleaned,
      thinking: thinking || undefined,
      status: 'streaming',
    }
    store.upsertMessage(updated)

    // Reset debounce timer — mark done after 2s silence
    if (_doneTimer) clearTimeout(_doneTimer)
    _doneTimer = setTimeout(() => {
      const msg = store.messages.find(m => m.id === _streamingId)
      if (msg) {
        store.upsertMessage({ ...msg, status: 'done' })
        persistMessages(msg.sessionId, store.activeMessages)
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
    if (session && session.title === '新对话' && text) {
      session.title = text.slice(0, 20)
    }

    // Ensure backend session
    if (session && !session.backendId) {
      try {
        const res = await addChat({ chatTitle: text ? text.slice(0, 50) : '新对话' })
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
    if (_currentChatId) {
      addChatRecordData({
        fkChatId: _currentChatId,
        chatContent: sysBlock + text,
        chatObject: '0',
        ...(attachments.length ? {
          chatRecordFileList: attachments.map(a => ({
            fileName: a.name,
            fileType: a.mimeType.startsWith('image/') ? '0' : a.mimeType.startsWith('audio/') ? '2' : '1',
            fileUrl: a.url || a.data,
          })),
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
      const files = attachments
        .filter(a => !a.mimeType.startsWith('image/') && !a.mimeType.startsWith('audio/'))
        .map(a => `[📄 ${a.name}](${a.url || a.data})`)
        .join('\n')
      const audio = text ? '' : attachments
        .filter(a => a.mimeType.startsWith('audio/'))
        .map(a => `[🎵 语音](${a.url || a.data})`)
        .join('\n')
      const media = [imgs, audio, files].filter(Boolean).join('\n')
      if (media) textToSend = media + (text ? '\n' + text : '')
    }

    try {
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
    const cached = loadCachedMessages(sessionId)
    if (cached?.length) {
      store.setMessages(sessionId, cached)
      return
    }
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
            attachments: r.chatRecordFileList?.length ? r.chatRecordFileList.map(f => ({
              name: f.fileName || 'file',
              mimeType: f.fileType === '0' ? 'image/png' : f.fileType === '2' ? 'audio/mp3' : 'application/octet-stream',
              url: f.fileUrl || '',
              previewUrl: f.fileType === '0' ? f.fileUrl : undefined,
            })) : undefined,
          }
        })
        .filter(m => m.content.trim() || m.attachments)
        .reverse()
      store.setMessages(sessionId, msgs)
      persistMessages(sessionId, msgs)
    } catch {}
  }

  async function deleteSession(sessionId) {
    const session = store.sessions.find(s => s.id === sessionId)
    if (session?.backendId) {
      try { await deleteAgent(String(session.backendId)) } catch {}
    }
    store.sessions = store.sessions.filter(s => s.id !== sessionId)
    store.messages = store.messages.filter(m => m.sessionId !== sessionId)
    try { uni.removeStorageSync(`jclaw_msgs_${sessionId}`) } catch {}
    if (store.activeSessionId === sessionId) {
      store.activeSessionId = store.sessions[0]?.id ?? ''
    }
  }

  return { send, loadSessions, loadSession, deleteSession }
}
