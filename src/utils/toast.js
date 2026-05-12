import { ref } from 'vue'

const toasts = ref([])
let idSeq = 0

/**
 * 显示 Toast 通知
 * @param {string} message 消息内容
 * @param {'error'|'warning'|'success'} type 类型
 * @param {number} duration 显示时长(ms)，默认 4000
 */
export function showToast(message, type = 'error', duration = 4000) {
  const id = ++idSeq
  toasts.value = [...toasts.value, { id, message, type }]
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

export function useToasts() {
  return toasts
}
