<template>
  <div class="login-root" :style="{ backgroundImage: `url(${loginBgUrl})` }">
    <!-- 左侧：品牌区 -->
    <div class="left-panel">
      <img :src="logoUrl" class="left-logo" />
      <p class="left-greeting">Hi,JClaw</p>
    </div>

    <!-- 右侧：登录卡片 -->
    <div class="right-panel">
      <div class="login-card">
        <!-- 微信图标 -->
        <!-- <div class="wechat-icon">
          <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
            <path d="M8.69 11.52c-.56 0-1.01-.46-1.01-1.02s.45-1.02 1.01-1.02c.56 0 1.01.46 1.01 1.02s-.45 1.02-1.01 1.02zm4.62 0c-.56 0-1.01-.46-1.01-1.02s.45-1.02 1.01-1.02c.56 0 1.01.46 1.01 1.02s-.45 1.02-1.01 1.02zM12 2C6.48 2 2 6.12 2 11.2c0 2.88 1.37 5.45 3.52 7.18L4.6 21l3.06-1.53A10.6 10.6 0 0012 20.4c5.52 0 10-4.12 10-9.2C22 6.12 17.52 2 12 2z"/>
          </svg>
        </div> -->

        <!-- 标题 -->
        <h1 class="card-title">建必优</h1>
        <p class="card-subtitle">Agent Jclaw</p>

        <!-- 表单 -->
        <form @submit.prevent="handleLogin" class="card-form">
          <!-- 手机号 -->
          <div class="input-row">
            <span class="input-prefix">+86</span>
            <input
              maxlength="11"
              v-model="phoneNumber"
              type="tel"
              placeholder="请输入手机号码"
              :disabled="loading"
              class="input-field"
            />
          </div>

          <!-- 验证码 -->
          <div class="input-row">
            <input
              v-model="smsCode"
              maxlength="4"
              type="text"
              placeholder="验证码"
              :disabled="loading"
              class="input-field"
            />
            <button
              type="button"
              class="code-link"
              :disabled="!!countdown || !phoneNumber || loading"
              @click="handleGetCode"
            >{{ countdown ? `${countdown}s` : '获取验证码' }}</button>
          </div>

          <!-- 错误 -->
          <div v-if="error" class="error-bar">⚠ {{ error }}</div>

          <!-- 登录按钮 -->
          <button type="submit" :disabled="loading || !phoneNumber || !smsCode" class="submit-btn">
            <span v-if="!loading">登录</span>
            <span v-else class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              验证中
            </span>
          </button>
        </form>

        <!-- 滑块验证码 -->
        <SliderCaptcha ref="sliderCaptchaRef" :visible="captchaVisible" :captcha-data="captchaData" @close="captchaVisible = false"
          @refresh="fetchCaptcha" @success="onCaptchaSuccess" />

        <!-- 底部波浪装饰 -->
        <div class="wave-decoration">
          <svg viewBox="0 0 400 130" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,35 C50,0 100,75 150,35 C200,0 250,75 300,35 C340,8 380,24 400,20 L400,130 L0,130 Z"
              fill="none" stroke="#38bdf8" stroke-width="1.4" opacity="0.7"/>
            <path d="M0,50 C60,15 110,90 160,50 C210,15 260,90 310,50 C350,22 385,38 400,34 L400,130 L0,130 Z"
              fill="none" stroke="#38bdf8" stroke-width="1.1" opacity="0.55"/>
            <path d="M0,64 C55,28 105,100 155,64 C205,28 255,100 305,64 C348,36 382,52 400,48 L400,130 L0,130 Z"
              fill="none" stroke="#7dd3fc" stroke-width="0.9" opacity="0.45"/>
            <path d="M0,76 C50,44 100,108 150,76 C200,44 250,108 300,76 C345,48 380,62 400,58 L400,130 L0,130 Z"
              fill="none" stroke="#7dd3fc" stroke-width="0.8" opacity="0.35"/>
            <path d="M0,88 C45,58 98,118 148,88 C198,58 248,118 298,88 C342,60 378,74 400,70 L400,130 L0,130 Z"
              fill="none" stroke="#bae6fd" stroke-width="0.7" opacity="0.28"/>
            <path d="M0,100 C40,72 95,125 145,100 C195,72 245,125 295,100 C340,74 376,86 400,82 L400,130 L0,130 Z"
              fill="none" stroke="#bae6fd" stroke-width="0.6" opacity="0.2"/>
            <path d="M0,110 C38,84 92,130 142,110 C192,84 242,130 292,110 C338,86 374,98 400,94 L400,130 L0,130 Z"
              fill="none" stroke="#e0f2fe" stroke-width="0.5" opacity="0.14"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch, onMounted } from 'vue'
import logoUrl from '../assets/logo.png'
import { useAuth } from '../composables/useAuth'
import { getCaptchaApi, sendSmsCodeApi } from '../api/login'
import SliderCaptcha from '../components/SliderCaptcha.vue'
import { loading as globalLoading } from '../utils/loading'
import loginBgUrl from '../assets/loginBg.jpg'

