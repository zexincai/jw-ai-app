<template>
  <view class="page">
    <!-- Status bar spacer -->
    <view class="status-bar-spacer" />

    <!-- Top App Bar -->
    <view class="topbar">
      <view class="topbar-btn" @tap="drawerVisible = true">
        <image src="/static/icon-menu.svg" class="topbar-icon" mode="aspectFit" />
      </view>
      <text class="topbar-title">Project Architect</text>
      <view class="topbar-btn" @tap="handleNewChat">
        <image src="/static/icon-add.svg" class="topbar-icon" mode="aspectFit" />
      </view>
    </view>

    <!-- Message list -->
    <scroll-view
      scroll-y
      class="message-list"
      :scroll-into-view="scrollTarget"
    >
      <view class="message-list-inner">
        <ChatBubble
          v-for="msg in store.currentMessages"
          :key="msg.id"
          :message="msg"
        />

        <!-- Typing indicator -->
        <view v-if="store.isTyping" class="typing-row">
          <view class="typing-icon">
            <text class="typing-icon-text">AI</text>
          </view>
          <view class="typing-bubble">
            <view class="dot" />
            <view class="dot dot--2" />
            <view class="dot dot--3" />
          </view>
        </view>

        <!-- Scroll anchor -->
        <view id="msg-bottom" class="scroll-anchor" />
      </view>
    </scroll-view>

    <!-- Input bar -->
    <InputBar @send="handleSend" />

    <!-- Drawer navigation (sibling to scroll-view, NOT inside it) -->
    <DrawerNav
      :visible="drawerVisible"
      :sessions="store.sessions"
      :active-session-id="store.activeSessionId"
      @close="drawerVisible = false"
      @select-session="handleSelectSession"
      @new-chat="handleNewChat"
    />
  </view>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useChatStore } from '@/stores/chat'
import ChatBubble from '@/components/ChatBubble.vue'
import InputBar from '@/components/InputBar.vue'
import DrawerNav from '@/components/DrawerNav.vue'

const store = useChatStore()
const drawerVisible = ref(false)
const scrollTarget = ref('')

// Auto-scroll to bottom whenever messages are added
watch(
  () => store.currentMessages.length,
  () => {
    scrollTarget.value = ''
    nextTick(() => {
      scrollTarget.value = 'msg-bottom'
    })
  }
)

function handleSend(text) {
  store.sendMessage(text)
}

function handleSelectSession(id) {
  store.switchSession(id)
  drawerVisible.value = false
}

function handleNewChat() {
  store.newSession()
  drawerVisible.value = false
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: $surface;
  overflow: hidden;
}

.status-bar-spacer {
  height: var(--status-bar-height, 44px);
  background-color: $surface;
  flex-shrink: 0;
}

/* TopAppBar */
.topbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 96rpx;
  background-color: $surface;
  flex-shrink: 0;
  border-bottom: 2rpx solid rgba($outline-variant, 0.2);
}

.topbar-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
}

.topbar-icon {
  width: 44rpx;
  height: 44rpx;
}

.topbar-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $primary;
}

/* Message list */
.message-list {
  flex: 1;
  overflow: hidden;
}

.message-list-inner {
  padding: 24rpx 24rpx 40rpx;
}

.scroll-anchor {
  height: 2rpx;
}

/* Typing indicator */
.typing-row {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  margin-bottom: 24rpx;
}

.typing-icon {
  width: 56rpx;
  height: 56rpx;
  background-color: $primary;
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.typing-icon-text {
  color: $on-primary;
  font-size: 20rpx;
  font-weight: 700;
}

.typing-bubble {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
  background-color: $surface-container-lowest;
  padding: 20rpx 28rpx;
  border-radius: $radius-xl;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: $outline;
  animation: bounce 1.2s infinite;

  &--2 { animation-delay: 0.2s; }
  &--3 { animation-delay: 0.4s; }
}

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30%            { transform: translateY(-10rpx); }
}
</style>
