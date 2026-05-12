<template>
  <!-- 全屏遮罩，强制拦截，不可关闭 -->
  <div
    class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    @click.self="() => {}"
  >
    <!-- 弹窗主体 -->
    <div class="relative w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl animate-modal-in">
      <!-- 顶部渐变装饰 -->
      <div class="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

      <!-- 标题区 -->
      <div class="pt-6 pb-4 px-7">
        <div class="flex items-center gap-3 mb-1">
          <div class="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 shrink-0">
            <ShieldCheck class="text-indigo-600" :size="20" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-gray-900">个人实名认证</h2>
            <p class="text-xs text-gray-400 mt-0.5">您的账号需要完成实名认证才能继续使用系统</p>
          </div>
        </div>

        <!-- 步骤指示器 -->
        <div class="flex items-center gap-2 mt-5">
          <div
            v-for="(s, i) in steps"
            :key="i"
            class="flex items-center gap-2"
          >
            <div
              :class="[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300',
                step > i + 1 ? 'bg-green-500 text-white' :
                step === i + 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' :
                'bg-gray-100 text-gray-400'
              ]"
            >
              <Check v-if="step > i + 1" :size="13" />
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span
              :class="[
                'text-xs font-medium transition-colors',
                step === i + 1 ? 'text-indigo-600' : step > i + 1 ? 'text-green-600' : 'text-gray-400'
              ]"
            >{{ s }}</span>
            <div v-if="i < steps.length - 1" class="w-8 h-px mx-1 bg-gray-200" />
          </div>
        </div>
      </div>

      <div class="px-7 pb-7">
        <!-- Step 1: 填写个人信息 -->
        <transition name="fade-slide" mode="out-in">
          <div v-if="step === 1" key="step1" class="space-y-4">
            <!-- 姓名 -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">真实姓名 <span class="text-red-400">*</span></label>
              <input
                v-model.trim="form.name"
                type="text"
                placeholder="请输入真实姓名"
                class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-gray-300"
              />
            </div>

            <!-- 证件类型 -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">证件类型 <span class="text-red-400">*</span></label>
              <div class="relative">
                <select
                  v-model="form.certType"
                  class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none bg-white cursor-pointer"
                >
                  <option value="" disabled>请选择证件类型</option>
                  <option value="CRED_PSN_CH_IDCARD">中国大陆居民身份证</option>
                  <option value="CRED_PSN_CH_HONGKONG">香港来往大陆通行证</option>
                  <option value="CRED_PSN_CH_MACAO">澳门来往大陆通行证</option>
                  <option value="CRED_PSN_CH_TWCARD">台湾来往大陆通行证</option>
                  <option value="CRED_PSN_PASSPORT">护照</option>
                </select>
                <ChevronDown class="absolute text-gray-400 -translate-y-1/2 pointer-events-none right-3 top-1/2" :size="15" />
              </div>
            </div>

            <!-- 证件号码 -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">证件号码 <span class="text-red-400">*</span></label>
              <input
                v-model.trim="form.certNo"
                type="text"
                placeholder="请输入证件号码"
                class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-gray-300"
              />
            </div>

            <!-- 手机号 (可编辑) -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">手机号码 <span class="text-red-400">*</span></label>
              <div class="flex items-center overflow-hidden transition-all bg-white border border-gray-200 rounded-xl focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
                <span class="px-3 text-xs text-gray-400 border-r border-gray-200 h-full flex items-center py-2.5 shrink-0">+86</span>
                <input
                  v-model.trim="form.telephone"
                  type="tel"
                  maxlength="11"
                  placeholder="请输入手机号码"
                  class="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent"
                />
              </div>
            </div>

            <!-- 短信验证码 -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1.5">短信验证码 <span class="text-red-400">*</span></label>
              <div class="flex items-center gap-2">
                <input
                  v-model.trim="form.smsCode"
                  type="text"
                  maxlength="6"
                  placeholder="请输入验证码"
                  class="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-gray-300"
                />
                <button
                  type="button"
                  :disabled="!!smsCountdown || !form.telephone || sendingSms"
                  @click="handleGetSmsCode"
                  class="shrink-0 px-3 py-2.5 text-xs rounded-xl border border-indigo-200 text-indigo-600 font-medium transition-all hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {{ smsCountdown ? `${smsCountdown}s` : (sendingSms ? '发送中' : '获取验证码') }}
                </button>
              </div>
            </div>

            <!-- 滑块验证码 -->
            <SliderCaptcha
              ref="sliderCaptchaRef"
              :visible="captchaVisible"
              :captcha-data="captchaData"
              @close="captchaVisible = false"
              @refresh="fetchCaptcha"
              @success="onCaptchaSuccess"
            />

            <!-- 错误提示 -->
            <p v-if="errorMsg" class="text-xs text-red-500 flex items-center gap-1.5">
              <AlertCircle :size="13" />{{ errorMsg }}
            </p>

            <!-- 操作按钮 -->
            <button
              @click="submitInfo"
              :disabled="submitting"
              class="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-medium transition-all shadow-lg shadow-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Loader2 v-if="submitting" class="animate-spin" :size="15" />
              <span>{{ submitting ? '提交中...' : '开始认证' }}</span>
            </button>
          </div>
        </transition>

        <!-- Step 2: 扫码人脸认证 -->
        <transition name="fade-slide" mode="out-in">
          <div v-if="step === 2" key="step2" class="flex flex-col items-center py-2">
            <p class="mb-1 text-sm text-center text-gray-500">
              请使用 <span class="font-medium text-gray-700">系统APP或者微信</span> 扫一扫
            </p>
            <p class="mb-4 text-xs text-center text-gray-400">完成企业和个人实名认证</p>

            <!-- 二维码容器 -->
            <div class="relative p-3 border-2 border-indigo-200 border-dashed rounded-2xl bg-indigo-50">
              <div ref="qrContainer" id="realname-qrcode" class="w-[220px] h-[220px] flex items-center justify-center">
                <!-- 加载中占位 -->
                <div v-if="qrLoading" class="flex flex-col items-center gap-2 text-indigo-400">
                  <Loader2 class="animate-spin" :size="28" />
                  <span class="text-xs">生成二维码中...</span>
                </div>
              </div>
              <!-- 扫码成功遮罩 -->
              <div v-if="qrScanned" class="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/95">
                <div class="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                  <CheckCircle2 class="text-green-500" :size="28" />
                </div>
                <p class="text-sm font-medium text-gray-700">扫描成功</p>
                <p class="text-xs text-gray-400">请在手机上根据提示操作</p>
              </div>
              <!-- 过期遮罩 -->
              <div v-if="qrExpired" class="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/95">
                <div class="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full">
                  <RefreshCcw class="text-gray-500" :size="22" />
                </div>
                <p class="text-sm font-medium text-gray-700">二维码已过期</p>
                <button @click="refreshQR" class="text-xs font-medium text-indigo-600 hover:text-indigo-700">点击刷新</button>
              </div>
            </div>

            <p class="mt-4 text-xs text-center text-gray-400">二维码有效期约 5 分钟</p>

            <!-- 错误提示 -->
            <p v-if="errorMsg" class="text-xs text-red-500 flex items-center gap-1.5 mt-3">
              <AlertCircle :size="13" />{{ errorMsg }}
            </p>

            <!-- 返回修改信息 -->
            <button
              @click="backToForm"
              class="flex items-center gap-1 mt-4 text-xs text-gray-400 transition-colors hover:text-gray-600"
            >
              <ArrowLeft :size="12" />返回修改信息
            </button>
          </div>
        </transition>

        <!-- Step 3: 认证成功 -->
        <transition name="fade-slide" mode="out-in">
          <div v-if="step === 3" key="step3" class="flex flex-col items-center py-6">
            <div class="flex items-center justify-center w-20 h-20 mb-5 rounded-full bg-green-50 animate-bounce-in">
              <CheckCircle2 class="text-green-500" :size="44" />
            </div>
            <h3 class="mb-2 text-base font-semibold text-gray-900">实名认证成功！</h3>
            <p class="text-sm text-center text-gray-500">您已完成实名认证，正在为您进入系统...</p>
            <div class="flex items-center gap-2 mt-6 text-indigo-500">
              <Loader2 class="animate-spin" :size="16" />
              <span class="text-sm">加载中</span>
            </div>
          </div>
        </transition>

        <!-- Step 4: 认证失败 -->
        <transition name="fade-slide" mode="out-in">
          <div v-if="step === 4" key="step4" class="flex flex-col items-center py-6">
            <div class="flex items-center justify-center w-20 h-20 mb-5 rounded-full bg-red-50">
              <XCircle class="text-red-400" :size="44" />
            </div>
            <h3 class="mb-2 text-base font-semibold text-gray-900">认证失败</h3>
            <p class="mb-6 text-sm text-center text-gray-500">{{ failMsg || '人脸认证未通过，请重新尝试' }}</p>
            <button
              @click="retry"
              class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-200"
            >
              重新认证
            </button>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, nextTick } from 'vue'
