<template>
  <view class="toast-container" v-if="toasts.length">
    <view
      v-for="t in toasts"
      :key="t.id"
      class="toast-item"
      :class="`toast-item--${t.type}`"
    >
      <text class="toast-icon">{{ iconForType(t.type) }}</text>
      <text class="toast-text">{{ t.message }}</text>
    </view>
  </view>
</template>

<script setup>
import { useToasts } from '@/utils/toast.js'

const toasts = useToasts()

function iconForType(type) {
  switch (type) {
    case 'success': return '\u2714'
    case 'warning': return '\u26A0'
    default: return '\u2716'
  }
}
</script>

<style lang="scss" scoped>
.toast-container {
  position: fixed;
  top: 200rpx;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  pointer-events: none;
}

.toast-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 20rpx 32rpx;
  border-radius: 20rpx;
  background-color: #fff;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
  gap: 16rpx;

  &--error {
    border-left: 6rpx solid #ef4444;
  }

  &--warning {
    border-left: 6rpx solid #f59e0b;
  }

  &--success {
    border-left: 6rpx solid #10b981;
  }
}

.toast-icon {
  font-size: 32rpx;
}

.toast-text {
  font-size: 28rpx;
  color: #333;
  max-width: 560rpx;
}
</style>
