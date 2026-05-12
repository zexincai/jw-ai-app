import { ref } from 'vue'
import { searchBacklogPageList } from '../api/agent.js'

// 模块级单例
const typeTotals = ref({ 0: 0, 1: 0, 2: 0 })
/** @type {import('vue').Ref<Record<number, Array<any>>>} */
const typeItemsMap = ref({ 0: [], 1: [], 2: [] })
const typeItemsLoadingSet = ref(new Set())
const totalsLoading = ref(false)
/** AI 回复后已揭示到列表的 messageType===1 待办 pkId 集合 */
const revealedPrivateIds = ref(new Set())

// 兼容旧字段
const backlogItems = ref([])
const backlogTotal = ref(0)
const backlogLoading = ref(false)

/** pkId 统一转 string */
function _pid(pkId) {
  return String(pkId ?? '')
}

// ── 已发送 ID 按 userId 持久化 ──────────────
const SENT_IDS_KEY = 'jclaw_backlog_sent_private_ids'

function _loadSentMap() {
  try {
    const raw = uni.getStorageSync(SENT_IDS_KEY)
    if (!raw) return new Map()
    const data = JSON.parse(raw)
    return new Map(Object.entries(data).map(([k, v]) => [k, new Set(v.map(String))]))
  } catch { return new Map() }
}

