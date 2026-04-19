<template>
  <view class="input-bar-wrapper">
    <!-- Icon row -->
    <view class="icon-row">
      <view class="icon-btn">
        <image src="/static/icon-camera.svg" class="icon" mode="aspectFit" />
      </view>
      <view class="icon-btn">
        <image src="/static/icon-attach.svg" class="icon" mode="aspectFit" />
      </view>
      <view class="icon-btn">
        <image src="/static/icon-mic.svg" class="icon" mode="aspectFit" />
      </view>
    </view>

    <!-- Input + send row -->
    <view class="input-row">
      <textarea
        v-model="inputText"
        class="input-field"
        :auto-height="true"
        :max-height="200"
        placeholder="Message Architect AI..."
        placeholder-class="input-placeholder"
        @confirm="handleSend"
      />
      <view
        class="send-btn"
        :class="inputText.trim() ? 'send-btn--active' : 'send-btn--disabled'"
        @tap="handleSend"
      >
        <image src="/static/icon-send.svg" class="send-icon" mode="aspectFit" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['send'])
const inputText = ref('')

function handleSend() {
  const text = inputText.value.trim()
  if (!text) return
  emit('send', text)
  inputText.value = ''
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.input-bar-wrapper {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  background-color: $surface;
  padding-top: 16rpx;
  padding-left: 24rpx;
  padding-right: 24rpx;
}

.icon-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 16rpx;
  background-color: rgba(255, 255, 255, 0.85);
  border: 2rpx solid rgba($outline-variant, 0.3);
  border-radius: 32rpx 32rpx 0 0;
  border-bottom: none;
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon {
  width: 40rpx;
  height: 40rpx;
}

.input-row {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  background-color: rgba(255, 255, 255, 0.85);
  border: 2rpx solid rgba($outline-variant, 0.3);
  border-top: 1rpx solid rgba($outline-variant, 0.15);
  border-radius: 0 0 32rpx 32rpx;
  padding: 8rpx 12rpx 12rpx 12rpx;
}

.input-field {
  flex: 1;
  font-size: 28rpx;
  color: $on-surface;
  padding: 16rpx 12rpx;
  min-height: 72rpx;
  line-height: 1.5;
  background: transparent;
}

.input-placeholder {
  color: rgba($on-surface-variant, 0.5);
}

.send-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: $radius-xl;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &--active {
    background-color: $primary;
  }
  &--disabled {
    background-color: $surface-container-high;
    opacity: 0.6;
  }
}

.send-icon {
  width: 40rpx;
  height: 40rpx;
  filter: brightness(0) invert(1);
}
</style>
