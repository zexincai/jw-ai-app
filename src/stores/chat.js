import { defineStore } from 'pinia'

function getDateLabel(createdAt) {
  if (!createdAt) return 'today'
  const d = new Date(createdAt)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'today'
  if (d.toDateString() === yesterday.toDateString()) return 'yesterday'
  return 'earlier'
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    sessions: [],
    messages: [],
    activeSessionId: '',
    aiReplying: false,
    wsStatus: 'disconnected',
  }),

  getters: {
    activeMessages(state) {
      return state.messages.filter(m => m.sessionId === state.activeSessionId)
    },
  },

  actions: {
    switchSession(id) {
      this.activeSessionId = id
    },

    newLocalSession() {
      const id = `local_${Date.now()}`
      const now = new Date().toISOString()
      this.sessions.unshift({ id, title: '新对话', createdAt: now, date: 'today' })
      this.activeSessionId = id
      return id
    },

    pushMessage(msg) {
      this.messages.push(msg)
    },

    upsertMessage(msg) {
      const idx = this.messages.findIndex(m => m.id === msg.id)
      if (idx >= 0) {
        this.messages[idx] = msg
      } else {
        this.messages.push(msg)
      }
    },

    removeMessage(id) {
      this.messages = this.messages.filter(m => m.id !== id)
    },

    setSessions(list) {
      this.sessions = list.map(s => ({ ...s, date: getDateLabel(s.createdAt) }))
      if (!this.sessions.find(s => s.id === this.activeSessionId)) {
        this.activeSessionId = this.sessions[0]?.id ?? ''
      }
    },

    setMessages(sessionId, list) {
      this.messages = this.messages.filter(m => m.sessionId !== sessionId).concat(list)
    },
  },
})