// @ts-ignore
import QRCode from 'qrcodejs2-fixes'
import {
  ShieldCheck, Check, ChevronDown, AlertCircle, Loader2,
  CheckCircle2, RefreshCcw, ArrowLeft, XCircle
} from 'lucide-vue-next'
import { noTokenFaceSwiping, userFaceDistinguishState, addQRCode, queryQRCode } from '../../api/auth'
import { getCaptchaApi, sendSmsCodeApi } from '../../api/login'
import SliderCaptcha from '../SliderCaptcha.vue'

const props = defineProps<{
  telephone: string
}>()

const emit = defineEmits<{
  (e: 'success'): void
}>()

// ── State ──────────────────────────────────────────────────────────
const steps = ['填写信息', '扫码认证', '完成']
const step = ref<1 | 2 | 3 | 4>(1)

const form = ref({
  name: '',
  certType: '',
  certNo: '',
  telephone: props.telephone,
  smsCode: '',
})

// ── SMS 验证码 ─────────────────────────────────────────────────────
const sliderCaptchaRef = ref<InstanceType<typeof SliderCaptcha> | null>(null)
const captchaVisible = ref(false)
const captchaData = ref<any>(null)
const smsCountdown = ref(0)
const sendingSms = ref(false)
const smsUuid = ref('')
let smsTimer: ReturnType<typeof setInterval> | null = null

