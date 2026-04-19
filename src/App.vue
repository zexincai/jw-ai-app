<script setup>
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  // #ifdef H5
  // Native App provides --status-bar-height automatically; H5 needs manual assignment
  const info = uni.getSystemInfoSync()
  document.documentElement.style.setProperty(
    '--status-bar-height',
    info.statusBarHeight + 'px'
  )
  // #endif
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
