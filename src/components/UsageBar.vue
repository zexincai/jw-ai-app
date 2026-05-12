<template>
  <view class="usage-bar">
    <view class="usage-left">
      <view class="usage-avatar">
        <image v-if="role.avatarUrl" :src="role.avatarUrl" class="usage-avatar-img" mode="aspectFill" />
        <text v-else class="usage-avatar-text">{{ role.avatar || role.name?.slice(0, 2)?.toUpperCase() }}</text>
      </view>
      <view class="usage-info">
        <text class="usage-name">{{ role.name || '未登录' }}</text>
        <text v-if="role.orgName" class="usage-org">{{ role.orgName }}</text>
      </view>
    </view>
    <view class="usage-right">
      <view class="usage-btn" @tap="openSettings">
        <text class="usage-btn-icon">⚙</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth.js'

const auth = useAuth()
const role = computed(() => auth.currentRole.value || {})

function openSettings() {
  uni.navigateTo({ url: '/pages/settings/settings' })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.usage-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background-color: $surface;
  border-top: 2rpx solid $surface-container-lowest;
  flex-shrink: 0;
}

.usage-left {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}

.usage-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: $radius-lg;
  overflow: hidden;
  background: linear-gradient(135deg, $primary, lighten($primary, 15%));
  display: flex;
  align-items: center;
  justify-content: center;
}

.usage-avatar-img {
  width: 100%;
  height: 100%;
}

.usage-avatar-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #fff;
}

.usage-info {
  display: flex;
  flex-direction: column;
}

.usage-name {
  font-size: 26rpx;
  font-weight: 600;
  color: $on-surface;
}

.usage-org {
  font-size: 22rpx;
  color: $outline;
  margin-top: 2rpx;
}

.usage-right {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.usage-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: $surface-container-lowest;
}

.usage-btn-icon {
  font-size: 32rpx;
}
</style>
