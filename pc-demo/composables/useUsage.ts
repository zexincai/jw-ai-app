import { ref } from 'vue'

// OpenClaw usage stats 已弃用，悟空IM 无 token 用量统计
const loading = ref(false)

export function useUsage() {
  async function refresh() { /* noop */ }
  return { refresh, loading }
}
