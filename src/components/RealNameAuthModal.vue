<template>
  <view v-if="visible" class="rna-overlay">
    <view class="rna-box">
      <!-- 顶部装饰 -->
      <view class="rna-bar" />

      <!-- 标题 -->
      <view class="rna-title-section">
        <text class="rna-title">个人实名认证</text>
        <text class="rna-desc">您的账号需要完成实名认证才能继续使用系统</text>
      </view>

      <!-- 步骤指示器 -->
      <view class="rna-steps">
        <view v-for="(s, i) in steps" :key="i" class="rna-step-row">
          <view
            class="rna-step-dot"
            :class="{
              'rna-step-dot--done': step > i + 1,
              'rna-step-dot--active': step === i + 1,
            }"
          >
            <text v-if="step > i + 1">✓</text>
            <text v-else>{{ i + 1 }}</text>
          </view>
          <text
            class="rna-step-label"
            :class="{
              'rna-step-label--active': step === i + 1,
              'rna-step-label--done': step > i + 1,
            }"
          >{{ s }}</text>
          <view v-if="i < steps.length - 1" class="rna-step-line" />
        </view>
      </view>

      <!-- Step 1: 填写信息 -->
      <view v-if="step === 1" class="rna-content">
        <view class="rna-field">
          <text class="rna-field-label">真实姓名 <text class="rna-required">*</text></text>
          <input v-model="form.name" class="rna-input" placeholder="请输入真实姓名" />
        </view>

        <view class="rna-field">
          <text class="rna-field-label">证件类型 <text class="rna-required">*</text></text>
          <picker :value="certTypeIdx" :range="certTypes" range-key="label" @change="onCertTypeChange">
            <view class="rna-input rna-input--picker">
              <text :class="form.certType ? '' : 'rna-placeholder'">{{ form.certType ? certTypes[certTypeIdx].label : '请选择证件类型' }}</text>
            </view>
          </picker>
        </view>

        <view class="rna-field">
          <text class="rna-field-label">证件号码 <text class="rna-required">*</text></text>
          <input v-model="form.certNo" class="rna-input" placeholder="请输入证件号码" />
        </view>

        <view class="rna-field">
          <text class="rna-field-label">手机号 <text class="rna-required">*</text></text>
          <view class="rna-sms-row">
            <input v-model="form.phone" class="rna-input rna-input--flex" placeholder="请输入手机号" type="number" maxlength="11" />
            <view class="rna-sms-btn" :class="{ 'rna-sms-btn--disabled': smsCooldown }" @tap="!smsCooldown && sendSms()">
              <text>{{ smsCooldown ? `${smsCooldown}s` : '获取验证码' }}</text>
            </view>
          </view>
        </view>

        <view class="rna-field">
          <text class="rna-field-label">验证码 <text class="rna-required">*</text></text>
          <input v-model="form.smsCode" class="rna-input" placeholder="请输入验证码" type="number" maxlength="6" />
        </view>

        <SliderCaptcha
          v-if="captchaVisible"
          @success="onCaptchaSuccess"
          @cancel="captchaVisible = false"
        />

        <view class="rna-action">
          <view class="rna-btn rna-btn--primary" @tap="submitStep1">
            <text>{{ submitting ? '提交中…' : '下一步' }}</text>
          </view>
        </view>
      </view>

      <!-- Step 2: 人脸识别 -->
      <view v-else-if="step === 2" class="rna-content">
        <view class="rna-qr-wrap">
          <text class="rna-qr-hint">请使用手机扫描以下二维码完成人脸识别</text>
          <image v-if="qrCodeUrl" :src="qrCodeUrl" class="rna-qr-img" mode="aspectFit" />
          <view v-else class="rna-qr-loading">
            <text>正在获取二维码…</text>
          </view>
        </view>
        <view class="rna-action">
          <view class="rna-btn" @tap="checkFaceStatus">
            <text>{{ faceChecking ? '检测中…' : '已完成人脸识别' }}</text>
          </view>
        </view>
      </view>

      <!-- Step 3: 成功 -->
      <view v-else-if="step === 3" class="rna-content rna-content--center">
        <text class="rna-icon-success">✓</text>
        <text class="rna-msg-success">实名认证成功</text>
        <text class="rna-sub-success">您现在可以正常使用系统了</text>
        <view class="rna-action">
          <view class="rna-btn rna-btn--primary" @tap="$emit('success')">
            <text>开始使用</text>
          </view>
        </view>
      </view>

      <!-- Step 4: 失败 -->
      <view v-else-if="step === 4" class="rna-content rna-content--center">
        <text class="rna-icon-fail">✕</text>
        <text class="rna-msg-fail">认证失败</text>
        <text class="rna-sub-fail">{{ failMsg }}</text>
        <view class="rna-action">
          <view class="rna-btn rna-btn--primary" @tap="retry"><text>重新认证</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import SliderCaptcha from './SliderCaptcha.vue'
