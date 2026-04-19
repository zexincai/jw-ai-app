import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useChatStore } from './chat'

describe('useChatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with 5 sessions and activeSessionId = "1"', () => {
    const store = useChatStore()
    expect(store.sessions).toHaveLength(5)
    expect(store.activeSessionId).toBe('1')
  })

  it('currentMessages returns messages for the active session', () => {
    const store = useChatStore()
    expect(store.currentMessages).toHaveLength(3)
  })

  it('switchSession changes activeSessionId and currentMessages', () => {
    const store = useChatStore()
    store.switchSession('2')
    expect(store.activeSessionId).toBe('2')
    expect(store.currentMessages).toHaveLength(0)
  })

  it('newSession adds a session and makes it active', () => {
    const store = useChatStore()
    const before = store.sessions.length
    store.newSession()
    expect(store.sessions).toHaveLength(before + 1)
    expect(store.activeSessionId).toBe(store.sessions.at(-1).id)
    expect(store.currentMessages).toHaveLength(0)
  })

  it('sendMessage appends user message immediately', () => {
    const store = useChatStore()
    store.switchSession('2')
    store.sendMessage('Hello')
    expect(store.currentMessages).toHaveLength(1)
    expect(store.currentMessages[0]).toMatchObject({ type: 'user', text: 'Hello' })
  })

  it('sendMessage sets isTyping and appends reasoning after 600ms', () => {
    const store = useChatStore()
    store.switchSession('2')
    store.sendMessage('Hello')
    expect(store.isTyping).toBe(true)
    vi.advanceTimersByTime(600)
    expect(store.currentMessages).toHaveLength(2)
    expect(store.currentMessages[1].type).toBe('reasoning')
  })

  it('sendMessage appends ai message (no table) and clears isTyping after 1800ms', () => {
    const store = useChatStore()
    store.switchSession('2')
    store.sendMessage('Hello')
    vi.advanceTimersByTime(1800)
    const msgs = store.currentMessages
    expect(msgs.at(-1).type).toBe('ai')
    expect(msgs.at(-1).table).toBeUndefined()
    expect(store.isTyping).toBe(false)
  })
})
