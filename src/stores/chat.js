import { defineStore } from 'pinia'

let _nextId = 100
function uid() {
  return String(++_nextId)
}

const MOCK_SESSIONS = [
  {
    id: '1',
    title: 'Site structural analysis',
    date: 'today',
    messages: [
      {
        id: 'm1',
        type: 'user',
        text: 'Please analyze the structural requirements for the South Wing foundation and suggest a material procurement list.',
      },
      {
        id: 'm2',
        type: 'reasoning',
        text: 'I am evaluating the load-bearing requirements for the South Wing based on the latest geotechnical reports. The seismic zone mandates a higher ductile requirement. I am calculating the reinforcement density for the pile caps and grade beams, then cross-referencing availability with local suppliers for high-tensile steel.',
      },
      {
        id: 'm3',
        type: 'ai',
        text: "Based on my analysis, I have compiled the mandatory material list for the South Wing foundation. This includes specialized high-yield reinforcement bars and standard wire rods for stirrups, ensuring compliance with both local seismic codes and your project's efficiency targets.",
        table: {
          rows: [
            { material: 'Steel Bars (T16)', subtext: 'High-Yield Reinforcement', spec: 'Grade 500B, 12m lengths', quantity: '45.5 Tons',  priority: 'Critical' },
            { material: 'Steel Bars (T25)', subtext: 'Primary Load Bearers',     spec: 'Grade 500B, 12m lengths', quantity: '112.0 Tons', priority: 'Critical' },
            { material: 'Wire Rods',        subtext: 'Stirrups & Ties',          spec: '8mm Mild Steel, Coiled', quantity: '12.8 Tons',   priority: 'Normal'   },
          ],
        },
      },
    ],
  },
  { id: '2', title: 'Urban planning feedback',        date: 'today',     messages: [] },
  { id: '3', title: 'Material sustainability report', date: 'yesterday', messages: [] },
  { id: '4', title: 'Zoning permit drafting',         date: 'yesterday', messages: [] },
  { id: '5', title: 'Landscape design brainstorming', date: 'yesterday', messages: [] },
]

export const useChatStore = defineStore('chat', {
  state: () => ({
    sessions: MOCK_SESSIONS.map(s => ({ ...s, messages: [...s.messages] })),
    activeSessionId: '1',
    isTyping: false,
  }),

  getters: {
    currentMessages(state) {
      const session = state.sessions.find(s => s.id === state.activeSessionId)
      return session ? session.messages : []
    },
  },

  actions: {
    switchSession(id) {
      this.activeSessionId = id
    },

    newSession() {
      const id = uid()
      this.sessions.push({
        id,
        title: 'New conversation',
        date: 'today',
        messages: [],
      })
      this.activeSessionId = id
    },

    sendMessage(text) {
      const session = this.sessions.find(s => s.id === this.activeSessionId)
      if (!session) return

      session.messages.push({ id: uid(), type: 'user', text })
      this.isTyping = true

      setTimeout(() => {
        session.messages.push({
          id: uid(),
          type: 'reasoning',
          text: 'Evaluating load-bearing requirements for the South Wing...',
        })
      }, 600)

      setTimeout(() => {
        session.messages.push({
          id: uid(),
          type: 'ai',
          text: 'Based on my analysis, here is the summary.',
        })
        this.isTyping = false
      }, 1800)
    },
  },
})
