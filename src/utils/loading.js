import { ref } from 'vue'

const visible = ref(false)
const message = ref('加载中…')

/**
 * 显示全局加载遮罩
 * @param {string} [msg] 加载提示文字
 */
export function showLoading(msg) {
  message.value = msg || '加载中…'
  visible.value = true
}

/**
 * 隐藏全局加载遮罩
 */
export function hideLoading() {
  visible.value = false
}

export function useLoading() {
  return { visible, message }
}
