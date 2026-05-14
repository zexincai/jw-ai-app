<template>
  <!-- Scrim overlay -->
  <view v-if="visible" class="drawer-overlay" @tap="emit('close')" @touchmove.stop.prevent />

  <!-- Sliding panel -->
  <view class="drawer-panel" :class="visible ? 'drawer-panel--open' : ''" @tap.stop>
    <view class="drawer-inner">
      <!-- Role list column: only avatars, full height -->
      <view class="role-column">
        <text class="column-label"></text>
        <scroll-view scroll-y class="role-list">
          <view
            v-for="role in roles"
            :key="role.id"
            class="role-item"
            @tap="selectRole(role.id)"
          >
            <view class="role-avatar" :class="role.id === activeRoleId ? 'role-avatar--active' : ''">
              <image v-if="role.avatarUrl" :src="role.avatarUrl" class="role-avatar-img" mode="aspectFill" />
              <text v-else class="role-avatar-text">{{ role.avatar }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- Right column: sessions + footer -->
      <view class="right-column">
        <!-- Session list column -->
        <view class="session-column">
          <!-- Search row -->
          <view class="search-row">
            <view class="search-box">
              <text class="search-icon">🔍</text>
              <input class="search-input" v-model="searchQuery" placeholder="搜索会话..." placeholder-class="ph" />
            </view>
            <view class="new-btn" @tap="emit('new-chat')">
              <image src="/static/icon-add.svg" class="new-icon" mode="aspectFit" />
            </view>
          </view>

          <!-- Session list -->
          <scroll-view scroll-y class="session-list">
            <view v-if="todaySessions.length">
              <text class="group-label">今天</text>
              <view
                v-for="s in todaySessions"
                :key="s.id"
                class="session-item"
                :class="s.id === activeSessionId ? 'session-item--active' : ''"
                @tap="selectSession(s.id)"
              >
                <text class="session-title">{{ s.title }}</text>
              </view>
            </view>

            <view v-if="yesterdaySessions.length">
              <text class="group-label">昨天</text>
              <view
                v-for="s in yesterdaySessions"
                :key="s.id"
                class="session-item"
                :class="s.id === activeSessionId ? 'session-item--active' : ''"
                @tap="selectSession(s.id)"
              >
                <text class="session-title">{{ s.title }}</text>
              </view>
            </view>

            <view v-if="earlierSessions.length">
              <text class="group-label">更早</text>
              <view
                v-for="s in earlierSessions"
                :key="s.id"
                class="session-item"
                :class="s.id === activeSessionId ? 'session-item--active' : ''"
                @tap="selectSession(s.id)"
              >
                <text class="session-title">{{ s.title }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- Footer: shows active role info -->
        <view class="footer">
          <view class="user-row">
            <view class="avatar">
              <image v-if="activeRole?.avatarUrl" :src="activeRole.avatarUrl" class="footer-avatar-img" mode="aspectFill" />
              <text v-else class="avatar-text">{{ activeRole?.avatar || 'AI' }}</text>
            </view>
            <view class="user-info">
              <text class="user-name">{{ activeRole?.name || 'AI Assistant' }}</text>
              <text class="user-role">{{ activeRole?.orgName || activeRole?.telephone || '' }}</text>
            </view>
          </view>
          <view class="settings-btn" @tap="onSettings">
            <text class="settings-text">⚙ 设置</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  visible:          { type: Boolean, required: true },
  sessions:         { type: Array,   required: true },
  activeSessionId:  { type: String,  required: true },
  roles:            { type: Array,   required: true },
  activeRoleId:     { type: String,  required: true },
})

const emit = defineEmits(['close', 'select-session', 'select-role', 'new-chat', 'open-settings'])

const searchQuery = ref('')

const activeRole = computed(() => props.roles.find(r => r.id === props.activeRoleId) || props.roles[0])

function getDateLabel(isoStr) {
  if (!isoStr) return 'earlier'
  const d = new Date(isoStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const sessionDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (sessionDay >= today) return 'today'
  if (sessionDay >= yesterday) return 'yesterday'
  return 'earlier'
}

const filteredSessions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.sessions
  return props.sessions.filter(s => s.title?.toLowerCase().includes(q))
})

const todaySessions     = computed(() => filteredSessions.value.filter(s => getDateLabel(s.createdAt) === 'today'))
const yesterdaySessions = computed(() => filteredSessions.value.filter(s => getDateLabel(s.createdAt) === 'yesterday'))
const earlierSessions   = computed(() => filteredSessions.value.filter(s => getDateLabel(s.createdAt) === 'earlier'))

