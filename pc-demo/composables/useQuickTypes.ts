import { ref } from 'vue'
import { getQuickTypeList } from '../api/chatQuick'

export interface QuickTypeTab {
  type: string
  label: string
}

// 模块级单例：所有组件共享同一份数据，避免多次请求
const tabs = ref<QuickTypeTab[]>([])
let fetchPromise: Promise<void> | null = null

export function useQuickTypes() {
  async function fetchTabs() {
    // 若已在请求中，复用同一个 Promise，避免并发重复请求
    if (fetchPromise) return fetchPromise
    fetchPromise = (async () => {
      try {
        const res = await getQuickTypeList()
        const data = (res as any).data
        const list = Array.isArray(data) ? data : (data?.data ?? [])
        tabs.value = list.map((item: any) => ({
          type: String(item.quickTypeValue),
          label: item.quickTypeTitle,
        }))
      } catch { /* 加载失败静默处理 */ }
      finally { fetchPromise = null }
    })()
    return fetchPromise
  }

  /** 切换账号时调用，清空缓存以便下次重新拉取 */
  function reset() {
    tabs.value = []
    fetchPromise = null
  }

  return { tabs, fetchTabs, reset }
}
