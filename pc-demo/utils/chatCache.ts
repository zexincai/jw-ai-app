/** 清除所有会话消息的本地缓存 */
export function clearMessagesCache() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (key?.startsWith('jclaw_msgs_')) {
      localStorage.removeItem(key)
    }
  }
}
