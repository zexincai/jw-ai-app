import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN.js'
import en from './en.js'

// 从本地存储读取语言设置，默认中文
function getLocale() {
  try {
    const saved = uni.getStorageSync('jclaw_locale')
    if (saved && ['zh-CN', 'en'].includes(saved)) return saved
  } catch { /* ignore */ }
  // #ifdef H5
  const navLang = navigator.language || ''
  if (navLang.startsWith('en')) return 'en'
  // #endif
  return 'zh-CN'
}

const i18n = createI18n({
  legacy: false,
  locale: getLocale(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    en,
  },
})

export default i18n
