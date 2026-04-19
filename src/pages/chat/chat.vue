<template>
  <view class="page">
    <view class="status-bar-spacer" />

    <view class="topbar">
      <view class="topbar-btn" @tap="drawerVisible = true">
        <image src="/static/icon-menu.svg" class="topbar-icon" mode="aspectFit" />
      </view>
      <text class="topbar-title">{{ auth.currentRole?.name || 'JClaw' }}</text>
    </view>

    <scroll-view
      scroll-y
      class="message-list"
      :scroll-into-view="scrollTarget"
    >
      <view class="message-list-inner">
        <ChatBubble
          v-for="msg in store.activeMessages"
          :key="msg.id"
          :message="msg"
        />

        <view v-if="store.aiReplying && store.activeMessages.at(-1)?.status !== 'streaming'" class="typing-row">
          <view class="typing-icon">
            <image src="/static/logo.png" class="typing-icon-img" mode="aspectFit" />
          </view>
          <view class="typing-bubble">
            <view class="dot" />
            <view class="dot dot--2" />
            <view class="dot dot--3" />
          </view>
        </view>

        <view id="msg-bottom" class="scroll-anchor" />
      </view>
    </scroll-view>

    <InputBar @send="handleSend" />

    <DrawerNav
      :visible="drawerVisible"
      :sessions="store.sessions"
      :active-session-id="store.activeSessionId"
      :roles="auth.roles.value"
      :active-role-id="auth.currentRoleId.value"
      @close="drawerVisible = false"
      @select-session="handleSelectSession"
      @select-role="handleSelectRole"
      @new-chat="handleNewChat"
      @open-settings="handleOpenSettings"
    />
  </view>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useAuth } from '@/composables/useAuth.js'
import { useWukongIM } from '@/composables/useWukongIM.js'
import { useChat } from '@/composables/useChat.js'
import ChatBubble from '@/components/ChatBubble.vue'
import InputBar from '@/components/InputBar.vue'
import DrawerNav from '@/components/DrawerNav.vue'

const store = useChatStore()
const auth = useAuth()
const wkIM = useWukongIM()
const chat = useChat()
const drawerVisible = ref(false)
const scrollTarget = ref('')

watch(
  () => store.activeMessages.length,
  () => {
    scrollTarget.value = ''
    nextTick(() => { scrollTarget.value = 'msg-bottom' })
  }
)

onMounted(async () => {
  await chat.loadSessions()
  if (store.activeSessionId) {
    await chat.loadSession(store.activeSessionId)
  }
  // Connect WUKONGIM if not already connected
  const role = auth.currentRole.value
  if (role && wkIM.status.value !== 'connected') {
    wkIM.connect(role.userId, role.telephone, auth.token.value).catch(() => {})
  }
})

function handleSend({ text, attachments }) {
  if (!text?.trim() && !attachments?.length) return
  chat.send(text || '', attachments || [])
}

async function handleSelectSession(id) {
  await chat.loadSession(id)
  drawerVisible.value = false
}

async function handleSelectRole(id) {
  await auth.switchRole(id)
  const role = auth.currentRole.value
  if (role) {
    wkIM.disconnect()
    wkIM.connect(role.userId, role.telephone, auth.token.value).catch(() => {})
  }
  await chat.loadSessions()
  if (store.sessions.length) {
    await chat.loadSession(store.sessions[0].id)
  } else {
    store.newLocalSession()
  }
  drawerVisible.value = false
}

function handleNewChat() {
  store.newLocalSession()
  drawerVisible.value = false
}

function handleOpenSettings() {
  drawerVisible.value = false
  uni.navigateTo({ url: '/pages/settings/settings' })
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
  flex: 1;
  text-align: center;
}

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
  overflow: hidden;
}

.typing-icon-img {
  width: 100%;
  height: 100%;
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
