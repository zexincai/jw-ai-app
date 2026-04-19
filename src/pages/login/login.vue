<template>
  <view class="page">
    <!-- Status bar spacer -->
    <view class="status-bar-spacer" />

    <!-- Content area -->
    <view class="content">
      <!-- Logo block -->
      <view class="logo-block">
        <view class="logo-icon">
          <text class="logo-symbol">⬟</text>
        </view>
        <text class="app-title">HI, JClaw</text>
        <text class="app-subtitle">Welcome back to Project Architect</text>
      </view>

      <!-- Form -->
      <view class="form">
        <!-- Phone input -->
        <view class="input-row">
          <text class="input-icon">📱</text>
          <input
            v-model="phone"
            class="text-input"
            type="tel"
            placeholder="Phone number"
            placeholder-class="ph"
          />
        </view>

        <!-- Code input row -->
        <view class="code-row">
          <view class="input-row input-row--flex">
            <text class="input-icon">🔐</text>
            <input
              v-model="code"
              class="text-input"
              type="number"
              placeholder="Verification code"
              placeholder-class="ph"
            />
          </view>
          <view
            class="get-code-btn"
            :class="countdown > 0 ? 'get-code-btn--disabled' : ''"
            @tap="startCountdown"
          >
            <text class="get-code-text">
              {{ countdown > 0 ? `${countdown}s` : 'Get Code' }}
            </text>
          </view>
        </view>

        <!-- Login button -->
        <view class="login-btn" @tap="handleLogin">
          <text class="login-btn-text">Login</text>
          <text class="login-btn-arrow">→</text>
        </view>
      </view>

      <!-- Secondary links (decorative) -->
      <view class="links">
        <text class="link-text">Forgot password?</text>
        <view class="signup-row">
          <text class="link-muted">Don't have an account? </text>
          <text class="link-text">Sign Up</text>
        </view>
      </view>
    </view>

    <!-- Bottom wave decoration -->
    <view class="wave-wrap">
      <image src="/static/wave.svg" class="wave-img" mode="scaleToFill" />
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'

const phone = ref('')
const code  = ref('')
const countdown = ref(0)

let countdownTimer = null

function startCountdown() {
  if (countdown.value > 0) return
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

function handleLogin() {
  if (!phone.value.trim() || !code.value.trim()) {
    uni.showToast({ title: 'Please fill in all fields', icon: 'none' })
    return
  }
  uni.reLaunch({ url: '/pages/chat/chat' })
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.page {
  min-height: 100vh;
  background-color: $surface;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.status-bar-spacer {
  height: var(--status-bar-height, 44px);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 60rpx;
}

/* Logo */
.logo-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
}

.logo-icon {
  width: 160rpx;
  height: 160rpx;
  background: linear-gradient(135deg, #005fae, #4b9bfa);
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
  box-shadow: 0 16rpx 48rpx rgba($primary, 0.3);
}

.logo-symbol {
  font-size: 80rpx;
  color: $on-primary;
}

.app-title {
  font-size: 64rpx;
  font-weight: 800;
  color: $on-surface;
  letter-spacing: -2rpx;
}

.app-subtitle {
  font-size: 26rpx;
  color: $on-surface-variant;
  margin-top: 12rpx;
}

/* Form */
.form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.input-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: $surface-container-lowest;
  border-radius: $radius-xl;
  padding: 28rpx 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  gap: 16rpx;

  &--flex {
    flex: 1;
    padding: 0;
    box-shadow: none;
    background: transparent;
  }
}

.input-icon {
  font-size: 36rpx;
  flex-shrink: 0;
}

.text-input {
  flex: 1;
  font-size: 28rpx;
  color: $on-surface;
  background: transparent;
}

.ph { color: rgba($outline-variant, 0.8); }

.code-row {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
  background-color: $surface-container-lowest;
  border-radius: $radius-xl;
  padding: 28rpx 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  align-items: center;
}

.get-code-btn {
  flex-shrink: 0;
  padding: 16rpx 28rpx;
  background-color: $surface-container-highest;
  border-radius: $radius-lg;

  &--disabled { opacity: 0.5; }
}

.get-code-text {
  font-size: 24rpx;
  font-weight: 600;
  color: $primary;
  white-space: nowrap;
}

.login-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: linear-gradient(135deg, #005fae, #4b9bfa);
  border-radius: $radius-xl;
  padding: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba($primary, 0.3);
}

.login-btn-text {
  font-size: 32rpx;
  font-weight: 700;
  color: $on-primary;
}

.login-btn-arrow {
  font-size: 32rpx;
  color: $on-primary;
}

/* Links */
.links {
  margin-top: 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.link-text {
  font-size: 26rpx;
  font-weight: 600;
  color: $primary;
}

.signup-row {
  display: flex;
  flex-direction: row;
}

.link-muted {
  font-size: 26rpx;
  color: $on-surface-variant;
}

/* Wave */
.wave-wrap {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 240rpx;
  pointer-events: none;
}

.wave-img {
  width: 100%;
  height: 100%;
}
</style>