import { getCaptchaApi, sendSmsCodeApi } from '@/api/login.js'

defineEmits(['success'])

const props = defineProps({
  visible: { type: Boolean, default: false },
})

const steps = ['填写信息', '人脸识别', '认证完成']

const step = ref(1)
const submitting = ref(false)
const smsCooldown = ref(0)
const captchaVisible = ref(false)
const captchaUuid = ref('')
const smsUuid = ref('')
const qrCodeUrl = ref('')
const faceChecking = ref(false)
const failMsg = ref('')

const certTypes = [
  { value: 'CRED_PSN_CH_IDCARD', label: '中国大陆居民身份证' },
  { value: 'CRED_PSN_CH_HONGKONG', label: '香港来往大陆通行证' },
  { value: 'CRED_PSN_CH_MACAO', label: '澳门来往大陆通行证' },
  { value: 'CRED_PSN_CH_TWCARD', label: '台湾来往大陆通行证' },
  { value: 'CRED_PSN_CH_PASSPORT', label: '护照' },
]

const certTypeIdx = computed(() => {
  const idx = certTypes.findIndex(c => c.value === form.value.certType)
  return idx >= 0 ? idx : 0
})

const form = ref({
  name: '',
  certType: '',
  certNo: '',
  phone: '',
  smsCode: '',
})

function onCertTypeChange(e) {
  form.value.certType = certTypes[e.detail.value].value
}

async function sendSms() {
  if (!form.value.phone || form.value.phone.length < 11) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  try {
    const res = await getCaptchaApi()
    const data = res?.data || res
    captchaUuid.value = data?.uuid
    captchaVisible.value = true
  } catch {
    uni.showToast({ title: '获取验证码失败', icon: 'none' })
  }
}

async function onCaptchaSuccess(distance) {
  captchaVisible.value = false
  try {
    const res = await sendSmsCodeApi({
      telephone: form.value.phone,
      uuid: captchaUuid.value,
      x: distance,
    })
    smsUuid.value = res?.data?.uuid || res?.uuid || ''
    // 倒计时
    smsCooldown.value = 60
    const timer = setInterval(() => {
      smsCooldown.value--
      if (smsCooldown.value <= 0) clearInterval(timer)
    }, 1000)
  } catch {
    uni.showToast({ title: '发送验证码失败', icon: 'none' })
  }
}

