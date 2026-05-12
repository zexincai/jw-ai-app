<template>
  <view v-if="visible" class="csm-overlay" @tap="$emit('close')">
    <view class="csm-box" @tap.stop>
      <view class="csm-icon-wrap">
        <view class="csm-dot" :class="`csm-dot--${status}`" />
      </view>
      <text class="csm-title">{{ statusText }}</text>
      <text class="csm-desc">{{ statusDesc }}</text>
      <view class="csm-actions">
        <view v-if="status === 'disconnected' || status === 'failed'" class="csm-btn csm-btn--primary" @tap="$emit('reconnect')">
          重新连接
        </view>
        <view class="csm-btn" @tap="$emit('close')">关闭</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  status: { type: String, default: 'disconnected' },
})

defineEmits(['close', 'reconnect'])

const statusText = computed(() => {
  switch (props.status) {
    case 'connecting': return '连接中…'
    case 'connected': return '已连接'
    case 'disconnected': return '连接断开'
    case 'failed': return '连接失败'
    default: return '未知状态'
  }
})

const statusDesc = computed(() => {
  switch (props.status) {
    case 'connecting': return '正在建立连接，请稍候'
    case 'connected': return '服务连接正常'
    case 'disconnected': return '与服务器的连接已断开'
    case 'failed': return '连接失败，请检查网络后重试'
    default: return ''
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.csm-overlay {
  position: fixed;
  inset: 0;
  z-index: 800;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.csm-box {
  width: 560rpx;
  background: $surface;
  border-radius: 32rpx;
  padding: 48rpx 40rpx 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.csm-icon-wrap {
  margin-bottom: 24rpx;
}

.csm-dot {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;

  &--connecting {
    background-color: #f59e0b;
    animation: pulse 1.5s infinite;
  }
  &--connected { background-color: #10b981; }
  &--disconnected { background-color: #f59e0b; }
  &--failed { background-color: #ef4444; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.csm-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $on-surface;
}

.csm-desc {
  font-size: 26rpx;
  color: $on-surface-variant;
  margin-top: 12rpx;
  text-align: center;
}

.csm-actions {
  display: flex;
  flex-direction: row;
  gap: 20rpx;
  margin-top: 36rpx;
}

.csm-btn {
  padding: 20rpx 48rpx;
  border-radius: $radius-lg;
  font-size: 28rpx;
  font-weight: 600;
  border: 2rpx solid $outline-variant;
  color: $on-surface-variant;

  &--primary {
    background-color: $primary;
    border-color: $primary;
    color: #fff;
  }
}
</style>