function _saveSentMap(map) {
  try {
    const data = {}
    map.forEach((ids, userId) => { data[userId] = [...ids] })
    uni.setStorageSync(SENT_IDS_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

const sentPrivateIdsMap = _loadSentMap()

// ── AI 回复内容按 pkId 持久化 ───────────────
const REPLIES_KEY = 'jclaw_backlog_private_replies'

function _loadRepliesMap() {
  try {
    const raw = uni.getStorageSync(REPLIES_KEY)
    if (!raw) return new Map()
    const data = JSON.parse(raw)
    return new Map(Object.entries(data).map(([k, v]) => [String(k), v]))
  } catch { return new Map() }
}

function _saveRepliesMap(map) {
  try {
    const data = {}
    map.forEach((content, pkId) => { data[pkId] = content })
    uni.setStorageSync(REPLIES_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

// ── 已揭示的 pkId 持久化 ────────────────
const REVEALED_IDS_KEY = 'jclaw_backlog_revealed_private_ids'

function _loadRevealedIds() {
  try {
    const raw = uni.getStorageSync(REVEALED_IDS_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw).map(String))
  } catch { return new Set() }
}

function _saveRevealedIds(ids) {
  try {
    uni.setStorageSync(REVEALED_IDS_KEY, JSON.stringify([...ids]))
  } catch { /* ignore */ }
}

const privateRepliesMap = _loadRepliesMap()

// 合并两个来源的已揭示 ID
const _storedRevealed = _loadRevealedIds()
privateRepliesMap.forEach((_, pkId) => _storedRevealed.add(pkId))
if (_storedRevealed.size > 0) {
  revealedPrivateIds.value = new Set(_storedRevealed)
}

export function useBacklog() {
  /** 从响应体中提取列表 */
  function extractList(res) {
    const data = res?.data ?? res
    if (Array.isArray(data)) return data
    return data?.records ?? data?.list ?? []
  }

  /** 对 messageType===1 的列表回填缓存的 AI 回复内容 */
  function _applyReplies(list) {
    if (!privateRepliesMap.size) return list
    return list.map(item => {
      const pid = _pid(item.pkId)
      return pid && privateRepliesMap.has(pid)
        ? { ...item, quickLobsterWords: privateRepliesMap.get(pid) }
        : item
    })
  }

  /** 检查某 item 是否已被标记为已发送 */
  function _isSent(item) {
    if (item.pkId == null) return false
    return sentPrivateIdsMap.get(String(item.fkUserId))?.has(_pid(item.pkId)) ?? false
  }

  /** messageType===1 的项默认隐藏，只有被揭示后才计入可见数 */
  function isVisible(item) {
    if (item.messageType !== 1) return true
    if (item.pkId == null) return false
    const pid = _pid(item.pkId)
    return revealedPrivateIds.value.has(pid) || privateRepliesMap.has(pid)
  }

  /** 并发拉取三种类型的数量角标（顺带缓存列表） */
  async function fetchTypeTotals() {
    if (totalsLoading.value) return
    totalsLoading.value = true
    try {
      const results = await Promise.allSettled([
        searchBacklogPageList({ pageNum: 1, pageSize: 200, messageType: 0 }),
        searchBacklogPageList({ pageNum: 1, pageSize: 200, messageType: 1 }),
        searchBacklogPageList({ pageNum: 1, pageSize: 200, messageType: 2 }),
      ])
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          let list = extractList(r.value).map(item => ({ ...item, messageType: i }))
          if (i === 1) list = _applyReplies(list)
          typeItemsMap.value = { ...typeItemsMap.value, [i]: list }
          typeTotals.value[i] = list.filter(isVisible).length
        }
      })
    } catch {
      // 静默失败
    } finally {
      totalsLoading.value = false
    }
  }

  /** 拉取指定类型的待办列表（有缓存则跳过）*/
  async function fetchTypeItems(messageType, force = false) {
    if (!force && typeItemsMap.value[messageType]?.length) return
    if (typeItemsLoadingSet.value.has(messageType)) return
    typeItemsLoadingSet.value = new Set([...typeItemsLoadingSet.value, messageType])
    try {
      const res = await searchBacklogPageList({ pageNum: 1, pageSize: 9999, messageType })
      let list = extractList(res).map(item => ({ ...item, messageType }))
      if (messageType === 1) list = _applyReplies(list)
      typeItemsMap.value = { ...typeItemsMap.value, [messageType]: list }
      typeTotals.value[messageType] = list.filter(isVisible).length
    } catch {
      typeItemsMap.value = { ...typeItemsMap.value, [messageType]: [] }
    } finally {
      const next = new Set(typeItemsLoadingSet.value)
      next.delete(messageType)
      typeItemsLoadingSet.value = next
    }
  }

  /** 拉取全部三种类型 */
  async function fetchAllTypeItems(force = false) {
    await Promise.all([
      fetchTypeItems(0, force),
      fetchTypeItems(1, force),
      fetchTypeItems(2, force),
    ])
  }

  // 保留旧接口
  async function fetchBacklog() {
    await fetchTypeTotals()
    backlogTotal.value = Object.values(typeTotals.value).reduce((a, b) => a + b, 0)
  }

  /** 返回当前缓存中属于指定用户的、尚未自动发送的 messageType===1 待办项 */
  function getUnsentPrivateItems(userIds) {
    return (typeItemsMap.value[1] ?? []).filter(
      item =>
        item.pkId != null &&
        !_isSent(item) &&
        userIds.includes(String(item.fkUserId)),
    )
  }

  /** 将一批 item 标记为已发送 */
  function markPrivateItemsSent(items) {
    for (const item of items) {
      if (item.pkId == null) continue
      const userId = String(item.fkUserId)
      if (!sentPrivateIdsMap.has(userId)) sentPrivateIdsMap.set(userId, new Set())
      sentPrivateIdsMap.get(userId).add(_pid(item.pkId))
    }
    _saveSentMap(sentPrivateIdsMap)
  }

  /** 将 AI 回复内容存入 item.quickLobsterWords 并持久化 */
  function updatePrivateItemReply(pkId, aiContent) {
    const pid = _pid(pkId)
    if (!pid) return
    privateRepliesMap.set(pid, aiContent)
    _saveRepliesMap(privateRepliesMap)
    // 更新内存中的 item
    const list = typeItemsMap.value[1] ?? []
    const idx = list.findIndex(item => _pid(item.pkId) === pid)
    if (idx < 0) return
    const updated = [...list]
    updated[idx] = { ...updated[idx], quickLobsterWords: aiContent }
    typeItemsMap.value = { ...typeItemsMap.value, 1: updated }
  }

  /** AI 回复后，将 messageType===1 的项揭示到列表 */
  function revealPrivateItem(pkId) {
    const pid = _pid(pkId)
    if (!pid) return
    const next = new Set(revealedPrivateIds.value)
    next.add(pid)
    revealedPrivateIds.value = next
    _saveRevealedIds(revealedPrivateIds.value)
    // 更新角标数
    const list = typeItemsMap.value[1] ?? []
    typeTotals.value[1] = list.filter(isVisible).length
  }

  function reset() {
    typeTotals.value = { 0: 0, 1: 0, 2: 0 }
    typeItemsMap.value = { 0: [], 1: [], 2: [] }
    typeItemsLoadingSet.value = new Set()
    totalsLoading.value = false
    backlogItems.value = []
    backlogTotal.value = 0
    backlogLoading.value = false
    revealedPrivateIds.value = new Set()
  }

  function getTotalCount() {
    return Object.values(typeTotals.value).reduce((a, b) => a + b, 0)
  }

  return {
    typeTotals,
    typeItemsMap,
    typeItemsLoadingSet,
    revealedPrivateIds,
    isVisible,
    getTotalCount,
    fetchTypeTotals,
    fetchTypeItems,
    fetchAllTypeItems,
    getUnsentPrivateItems,
    markPrivateItemsSent,
    updatePrivateItemReply,
    revealPrivateItem,
    backlogItems,
    backlogTotal,
    backlogLoading,
    fetchBacklog,
    reset,
  }
}