async function fetchCaptcha() {
  try {
    captchaData.value = await getCaptchaApi()
  } catch (e: any) {
    errorMsg.value = e.message || '获取图形验证码失败'
  }
}

async function handleGetSmsCode() {
  if (!form.value.telephone) return
  errorMsg.value = ''
  await fetchCaptcha()
  captchaVisible.value = true
}

async function onCaptchaSuccess(distance: number) {
  sendingSms.value = true
  captchaVisible.value = false
  try {
    const res = await sendSmsCodeApi(form.value.telephone, captchaData.value.uuid, distance)
    smsUuid.value = (res as any).data
    startSmsCountdown()
  } catch (e: any) {
    errorMsg.value = e.message || '发送验证码失败'
    sliderCaptchaRef.value?.reset()
    await fetchCaptcha()
    captchaVisible.value = true
  } finally {
    sendingSms.value = false
  }
}

function startSmsCountdown() {
  smsCountdown.value = 60
  smsTimer = setInterval(() => {
    if (smsCountdown.value > 0) {
      smsCountdown.value--
    } else {
      clearInterval(smsTimer!)
      smsTimer = null
    }
  }, 1000)
}

const errorMsg = ref('')
const failMsg = ref('')
const submitting = ref(false)

// QR code state
const qrLoading = ref(false)
const qrScanned = ref(false)
const qrExpired = ref(false)

let qrInstance: any = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let qrScanTimer: ReturnType<typeof setInterval> | null = null
let expireTimer: ReturnType<typeof setTimeout> | null = null

let authUrl = ''
let faceDistinguishId = ''
let currentUnique = ''

// ── Helpers ────────────────────────────────────────────────────────
function clearTimers() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  if (qrScanTimer) { clearInterval(qrScanTimer); qrScanTimer = null }
  if (expireTimer) { clearTimeout(expireTimer); expireTimer = null }
}