async function submitStep1() {
  if (!form.value.name || !form.value.certType || !form.value.certNo || !form.value.smsCode) {
    uni.showToast({ title: '请完善所有信息', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    // 模拟提交实名认证信息并进入人脸识别步骤
    step.value = 2
    // 在实际项目中，这里应调用实名认证接口获取二维码
    qrCodeUrl.value = ''
  } catch {
    uni.showToast({ title: '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function checkFaceStatus() {
  faceChecking.value = true
  try {
    // 实际项目中轮询人脸识别状态
    step.value = 3
  } catch {
    failMsg.value = '人脸识别未通过，请重试'
    step.value = 4
  } finally {
    faceChecking.value = false
  }
}

function retry() {
  step.value = 1
  failMsg.value = ''
  qrCodeUrl.value = ''
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.rna-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.rna-box {
  width: 100%;
  max-width: 640rpx;
  background: $surface;
  border-radius: 32rpx;
  overflow: hidden;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.rna-bar {
  height: 6rpx;
  background: linear-gradient(90deg, $primary, #6366f1, #8b5cf6);
}

.rna-title-section {
  padding: 40rpx 40rpx 20rpx;
}

.rna-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $on-surface;
}

.rna-desc {
  font-size: 24rpx;
  color: $outline;
  display: block;
  margin-top: 8rpx;
}

.rna-steps {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 40rpx 24rpx;
  gap: 8rpx;
}

.rna-step-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
}

.rna-step-dot {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
  background: $surface-container-lowest;
  color: $outline;
  flex-shrink: 0;

  &--active { background: $primary; color: #fff; }
  &--done { background: #10b981; color: #fff; }
}

.rna-step-label {
  font-size: 22rpx;
  color: $outline;
  white-space: nowrap;

  &--active { color: $primary; font-weight: 600; }
  &--done { color: #10b981; }
}

.rna-step-line {
  width: 32rpx;
  height: 2rpx;
  background: $surface-container-lowest;
  margin: 0 4rpx;
}

.rna-content {
  padding: 20rpx 40rpx 40rpx;
  flex: 1;
  overflow-y: auto;
}

.rna-content--center {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 60rpx;
  padding-bottom: 60rpx;
}

.rna-field {
  margin-bottom: 24rpx;
}

.rna-field-label {
  font-size: 26rpx;
  color: $on-surface-variant;
  margin-bottom: 12rpx;
  display: block;
}

.rna-required { color: #ef4444; }

.rna-input {
  width: 100%;
  height: 88rpx;
  border: 2rpx solid $outline-variant;
  border-radius: $radius-lg;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: $on-surface;
  background: $surface;
  display: flex;
  align-items: center;

  &--picker {
    cursor: pointer;
  }

  &--flex {
    flex: 1;
    border: none;
    padding: 0;
  }
}

.rna-placeholder { color: $outline; }

.rna-sms-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  border: 2rpx solid $outline-variant;
  border-radius: $radius-lg;
  padding-right: 8rpx;
  height: 88rpx;
  overflow: hidden;
}

.rna-sms-btn {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  border-radius: $radius-lg;
  background: rgba($primary, 0.08);
  color: $primary;
  font-size: 24rpx;
  font-weight: 600;

  &--disabled {
    color: $outline;
    background: $surface-container-lowest;
  }
}

.rna-action {
  margin-top: 32rpx;
}

.rna-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  border-radius: $radius-lg;
  background: $surface-container-lowest;
  font-size: 30rpx;
  color: $on-surface-variant;

  &--primary {
    background: $primary;
    color: #fff;
    font-weight: 600;
  }
}

.rna-qr-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 0;
}

.rna-qr-hint {
  font-size: 26rpx;
  color: $on-surface-variant;
  margin-bottom: 32rpx;
  text-align: center;
}

.rna-qr-img {
  width: 320rpx;
  height: 320rpx;
}

.rna-qr-loading {
  width: 320rpx;
  height: 320rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $surface-container-lowest;
  border-radius: $radius-xl;
  color: $outline;
  font-size: 26rpx;
}

.rna-icon-success {
  font-size: 100rpx;
  color: #10b981;
  font-weight: 700;
  margin-bottom: 24rpx;
}

.rna-icon-fail {
  font-size: 100rpx;
  color: #ef4444;
  font-weight: 700;
  margin-bottom: 24rpx;
}

.rna-msg-success {
  font-size: 36rpx;
  font-weight: 700;
  color: #10b981;
}

.rna-msg-fail {
  font-size: 36rpx;
  font-weight: 700;
  color: #ef4444;
}

.rna-sub-success, .rna-sub-fail {
  font-size: 26rpx;
  color: $outline;
  margin-top: 12rpx;
}
</style>
