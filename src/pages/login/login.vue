<template>
  <view class="page">
    <view class="status-bar-spacer" />

    <view class="content">
      <!-- Logo block -->
      <view class="logo-block">
        <view class="logo-icon">
          <image src="/static/logo.png" class="logo-img" mode="aspectFit" />
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
            :maxlength="11"
            placeholder="手机号"
            placeholder-class="ph"
          />
        </view>

        <!-- Code input row -->
        <view class="code-row">
          <view class="input-row input-row--flex">
            <text class="input-icon">🔐</text>
            <input
              v-model="smsCode"
              class="text-input"
              type="number"
              :maxlength="6"
              placeholder="短信验证码"
              placeholder-class="ph"
            />
          </view>
          <view
            class="get-code-btn"
            :class="countdown > 0 || loading ? 'get-code-btn--disabled' : ''"
            @tap="onGetCode"
          >
            <text class="get-code-text">
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </text>
          </view>
        </view>

        <!-- Login button -->
        <view class="login-btn" :class="loading ? 'login-btn--disabled' : ''" @tap="handleLogin">
          <text class="login-btn-text">{{ loading ? '登录中...' : '登 录' }}</text>
        </view>
      </view>
    </view>

    <!-- Slider captcha modal -->
    <view v-if="showCaptcha" class="captcha-modal" @tap="showCaptcha = false">
      <view class="captcha-card" @tap.stop>
        <SliderCaptcha
          :bg-img="captcha.bgImg"
          :piece-img="captcha.pieceImg"
          :ori-image-width="captcha.oriImageWidth"
          :ori-image-height="captcha.oriImageHeight"
          :piece-y="captcha.yHeight"
          @success="onSliderSuccess"
          @cancel="showCaptcha = false"
        />
      </view>
    </view>

    <view class="wave-wrap">
      <image src="/static/wave.svg" class="wave-img" mode="scaleToFill" />
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import SliderCaptcha from '@/components/SliderCaptcha.vue'
import { useAuth } from '@/composables/useAuth.js'
import { getCaptchaApi, sendSmsCodeApi } from '@/api/login.js'

const auth = useAuth()

const phone = ref(uni.getStorageSync('jclaw_last_phone') || '')
const smsCode = ref('')
const countdown = ref(0)
const loading = ref(false)
const showCaptcha = ref(false)
const captcha = ref({ bgImg: '', pieceImg: '', oriImageWidth: 320, oriImageHeight: 0, yHeight: 0, uuid: '' })

let countdownTimer = null
let smsUuid = ''

async function onGetCode() {
  if (countdown.value > 0 || loading.value) return
  const p = phone.value.trim()
  if (!p) {
    uni.showToast({ title: '请输入手机号', icon: 'none' })
    return
  }
  if (!/^1\d{10}$/.test(p)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  try {
    loading.value = true
    const res = await getCaptchaApi()
    const data = res.data || res
    captcha.value = {
      bgImg: data.img || data.bgImage || '',
      pieceImg: data.smallImage || data.pieceImage || '',
      oriImageWidth: data.oriImageWidth || 320,
      oriImageHeight: data.oriImageHeight || 0,
      yHeight: data.yHeight || 0,
      uuid: data.uuid || '',
    }
    showCaptcha.value = true
  } catch (e) {
    if (!e?.handled) uni.showToast({ title: e?.message || '获取验证码失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function onSliderSuccess(distance) {
  showCaptcha.value = false
  const p = phone.value.trim()
  try {
    loading.value = true
    const res = await sendSmsCodeApi({
      phoneNumber: p,
      uuid: captcha.value.uuid,
      code: distance,
      sendType: 1,
    })
    const data = res.data ?? res
    smsUuid = typeof data === 'string' ? data : (data.uuid || data.smsUuid || '')
    startCountdown()
    uni.showToast({ title: '验证码已发送', icon: 'success' })
  } catch (e) {
    if (!e?.handled) uni.showToast({ title: e?.message || '发送失败，请重试', icon: 'none' })
    // Refresh captcha on failure
    try {
      const res2 = await getCaptchaApi()
      const d = res2.data || res2
      captcha.value = {
        bgImg: d.img || d.bgImage || '',
        pieceImg: d.smallImage || d.pieceImage || '',
        oriImageWidth: d.oriImageWidth || 320,
        oriImageHeight: d.oriImageHeight || 0,
        yHeight: d.yHeight || 0,
        uuid: d.uuid || '',
      }
      showCaptcha.value = true
    } catch {}
  } finally {
    loading.value = false
  }
}

function startCountdown() {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

async function handleLogin() {
  if (loading.value) return
  const p = phone.value.trim()
  const c = smsCode.value.trim()
  if (!p || !c) {
    uni.showToast({ title: '请填写手机号和验证码', icon: 'none' })
    return
  }
  if (!/^1\d{10}$/.test(p)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (c.length < 4) {
    uni.showToast({ title: '请输入完整的验证码', icon: 'none' })
    return
  }
  if (!smsUuid) {
    uni.showToast({ title: '请先获取验证码', icon: 'none' })
    return
  }
  try {
    loading.value = true
    await auth.loginByMobile(p, c, smsUuid)
    uni.reLaunch({ url: '/pages/chat/chat' })
  } catch (e) {
    if (!e?.handled) uni.showToast({ title: e?.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
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

.logo-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
}

.logo-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
  overflow: hidden;
}

.logo-img {
  width: 100%;
  height: 100%;
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

  &--disabled { opacity: 0.7; }
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

/* Captcha modal */
.captcha-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.captcha-card {
  width: 660rpx;
  border-radius: $radius-xl;
  overflow: hidden;
  background: $surface;
  box-shadow: 0 24rpx 64rpx rgba(0, 0, 0, 0.2);
}

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
