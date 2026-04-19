<template>
  <view class="input-bar-wrapper">
    <view class="input-bar">
      <!-- Icon stubs (no handlers — out of scope) -->
      <view class="icon-btn">
        <image src="/static/icon-camera.svg" class="icon" mode="aspectFit" />
      </view>
      <view class="icon-btn">
        <image src="/static/icon-attach.svg" class="icon" mode="aspectFit" />
      </view>
      <view class="icon-btn">
        <image src="/static/icon-mic.svg" class="icon" mode="aspectFit" />
      </view>

      <!-- Auto-height textarea (no type attribute — must stay as plain textarea) -->
      <textarea
        v-model="inputText"
        class="input-field"
        :auto-height="true"
        :max-height="200"
        placeholder="Message Architect AI..."
        placeholder-class="input-placeholder"
        @confirm="handleSend"
      />

      <!-- Send button -->
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
  background: linear-gradient(to top, $surface 80%, transparent);
  padding-top: 16rpx;
  padding-left: 24rpx;
  padding-right: 24rpx;
}

.input-bar {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  background-color: rgba(255, 255, 255, 0.85);
  border: 2rpx solid rgba($outline-variant, 0.3);
  border-radius: 32rpx;
  padding: 12rpx 12rpx 12rpx 16rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}

.icon-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon {
  width: 44rpx;
  height: 44rpx;
}

.input-field {
  flex: 1;
  font-size: 28rpx;
  color: $on-surface;
  padding: 16rpx 16rpx;
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
