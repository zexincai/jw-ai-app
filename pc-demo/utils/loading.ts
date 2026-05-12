import { h, render, ref, watch } from 'vue'
import GlobalLoading from '../components/GlobalLoading.vue'

const isVisible = ref(false)
const currentMessage = ref('')
let container: HTMLElement | null = null

export const loading = {
  /**
   * 显示全局加载中
   * @param message 消息内容
   */
  show(message?: string) {
    if (!container) {
      container = document.createElement('div')
      document.body.appendChild(container)
      
      // 监听状态变化并重新渲染
      watch([isVisible, currentMessage], () => {
        const vnode = h(GlobalLoading, {
          visible: isVisible.value,
          message: currentMessage.value
        })
        render(vnode, container!)
      }, { immediate: true })
    }
    
    currentMessage.value = message || ''
    isVisible.value = true
  },
  
  /**
   * 隐藏全局加载中
   */
  hide() {
    isVisible.value = false
  }
}
