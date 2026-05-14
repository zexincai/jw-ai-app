<template>
  <view class="page">
    <view class="status-bar-spacer" />

    <view class="topbar">
      <view class="topbar-btn" @tap="goLogin">
        <image src="/static/icon-back.svg" class="topbar-icon" mode="aspectFit" />
      </view>
      <text class="topbar-title">JClaw</text>
      <view class="topbar-todo" @tap="todoPanelType = 0">
        <image src="/static/icon-todo.svg" class="topbar-todo-icon" mode="aspectFit" />
        <text class="topbar-todo-label">待办</text>
        <text v-if="todoTotalCount > 0" class="topbar-todo-badge">{{ todoTotalCount > 99 ? '99+' : todoTotalCount }}</text>
      </view>
    </view>

    <view class="role-bar">
      <view class="role-bar-btn" @tap="drawerVisible = true">
        <image src="/static/icon-menu.svg" class="role-bar-icon" mode="aspectFit" />
      </view>
      <text class="role-bar-name">{{ currentRole?.name || '' }}</text>
    </view>

    <!-- 无消息时显示欢迎页 -->
    <WelcomeState
      v-if="!store.activeMessages.length && !store.aiReplying"
      @send="handleSend"
    />

    <scroll-view
      v-else-if="!drawerVisible"
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
    <view v-else class="message-list" />

    <InputBar v-if="store.activeMessages.length || store.aiReplying" @send="handleSend" />

    <BacklogPanel
      v-if="todoPanelType !== null"
      :message-type="todoPanelType"
      @close="todoPanelType = null"
    />

    <DrawerNav
      :visible="drawerVisible"
      :sessions="store.sessions"
      :active-session-id="store.activeSessionId"
      :roles="roles"
      :active-role-id="currentRoleId"
      @close="drawerVisible = false"
      @select-session="handleSelectSession"
      @select-role="handleSelectRole"
      @new-chat="handleNewChat"
      @open-settings="handleOpenSettings"
    />

    <view v-if="switching" class="global-loading">
      <view class="global-loading-box">
        <view class="global-loading-spinner" />
        <text class="global-loading-text">切换角色中…</text>
      </view>
    </view>

    <ConnectionStatusModal
      :visible="connectionModalVisible"
      :status="store.wsStatus"
      @close="connectionModalVisible = false"
      @reconnect="handleReconnect"
    />
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useAuth } from '@/composables/useAuth.js'
import { useWukongIM } from '@/composables/useWukongIM.js'
import { useChat } from '@/composables/useChat.js'
import ChatBubble from '@/components/ChatBubble.vue'
import InputBar from '@/components/InputBar.vue'
import DrawerNav from '@/components/DrawerNav.vue'
import BacklogPanel from '@/components/BacklogPanel.vue'
import WelcomeState from '@/components/WelcomeState.vue'
import ConnectionStatusModal from '@/components/ConnectionStatusModal.vue'
import { useBacklog } from '@/composables/useBacklog.js'

const store = useChatStore()
const { token, currentRole, currentRoleId, roles, switchRole } = useAuth()
const wkIM = useWukongIM()
const chat = useChat()
const { typeItemsMap, revealedPrivateIds, isVisible, fetchTypeTotals } = useBacklog()
const drawerVisible = ref(false)
const todoPanelType = ref(null)

const roleIdSet = computed(() => new Set(roles.value.map(role => String(role.userId))))
const todoTotalCount = computed(() => {
  void revealedPrivateIds.value
  let total = 0
  ;[0, 1, 2].forEach(type => {
    total += (typeItemsMap.value[type] ?? []).filter(item =>
      isVisible(item) && roleIdSet.value.has(String(item.fkUserId)),
    ).length
  })
  return total
})
const scrollTarget = ref('')
const switching = ref(false)
const connectionModalVisible = ref(false)

async function scrollToBottom() {
  scrollTarget.value = ''
  await nextTick()
  scrollTarget.value = 'msg-bottom'
}

watch(
  () => store.activeMessages.length,
  () => { void scrollToBottom() }
)

watch(
  () => store.aiReplying,
  (val) => {
    if (!val) {
      // AI finished — scroll to bottom
      void scrollToBottom()
    }
  }
)

onMounted(async () => {
  await chat.loadSessions()
  if (store.activeSessionId) {
    await chat.loadSession(store.activeSessionId)
    await scrollToBottom()
  }
  // Connect WUKONGIM if not already connected
  const role = currentRole.value
  if (role && wkIM.status.value !== 'connected') {
    wkIM.connect(role.userId, role.telephone, token.value).catch(() => {})
  }
  // Fetch backlog counts
  fetchTypeTotals().catch(() => {})
})

function handleSend({ text, attachments }) {
  if (!text?.trim() && !attachments?.length) return
  chat.send(text || '', attachments || [])
}

async function handleSelectSession(id) {
  await chat.loadSession(id)
  await scrollToBottom()
  drawerVisible.value = false
}

async function handleSelectRole(id) {
  drawerVisible.value = false
  switching.value = true
  try {
    await switchRole(id)
    const role = currentRole.value
    if (role) {
      wkIM.disconnect()
      wkIM.connect(role.userId, role.telephone, token.value).catch(() => {})
    }
    await chat.loadSessions()
    if (store.sessions.length) {
      await chat.loadSession(store.sessions[0].id)
      await scrollToBottom()
    } else {
      store.newLocalSession()
    }
  } finally {
    switching.value = false
  }
}

function handleNewChat() {
  store.newLocalSession()
  drawerVisible.value = false
}

function handleOpenSettings() {
  drawerVisible.value = false
  uni.navigateTo({ url: '/pages/settings/settings' })
}

function goLogin() {
  uni.reLaunch({ url: '/pages/login/login' })
}

watch(
  () => store.wsStatus,
  (val) => {
    if (val === 'disconnected' || val === 'failed') {
      connectionModalVisible.value = true
    } else if (val === 'connected') {
      connectionModalVisible.value = false
    }
  }
)

function handleReconnect() {
  connectionModalVisible.value = false
  const role = currentRole.value
  if (role) {
    wkIM.connect(role.userId, role.telephone, token.value).catch(() => {})
  }
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

.topbar-todo {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 16rpx;
  border-radius: $radius-full;
  background-color: $surface-container-lowest;
}

.topbar-todo-icon {
  width: 32rpx;
  height: 32rpx;
}

.topbar-todo-label {
  font-size: 24rpx;
  font-weight: 500;
  color: $on-surface;
}

.topbar-todo-badge {
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  background: #ef4444;
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  border-radius: 9999px;
  line-height: 32rpx;
  text-align: center;
}

.role-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 24rpx;
  background-color: $surface;
  flex-shrink: 0;
  border-bottom: 2rpx solid rgba($outline-variant, 0.2);
}

.role-bar-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
}

.role-bar-icon {
  width: 36rpx;
  height: 36rpx;
}

.role-bar-name {
  font-size: 26rpx;
  font-weight: 500;
  color: $on-surface-variant;
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

.global-loading {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.global-loading-box {
  background-color: $surface;
  border-radius: $radius-xl;
  padding: 48rpx 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.18);
}

.global-loading-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 6rpx solid rgba($primary, 0.2);
  border-top-color: $primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.global-loading-text {
  font-size: 28rpx;
  color: $on-surface-variant;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
