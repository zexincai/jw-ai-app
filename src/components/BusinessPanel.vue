<template>
  <view class="bp-container">
    <!-- H5: 使用 iframe -->
    <!-- #ifdef H5 -->
    <view ref="iframeContainer" class="bp-iframe-wrap">
      <iframe
        ref="bpIframe"
        :src="src"
        class="bp-iframe"
        frameborder="0"
        allow="camera;microphone"
        @load="onIframeLoad"
      />
    </view>
    <!-- #endif -->

    <!-- 非 H5（App/小程序）: 使用 web-view -->
    <!-- #ifndef H5 -->
    <web-view
      v-if="src"
      :src="src"
      class="bp-webview"
      @message="onWebviewMessage"
    />
    <view v-else class="bp-empty">
      <text class="bp-empty-text">业务系统未配置 URL</text>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useBusinessBridge } from '@/composables/useBusinessBridge.js'

const props = defineProps({
  src: { type: String, default: '' },
})

const emit = defineEmits(['load', 'message'])

const bridge = useBusinessBridge()
const iframeContainer = ref(null)

function onIframeLoad() {
  bridge.setWebviewRef(iframeContainer.value)
  emit('load')
}

function onWebviewMessage(e) {
  const data = e.detail?.data
  if (data?.length) {
    // web-view postMessage 返回的是数组
    data.forEach(msg => {
      if (msg?.source === 'business-system') {
        emit('message', msg)
      }
    })
  }
}

onMounted(() => {
  // #ifdef H5
  // iframe ref 已挂载，bridge 在 onLoad 时注册
  // #endif
})
</script>

<style lang="scss" scoped>
.bp-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.bp-iframe-wrap {
  flex: 1;
  width: 100%;
}

.bp-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.bp-webview {
  width: 100%;
  height: 100%;
}

.bp-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bp-empty-text {
  font-size: 28rpx;
  color: #999;
}
</style>