// ── Step 1: 校验并提交信息 ──────────────────────────────────────────
async function submitInfo() {
  errorMsg.value = ''

  if (!form.value.name) return (errorMsg.value = '请输入真实姓名')
  if (!form.value.certType) return (errorMsg.value = '请选择证件类型')
  if (!form.value.certNo) return (errorMsg.value = '请输入证件号码')

  // 证件号码格式校验
  const certNo = form.value.certNo
  const certType = form.value.certType
  if (certType === 'CRED_PSN_CH_IDCARD') {
    const reg18 = /^[1-9]\d{5}(18|19|([23]\d))\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/
    const reg15 = /^[1-9]\d{5}\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{2}[0-9Xx]$/
    if (!reg18.test(certNo) && !reg15.test(certNo))
      return (errorMsg.value = '请输入正确的身份证号码')
  } else if (certType === 'CRED_PSN_CH_HONGKONG') {
    if (!/^[HMhm]\d{8}$/.test(certNo))
      return (errorMsg.value = '请输入正确的港澳通行证号码（H/M开头+8位数字）')
  } else if (certType === 'CRED_PSN_CH_MACAO') {
    if (!/^[MXEme]\d{7,8}$/.test(certNo))
      return (errorMsg.value = '请输入正确的澳门通行证号码')
  } else if (certType === 'CRED_PSN_CH_TWCARD') {
    if (!/^[a-zA-Z][0-9]{9}$/.test(certNo))
      return (errorMsg.value = '请输入正确的台湾通行证号码（1位字母+9位数字）')
  } else if (certType === 'CRED_PSN_PASSPORT') {
    if (!/^[a-zA-Z0-9]{6,16}$/.test(certNo))
      return (errorMsg.value = '请输入正确的护照号码')
  }

  if (!/^[1][3-9]\d{9}$/.test(form.value.telephone)) return (errorMsg.value = '请输入正确的手机号码')
  if (!form.value.smsCode) return (errorMsg.value = '请输入短信验证码')

  submitting.value = true
  try {
    const res = await noTokenFaceSwiping({
      name: form.value.name,
      certType: form.value.certType,
      cardNum: form.value.certNo,
      certNo: form.value.certNo,
      telephone: form.value.telephone,
      distinguishType: '1',
      type: 0,
      uuid: smsUuid.value,
      code: form.value.smsCode,
    })
    const data = (res as any).data
    authUrl = data.faceSwipingUrl
    faceDistinguishId = data.userFaceDistinguishId

    step.value = 2
    await nextTick()
    await generateQR()
    startQRScanPolling()
    startPolling()
    startExpireTimer()
  } catch (e: any) {
    errorMsg.value = e?.message || '提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

// ── Step 2: 生成二维码 ─────────────────────────────────────────────
async function generateQR() {
  qrLoading.value = true
  qrScanned.value = false
  qrExpired.value = false

  try {
    const res = await addQRCode()
    currentUnique = (res as any).data
    const location = window.location.origin
    const data = encodeURIComponent(JSON.stringify(authUrl))
    const text = `${location}/h5/#/pages/h5/scanCodeTran?type=2&unique=${currentUnique}&data=${data}`

    await nextTick()
    const el = document.getElementById('realname-qrcode')
    if (!el) return

    el.innerHTML = ''
    qrInstance = new QRCode(el, {
      width: 220,
      height: 220,
      text,
      correctLevel: QRCode.CorrectLevel.H,
    })
    // 移除 title 提示
    if (qrInstance._el) qrInstance._el.title = ''
  } finally {
    qrLoading.value = false
  }
}

// ── 轮询二维码扫码状态 (queryQRCode: res.data===1 表示已扫) ────────
function startQRScanPolling() {
  qrScanTimer = setInterval(async () => {
    try {
      const res = await queryQRCode(currentUnique)
      if ((res as any).data === 1) {
        clearInterval(qrScanTimer!)
        qrScanTimer = null
        qrScanned.value = true
      }
    } catch {
      // 网络错误不中断
    }
  }, 5000)
}

// ── 轮询认证结果 (judgeBusinessSuccess: status 2=成功 3=失败) ──────
function startPolling() {
  pollTimer = setInterval(async () => {
    try {
      const res = await userFaceDistinguishState({ distinguishType: 0, pkId: faceDistinguishId })
      const data = (res as any).data
      if (data.status === 2) {
        clearTimers()
        step.value = 3
        setTimeout(() => emit('success'), 1500)
      } else if (data.status === 3) {
        clearTimers()
        failMsg.value = data.errorInfo || '人脸认证未通过'
        step.value = 4
      }
    } catch {
      // 网络错误不中断轮询
    }
  }, 3000)
}

// ── 5分钟后标记二维码过期 ─────────────────────────────────────────
function startExpireTimer() {
  expireTimer = setTimeout(() => {
    clearTimers()
    if (step.value === 2) qrExpired.value = true
  }, 5 * 60 * 1000)
}

// ── 刷新二维码 ────────────────────────────────────────────────────
async function refreshQR() {
  qrExpired.value = false
  qrScanned.value = false
  await generateQR()
  startQRScanPolling()
  startPolling()
  startExpireTimer()
}

// ── 返回修改信息 ──────────────────────────────────────────────────
function backToForm() {
  clearTimers()
  step.value = 1
  errorMsg.value = ''
}

// ── 重新认证 (从失败回到Step1) ────────────────────────────────────
function retry() {
  clearTimers()
  step.value = 1
  errorMsg.value = ''
  failMsg.value = ''
}

// ── 清理 ──────────────────────────────────────────────────────────
onUnmounted(() => {
  clearTimers()
  if (smsTimer) clearInterval(smsTimer)
})
</script>

<style scoped>
/* 弹窗入场动画 */
.animate-modal-in {
  animation: modal-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes modal-in {
  from { opacity: 0; transform: scale(0.92) translateY(12px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* 成功图标弹出 */
.animate-bounce-in {
  animation: bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes bounce-in {
  from { opacity: 0; transform: scale(0.4); }
  to   { opacity: 1; transform: scale(1); }
}

/* 步骤切换过渡 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.22s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateX(0);
}
</style>
