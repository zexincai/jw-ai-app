/**
 * 业务系统通信桥梁（跨平台）
 *
 * - H5: 使用 iframe postMessage 通信
 * - App/小程序: 使用 <web-view> + uni.postMessage 通信
 */
import { ref } from 'vue'

const ready = ref(false)
const isIframeMode = ref(false)
// #ifdef H5
isIframeMode.value = true
// #endif

let _webviewEl = null
let _pendingActions = []

/**
 * 注册 web-view 元素引用
 * @param {object} el
 */
export function setWebviewRef(el) {
  _webviewEl = el
  ready.value = true
  // 发送积压的消息
  _pendingActions.forEach(a => a())
  _pendingActions = []
}

/**
 * 向业务系统发送消息
 * @param {string} type 消息类型
 * @param {object} data 消息数据
 */
function postMessage(type, data) {
  const payload = { type, data, source: 'jclaw-app', timestamp: Date.now() }

  // #ifdef H5
  const iframe = _webviewEl?.querySelector?.('iframe') || _webviewEl
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage(payload, '*')
  }
  // #endif

  // #ifndef H5
  // uni-app web-view 使用 uni.postMessage 或自定义通信
  // 注意：小程序 web-view 有通信限制，只能在特定时机触发 bindmessage
  // #endif
}

function _sendOrQueue(action) {
  if (ready.value) {
    action()
  } else {
    _pendingActions.push(action)
  }
}

/**
 * 打开业务系统模态框
 * @param {string} modal 模态框标识
 * @param {object} data 数据
 */
export function openModal(modal, data = {}) {
  postMessage('JCLAW_OPEN_MODAL', { modal, ...data })
}

/**
 * 触发业务系统导航
 * @param {object} params 导航参数
 */
export function navigate(params) {
  postMessage('JCLAW_NAVIGATE', params)
}

/**
 * 触发业务系统动作
 * @param {object} payload 动作 payload
 */
export function dispatchAction(payload) {
  postMessage('JCLAW_ACTION', payload)
}

/**
 * 同步 Token 到业务系统
 * @param {string} token
 */
export function sendToken(token) {
  postMessage('JCLAW_TOKEN', { token })
}

/**
 * 监听业务系统发来的消息
 * @param {function} handler
 */
export function onBusinessMessage(handler) {
  // #ifdef H5
  window.addEventListener('message', (event) => {
    if (event.data?.source === 'business-system') {
      handler(event.data)
    }
  })
  // #endif

  // #ifndef H5
  // 小程序 web-view 通过 @message 事件接收
  // 在 BusinessPanel 组件中处理
  // #endif
}

export function useBusinessBridge() {
  return {
    ready,
    setWebviewRef,
    openModal,
    navigate,
    dispatchAction,
    sendToken,
    onBusinessMessage,
  }
}
