<template>
  <view class="page">
    <view class="status-bar-spacer" />

    <!-- Topbar -->
    <view class="topbar">
      <view class="topbar-btn" @tap="uni.navigateBack()">
        <text class="topbar-back">‹</text>
      </view>
      <text class="topbar-title">设置</text>
      <view class="topbar-placeholder" />
    </view>

    <!-- Body -->
    <view class="body">
      <!-- Left tab sidebar -->
      <view class="sidebar">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="activeTab === tab.key ? 'tab-item--active' : ''"
          @tap="activeTab = tab.key"
        >
          <text class="tab-label">{{ tab.label }}</text>
        </view>
      </view>

      <!-- Right content panel -->
      <scroll-view scroll-y class="panel">

        <!-- 通用设置 -->
        <template v-if="activeTab === 'general'">
          <text class="panel-title">通用设置</text>
          <view class="card">
            <view class="row">
              <text class="row-label">头像</text>
              <view class="avatar">
                <text class="avatar-text">{{ auth.currentRole.value?.avatar || 'AI' }}</text>
              </view>
            </view>
            <view class="row-divider" />
            <view class="row">
              <text class="row-label">姓名</text>
              <text class="row-value">{{ auth.currentRole.value?.name || '—' }}</text>
            </view>
          </view>

          <view class="logout-card" @tap="onLogout">
            <text class="logout-text">退出登录</text>
          </view>
        </template>


        <!-- 关于我们 -->
        <template v-else-if="activeTab === 'about'">
          <text class="panel-title">关于我们</text>
          <view class="card">
            <view class="row">
              <text class="row-label">应用名称</text>
              <text class="row-value">JClaw</text>
            </view>
            <view class="row-divider" />
            <view class="row">
              <text class="row-label">版本</text>
              <text class="row-value">1.0.0</text>
            </view>
          </view>
        </template>

      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth.js'

const auth = useAuth()
const activeTab = ref('general')

const tabs = [
  { key: 'general', label: '通用设置' },
  { key: 'about',   label: '关于我们' },
]

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    confirmText: '退出',
    confirmColor: '#ba1a1a',
    success(res) {
      if (res.confirm) {
        auth.logout()
        uni.reLaunch({ url: '/pages/login/login' })
      }
    },
  })
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

.topbar-back {
  font-size: 64rpx;
  color: $on-surface;
  line-height: 1;
}

.topbar-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $primary;
  flex: 1;
  text-align: center;
}

.topbar-placeholder {
  width: 72rpx;
}

// ── Body ─────────────────────────────────────────────

.body {
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}

// ── Sidebar ──────────────────────────────────────────

.sidebar {
  width: 200rpx;
  flex-shrink: 0;
  background-color: $surface;
  border-right: 2rpx solid rgba($outline-variant, 0.2);
  padding-top: 16rpx;
}

.tab-item {
  padding: 32rpx 28rpx;
  border-right: 4rpx solid transparent;

  &--active {
    border-right-color: $primary;
    background-color: rgba($primary, 0.06);

    .tab-label {
      color: $primary;
      font-weight: 700;
    }
  }
}

.tab-label {
  font-size: 26rpx;
  color: $on-surface-variant;
}

// ── Panel ─────────────────────────────────────────────

.panel {
  flex: 1;
  padding: 32rpx 28rpx;
}

.panel-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: $on-surface;
  margin-bottom: 24rpx;
}

// ── Card ─────────────────────────────────────────────

.card {
  background-color: $surface-container-lowest;
  border-radius: $radius-xl;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 28rpx 32rpx;
  min-height: 96rpx;
}

.row-label {
  flex: 1;
  font-size: 28rpx;
  color: $on-surface;
}

.row-value {
  font-size: 28rpx;
  color: $on-surface-variant;
}

.row-divider {
  height: 1rpx;
  background-color: rgba($outline-variant, 0.5);
  margin: 0 32rpx;
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: $radius-full;
  background: linear-gradient(135deg, #005fae, #4b9bfa);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba($primary, 0.3);
}

.avatar-text {
  font-size: 22rpx;
  font-weight: 700;
  color: $on-primary;
}

// ── Logout ───────────────────────────────────────────

.logout-card {
  margin-top: 32rpx;
  background-color: $surface-container-lowest;
  border-radius: $radius-xl;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-text {
  font-size: 28rpx;
  font-weight: 600;
  color: $error;
}

// ── Empty state ──────────────────────────────────────

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: $outline;
}
</style>
