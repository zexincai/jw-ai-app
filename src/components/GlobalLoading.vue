<template>
  <view v-if="visible" class="gl-overlay">
    <view class="gl-box">
      <view class="gl-spinner" />
      <text class="gl-text">{{ message }}</text>
    </view>
  </view>
</template>

<script setup>
import { useLoading } from '@/utils/loading.js'

const { visible, message } = useLoading()
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.gl-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.gl-box {
  background-color: $surface;
  border-radius: $radius-xl;
  padding: 48rpx 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.18);
}

.gl-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 6rpx solid rgba($primary, 0.2);
  border-top-color: $primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.gl-text {
  font-size: 28rpx;
  color: $on-surface-variant;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
