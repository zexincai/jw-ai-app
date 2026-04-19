<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useAuth } from '@/composables/useAuth.js'
import { useWukongIM } from '@/composables/useWukongIM.js'

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
* {
  box-sizing: border-box;
}
</style>