const sliderCaptchaRef = ref<InstanceType<typeof SliderCaptcha> | null>(null)

const auth = useAuth()
const phoneNumber = ref('')
const smsCode = ref('')
const loading = ref(false)
const error = ref('')

// 自动缓存手机号以保证 deviceId 稳定性 (绑定到单设备)
watch(phoneNumber, (val) => {
  if (val && /^[1][3-9]\d{9}$/.test(val)) {
    localStorage.setItem('jclaw_last_phone', val)
  }
})

// 验证码逻辑
const captchaVisible = ref(false)
const captchaData = ref<any>(null)
const countdown = ref(0)
const smsUuid = ref('')
let timer: any = null

async function fetchCaptcha() {
  globalLoading.show('Secure Validation')
  try {
    captchaData.value = await getCaptchaApi()
  } catch (e: any) {
    error.value = e.message || '获取验证码失败'
  } finally {
    globalLoading.hide()
  }
}

async function handleGetCode() {
  if (!phoneNumber.value) {
    error.value = '请输入手机号'
    return
  }
  error.value = ''
  await fetchCaptcha()
  captchaVisible.value = true
}

async function onCaptchaSuccess(distance: number) {
  try {
    globalLoading.show('Verifying')
    const data = await sendSmsCodeApi(phoneNumber.value, captchaData.value.uuid, distance)
    smsUuid.value = data?.data
    captchaVisible.value = false
    startCountdown()
  } catch (e: any) {
    error.value = e.message || '发送验证码失败'
    // 验证失败：重置滑块位置，刷新新的验证码
    sliderCaptchaRef.value?.reset()
    await fetchCaptcha()
  } finally {
    globalLoading.hide()
  }
}

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      clearInterval(timer)
    }
  }, 1000)
}

async function handleLogin() {
  if (!phoneNumber.value || !smsCode.value) return
  globalLoading.show('Authenticating')
  error.value = ''
  try {
    await auth.loginByMobile(phoneNumber.value, smsCode.value, smsUuid.value)
  } catch (e: any) {
    error.value = e.message || '登录失败，请重试'
  } finally {
    globalLoading.hide()
  }
}

onMounted(() => {
  // 不再需要恢复 token
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.login-root {
  display: flex;
  height: 100vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  font-family: -apple-system, 'PingFang SC', 'Hiragino Sans GB', sans-serif;
}

/* ── 左侧 ── */
.left-panel {
  padding-bottom: 200px;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.left-logo {
  width: 120px;
  height: 120px;
  object-fit: contain;
  filter: drop-shadow(0 4px 16px rgba(0,0,0,0.3));
}

.left-greeting {
  font-size: 48px;
  /* font-weight: 600; */
  color: #fff;
  letter-spacing: 0.04em;
  text-shadow: 0 2px 12px rgba(0,0,0,0.4);
}

/* ── 右侧 ── */
.right-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 56px 40px 0;
}

/* ── 卡片 ── */
.login-card {
  position: relative;
  width: 100%;
  max-width: 380px;
  background: #fff;
  border-radius: 20px;
  padding: 40px 36px 0;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.6);
  overflow: hidden;
}

/* 标题 */
.card-title {
  font-size: 34px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 6px;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.card-subtitle {
  font-size: 15px;
  font-weight: 300;
  color: #94a3b8;
  letter-spacing: 0.3em;
  margin-bottom: 32px;
  text-transform: uppercase;
}

/* 表单 */
.card-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 28px;
}

/* 输入行 */
.input-row {
  display: flex;
  align-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0 14px;
  height: 50px;
  background: #f8fafc;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.input-row:focus-within {
  border-color: #0ea5e9;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
}

.input-prefix {
  font-size: 14px;
  color: #64748b;
  margin-right: 12px;
  padding-right: 12px;
  border-right: 1px solid #e2e8f0;
  white-space: nowrap;
  line-height: 1;
}

.input-field {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #0f172a;
  min-width: 0;
}

.input-field::placeholder {
  color: #cbd5e1;
}

.input-field:disabled {
  opacity: 0.5;
}

.code-link {
  border: none;
  background: transparent;
  color: #0ea5e9;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  padding: 0;
  transition: color 0.2s;
  font-weight: 500;
}

.code-link:hover:not(:disabled) {
  color: #0284c7;
}

.code-link:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
}

/* 错误 */
.error-bar {
  font-size: 12px;
  color: #ef4444;
  padding-left: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 登录按钮 */
.submit-btn {
  width: 100%;
  height: 50px;
  background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 60%, #38bdf8 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.06em;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.2s, box-shadow 0.2s, transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(14, 165, 233, 0.4);
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.92;
  box-shadow: 0 6px 28px rgba(14, 165, 233, 0.55);
  transform: translateY(-1px);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

/* 波浪装饰 */
.wave-decoration {
  width: calc(100% + 72px);
  margin-left: -36px;
  height: 130px;
  margin-top: 16px;
}

.wave-decoration svg {
  width: 100%;
  height: 100%;
}
</style>
