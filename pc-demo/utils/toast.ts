import { ref } from 'vue'

export interface ToastItem {
  id: number
  message: string
  type: 'error' | 'warning' | 'success'
}

const toasts = ref<ToastItem[]>([])
let idSeq = 0

export function showToast(message: string, type: ToastItem['type'] = 'error', duration = 4000) {
  const id = ++idSeq
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

export function useToasts() {
  return toasts
}
