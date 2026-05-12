<template>
  <ToastList />
  <GlobalLoading />
</template>

<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useAuth } from '@/composables/useAuth.js'
import { useWukongIM } from '@/composables/useWukongIM.js'
import ToastList from '@/components/ToastList.vue'
import GlobalLoading from '@/components/GlobalLoading.vue'

onLaunch(() => {
  // #ifdef H5
  const info = uni.getSystemInfoSync()
  document.documentElement.style.setProperty(
    '--status-bar-height',
    info.statusBarHeight + 'px'
  )
  // #endif

  // Auto-connect if already logged in
  const auth = useAuth()
  const wkIM = useWukongIM()
  const role = auth.currentRole.value
  if (auth.isLoggedIn.value && role) {
    wkIM.connect(role.userId, role.telephone, auth.token.value).catch(() => {})
  }
})

onShow(() => {
  const auth = useAuth()
  const wkIM = useWukongIM()
  if (auth.isLoggedIn.value && wkIM.status.value === 'disconnected') {
    wkIM.reconnect()
  }
})

onHide(() => {
  const wkIM = useWukongIM()
  wkIM.disconnect()
})
</script>

<style lang="scss">
@use '@/styles/variables.scss' as *;
page {
  background-color: $surface;
  font-family: 'PingFang SC', 'Helvetica Neue', sans-serif;
  box-sizing: border-box;
}
/* * 选择器不支持小程序 WXSS，已移除 */
</style>