function selectSession(id) { emit('select-session', id) }
function selectRole(id)    { emit('select-role', id) }
function onSettings()      { emit('open-settings') }
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.drawer-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
}

.drawer-panel {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: 82vw;
  background-color: $surface-container-lowest;
  z-index: 1000;
  transform: translateX(-100%);
  transition: transform 0.28s ease;
  display: flex;
  flex-direction: column;

  &--open { transform: translateX(0); }
}

.drawer-inner {
  display: flex;
  flex-direction: row;
  height: 100%;
  padding-top: var(--status-bar-height, 44px);
}

.role-column {
  width: 120rpx;
  border-right: 2rpx solid $surface-container;
  display: flex;
  flex-direction: column;
  background-color: #f3f3f3;
  padding: 16rpx 0;
  flex-shrink: 0;
}

.column-label {
  font-size: 18rpx;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2rpx;
  color: $outline;
  text-align: center;
  padding-bottom: 12rpx;
}

.role-list {
  flex: 1;
  height: 0;
}

.role-item {
  display: flex;
  justify-content: center;
  padding: 10rpx 0;
}

.role-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: $radius-xl;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-sizing: border-box;
  border: 3rpx solid transparent;

  &--active {
    border-color: $primary;
  }
}

.role-avatar-img {
  width: 100%;
  height: 100%;
}

.role-avatar-text {
  font-size: 22rpx;
  font-weight: 700;
  color: $on-primary-container;
}

// ── Right column ───────────────────────────────────

.right-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// ── Session column ───────────────────────────────────

.session-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.role-name-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx 16rpx;
  border-bottom: 2rpx solid rgba($outline-variant, 0.15);
}

.role-name-avatar {
  width: 52rpx;
  height: 52rpx;
  border-radius: $radius-lg;
  background-color: $primary-container;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.role-name-avatar-img {
  width: 100%;
  height: 100%;
}

.role-name-avatar-text {
  font-size: 18rpx;
  font-weight: 700;
  color: $on-primary-container;
}

.role-name-info {
  flex: 1;
  overflow: hidden;
}

.role-name-text {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: $primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-org-text {
  display: block;
  font-size: 20rpx;
  color: $outline;
  margin-top: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 16rpx 24rpx;
  gap: 16rpx;
}

.search-box {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: $surface-container-low;
  border-radius: $radius-lg;
  padding: 16rpx 20rpx;
  gap: 12rpx;
}

.search-icon { font-size: 28rpx; color: $outline; }

.search-input {
  flex: 1;
  font-size: 26rpx;
  color: $on-surface;
  background: transparent;
}

.ph { color: $outline; }

.new-btn {
  width: 72rpx;
  height: 72rpx;
  background-color: $primary;
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba($primary, 0.3);
}

.new-icon {
  width: 36rpx;
  height: 36rpx;
  filter: brightness(0) invert(1);
}

.session-list {
  flex: 1;
  height: 0;
  padding: 0 16rpx;
}

.group-label {
  display: block;
  font-size: 20rpx;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2rpx;
  color: $outline;
  padding: 20rpx 16rpx 8rpx;
}

.session-item {
  padding: 20rpx 24rpx;
  border-radius: $radius-lg;
  margin-bottom: 4rpx;

  &--active { background-color: rgba($primary, 0.1); }
}

.session-title {
  font-size: 26rpx;
  color: $on-surface;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-item--active .session-title {
  color: $primary;
  font-weight: 600;
}

// ── Footer ───────────────────────────────────────────

.footer {
  padding: 24rpx;
  border-top: 2rpx solid $surface-container;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom)) ;
}

.user-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: $radius-xl;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.footer-avatar-img {
  width: 100%;
  height: 100%;
}

.avatar-text {
  font-size: 24rpx;
  font-weight: 700;
  color: $on-primary-container;
}

.user-name {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: $on-surface;
}

.user-role {
  display: block;
  font-size: 20rpx;
  color: $outline;
  margin-top: 4rpx;
}

.settings-btn {
  padding: 16rpx 20rpx;
  background-color: $surface-container-lowest;
  border-radius: $radius-lg;
  border: 2rpx solid rgba($outline-variant, 0.3);
}

.settings-text {
  font-size: 26rpx;
  color: $on-surface-variant;
}
</style>
