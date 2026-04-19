<template>
  <!-- Scrim overlay -->
  <view v-if="visible" class="drawer-overlay" @tap="emit('close')" />

  <!-- Sliding panel -->
  <view class="drawer-panel" :class="visible ? 'drawer-panel--open' : ''" @tap.stop>
    <view class="drawer-inner">
      <!-- Search (non-functional this phase) -->
      <view class="search-row">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input class="search-input" placeholder="Search sessions..." placeholder-class="ph" disabled />
        </view>
        <view class="new-btn" @tap="emit('new-chat')">
          <image src="/static/icon-add.svg" class="new-icon" mode="aspectFit" />
        </view>
      </view>

      <!-- Session list -->
      <scroll-view scroll-y class="session-list">
        <!-- Today -->
        <view v-if="todaySessions.length">
          <text class="group-label">Today</text>
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

        <!-- Yesterday -->
        <view v-if="yesterdaySessions.length">
          <text class="group-label">Yesterday</text>
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
      </scroll-view>

      <!-- Footer user info -->
      <view class="footer">
        <view class="user-row">
          <view class="avatar">
            <text class="avatar-text">DA</text>
          </view>
          <view class="user-info">
            <text class="user-name">Digital Architect</text>
            <text class="user-role">Lead Planner · Premium</text>
          </view>
        </view>
        <!-- Settings: non-interactive this phase -->
        <view class="settings-btn">
          <text class="settings-text">⚙ Settings</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible:         { type: Boolean, required: true },
  sessions:        { type: Array,   required: true },
  activeSessionId: { type: String,  required: true },
})

const emit = defineEmits(['close', 'select-session', 'new-chat'])

const todaySessions     = computed(() => props.sessions.filter(s => s.date === 'today'))
const yesterdaySessions = computed(() => props.sessions.filter(s => s.date === 'yesterday'))

function selectSession(id) {
  emit('select-session', id)
}
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

  &--open {
    transform: translateX(0);
  }
}

.drawer-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-top: var(--status-bar-height, 44px);
}

.search-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 24rpx 24rpx 16rpx;
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

.search-icon {
  font-size: 28rpx;
  color: $outline;
}

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
  padding: 0 16rpx;
}

.group-label {
  display: block;
  font-size: 20rpx;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2rpx;
  color: $outline;
  padding: 24rpx 16rpx 8rpx;
}

.session-item {
  padding: 20rpx 24rpx;
  border-radius: $radius-lg;
  margin-bottom: 4rpx;

  &--active {
    background-color: rgba($primary, 0.1);
  }
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

.footer {
  padding: 24rpx;
  border-top: 2rpx solid $surface-container;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
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
  background-color: $primary-container;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
