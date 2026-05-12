<template>
  <view class="welcome">
    <!-- 问候区 -->
    <view class="welcome-greeting">
      <view class="welcome-logo-wrap">
        <image src="/static/logo.png" class="welcome-logo" mode="aspectFill" />
      </view>
      <text class="welcome-title">Hi，我是 JClaw</text>
    </view>

    <!-- 快捷操作 + 输入框卡片 -->
    <view class="welcome-card">
      <QuickActions @action="handleQuickAction" />
      <view class="welcome-input-wrap">
        <InputBar @send="handleSend" />
      </view>
    </view>

    <!-- 免责声明 -->
    <text class="welcome-disclaimer">内容由 AI 生成，请注意甄别！</text>
  </view>
</template>

<script setup>
import InputBar from './InputBar.vue'
import QuickActions from './QuickActions.vue'
import { useChat } from '@/composables/useChat.js'

const chat = useChat()
const emit = defineEmits(['send'])

function handleSend({ text, attachments }) {
  emit('send', { text, attachments })
}

function handleQuickAction(text) {
  if (text) {
    emit('send', { text, attachments: [] })
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx 32rpx;
  background-color: $surface;
  min-height: 0;
}

.welcome-greeting {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 64rpx;
}

.welcome-logo-wrap {
  width: 160rpx;
  height: 160rpx;
  border-radius: 40rpx;
  background-color: $surface;
  box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8rpx;
  margin-bottom: 32rpx;
  transform: rotate(3deg);
}

.welcome-logo {
  width: 100%;
  height: 100%;
  border-radius: 32rpx;
}

.welcome-title {
  font-size: 52rpx;
  font-weight: 700;
  color: $on-surface;
  letter-spacing: 2rpx;
}

.welcome-card {
  width: 100%;
  background-color: $surface;
  border-radius: 40rpx;
  border: 2rpx solid $surface-container-lowest;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.welcome-input-wrap {
  padding: 8rpx 16rpx 16rpx;
}

.welcome-disclaimer {
  font-size: 22rpx;
  color: $outline;
  margin-top: 48rpx;
}
</style>
