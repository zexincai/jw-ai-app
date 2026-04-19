# Mobile Login & AI Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up real SMS login (with slider captcha), WUKONGIM-based AI chat, and multimedia input (image/file/voice) in the existing uni-app project.

**Architecture:** uni-app native APIs first (uni.request, uni.chooseImage, uni.getRecorderManager) with WUKONGIM JS SDK for IM. Composables layer (useAuth, useWukongIM, useChat) mirrors the PC reference. Conditional compilation (#ifdef H5 / #ifndef H5) handles platform differences.

**Tech Stack:** Vue 3 + uni-app, Pinia, wukongimjssdk, tweetnacl, js-sha256, cos-js-sdk-v5, marked

**Spec:** `docs/superpowers/specs/2026-04-19-mobile-login-chat-design.md`

---

## File Map

### Create (new files)
| File | Responsibility |
|------|---------------|
| `.env.dev` | API base URL for dev |
| `src/utils/request.js` | uni.request HTTP client (token, clientid, operatePort) |
| `src/utils/device.js` | Ed25519 device ID per phone number |
| `src/utils/upload.js` | File upload (COS / MinIO, via upload token) |
| `src/api/login.js` | getCaptchaApi, sendSmsCodeApi, mobileLoginApi |
| `src/api/agent.js` | Session CRUD and message record APIs |
| `src/composables/useAuth.js` | Auth state singleton (token, roles, login, switchRole) |
| `src/composables/useWukongIM.js` | WKSDK.shared() connection, sendText, onMessage |
| `src/composables/useChat.js` | Full send flow, AI response handling |
| `src/components/SliderCaptcha.vue` | Drag-to-verify captcha (touch events) |
| `src/components/VoiceRecorder.vue` | Record audio (H5: MediaRecorder; App: getRecorderManager) |
| `src/components/MarkdownContent.vue` | Render markdown (H5: v-html; App: rich-text) |
| `src/utils/request.test.js` | Unit tests for request building |
| `src/utils/device.test.js` | Unit tests for device ID generation |
| `src/composables/useAuth.test.js` | Unit tests for login/state |

### Modify (existing files)
| File | Change |
|------|--------|
| `vite.config.js` | Add H5 dev proxy to avoid CORS |
| `src/stores/chat.js` | Replace mock data with real data model |
| `src/stores/chat.test.js` | Update tests for new store shape |
| `src/pages/login/login.vue` | Wire up real captcha + SMS login |
| `src/pages/chat/chat.vue` | Import useChat, update template + script for new store |
| `src/components/ChatBubble.vue` | Update to new message model (role/content/thinking) + MarkdownContent |
| `src/components/InputBar.vue` | Add image/file/voice buttons with real handlers |
| `src/App.vue` | Add WS connect on launch, reconnect on show |

---

## Phase 1: Infrastructure

### Task 1: Dependencies + env config + vite proxy

**Files:**
- Create: `.env.dev`
- Modify: `vite.config.js`

- [ ] **Step 1: Install dependencies**

```bash
npm install wukongimjssdk tweetnacl js-sha256 cos-js-sdk-v5 marked
```

Expected: `node_modules/wukongimjssdk` etc. present, no errors.

- [ ] **Step 2: Create `.env.dev`**

```bash
VITE_API_BASE_URL=http://192.168.2.99:9199
```

- [ ] **Step 3: Update `vite.config.js` to add H5 dev proxy**

Replace `vite.config.js` with:

```js
import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [uni()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:9199',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
```

- [ ] **Step 4: Verify dev server starts**

```bash
npm run dev:h5
```

Expected: Vite starts on port 5173 (or similar). No errors.

- [ ] **Step 5: Commit**

```bash
git add .env.dev vite.config.js package.json package-lock.json
git commit -m "feat: add deps, env config, and H5 dev proxy"
```

---

### Task 2: `src/utils/device.js` — Ed25519 device ID

**Files:**
- Create: `src/utils/device.js`
- Create: `src/utils/device.test.js`

- [ ] **Step 1: Write failing test**

Create `src/utils/device.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Minimal uni mock
const storageMap = {}
global.uni = {
  getStorageSync: vi.fn(key => storageMap[key] ?? ''),
  setStorageSync: vi.fn((key, val) => { storageMap[key] = val }),
}

import { getDeviceId } from './device.js'

describe('getDeviceId', () => {
  beforeEach(() => {
    Object.keys(storageMap).forEach(k => delete storageMap[k])
    vi.clearAllMocks()
    global.uni.getStorageSync.mockImplementation(key => storageMap[key] ?? '')
    global.uni.setStorageSync.mockImplementation((key, val) => { storageMap[key] = val })
  })

  it('returns a 64-char hex string', async () => {
    storageMap['jclaw_last_phone'] = '18012345678'
    const id = await getDeviceId()
    expect(id).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns the same ID on repeated calls for same phone', async () => {
    storageMap['jclaw_last_phone'] = '18012345678'
    const id1 = await getDeviceId()
    const id2 = await getDeviceId()
    expect(id1).toBe(id2)
  })

  it('returns different IDs for different phone numbers', async () => {
    storageMap['jclaw_last_phone'] = '18012345678'
    const id1 = await getDeviceId()
    storageMap['jclaw_last_phone'] = '18087654321'
    // Clear stored keypair to simulate fresh device
    Object.keys(storageMap).filter(k => k.startsWith('jclaw_device')).forEach(k => delete storageMap[k])
    const id2 = await getDeviceId()
    expect(id1).not.toBe(id2)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/utils/device.test.js
```

Expected: FAIL — `Cannot find module './device.js'`

- [ ] **Step 3: Implement `src/utils/device.js`**

```js
import nacl from 'tweetnacl'
import sha256 from 'js-sha256'

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function getDeviceId(phoneNumber) {
  const phone = phoneNumber
    || uni.getStorageSync('jclaw_last_phone')
    || 'anonymous'
  const storageKey = `jclaw_device_keypair_v2_${phone}`
  let stored = uni.getStorageSync(storageKey)

  if (!stored) {
    const kp = nacl.sign.keyPair()
    stored = {
      publicKeyHex: toHex(kp.publicKey),
      secretKeyHex: toHex(kp.secretKey),
    }
    uni.setStorageSync(storageKey, stored)
  }

  const pubBytes = new Uint8Array(
    stored.publicKeyHex.match(/.{2}/g).map(h => parseInt(h, 16))
  )
  return sha256(pubBytes)
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/utils/device.test.js
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/device.js src/utils/device.test.js
git commit -m "feat: add device ID utility (Ed25519 per-phone key)"
```

---

### Task 3: `src/utils/request.js` — HTTP client

**Files:**
- Create: `src/utils/request.js`
- Create: `src/utils/request.test.js`

- [ ] **Step 1: Write failing test**

Create `src/utils/request.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

let capturedRequest = null
global.uni = {
  request: vi.fn(opts => {
    capturedRequest = opts
    // Simulate success response
    setTimeout(() => opts.success({ data: { code: 200, data: 'ok' } }), 0)
  }),
  getStorageSync: vi.fn(key => key === 'jclaw_token' ? 'test-token' : ''),
  setStorageSync: vi.fn(),
  removeStorageSync: vi.fn(),
  reLaunch: vi.fn(),
  showToast: vi.fn(),
}

// Mock device.js
vi.mock('./device.js', () => ({ getDeviceId: async () => 'mock-device-id' }))

import { http } from './request.js'

describe('http client', () => {
  beforeEach(() => {
    capturedRequest = null
    vi.clearAllMocks()
    uni.request.mockImplementation(opts => {
      capturedRequest = opts
      setTimeout(() => opts.success({ data: { code: 200, data: 'ok' } }), 0)
    })
    uni.getStorageSync.mockImplementation(key => key === 'jclaw_token' ? 'test-token' : '')
  })

  it('appends operatePort=2 to GET URL', async () => {
    await http.get('/test')
    expect(capturedRequest.url).toContain('operatePort=2')
    expect(capturedRequest.method).toBe('GET')
  })

  it('appends operatePort=2 to POST URL (not in body)', async () => {
    await http.post('/test', { foo: 'bar' })
    expect(capturedRequest.url).toContain('operatePort=2')
    expect(capturedRequest.data).toEqual({ foo: 'bar' })
  })

  it('sets Authorization and clientid headers', async () => {
    await http.get('/test')
    expect(capturedRequest.header['Authorization']).toBe('test-token')
    expect(capturedRequest.header['clientid']).toBe('mock-device-id')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/utils/request.test.js
```

Expected: FAIL — `Cannot find module './request.js'`

- [ ] **Step 3: Implement `src/utils/request.js`**

```js
import { getDeviceId } from './device.js'

// Use let + conditional assignment so vitest (no preprocessor) sees one declaration
let BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
// #ifdef H5
if (import.meta.env.DEV) BASE_URL = '/api'
// #endif

function buildQs(params) {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

export function request(url, { method = 'GET', params = {}, data } = {}) {
  return new Promise(async (resolve, reject) => {
    const token = uni.getStorageSync('jclaw_token') || ''
    const clientId = await getDeviceId()
    const qs = buildQs({ ...params, operatePort: 2 })
    const sep = url.includes('?') ? '&' : '?'
    const fullUrl = `${BASE_URL}${url}${sep}${qs}`

    uni.request({
      url: fullUrl,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token,
        'clientid': clientId,
      },
      success(res) {
        const body = res.data
        if (body && body.code === 503) {
          // Fire-and-forget logout, don't block redirect
          uni.request({
            url: `${BASE_URL}/auth/ai/sysLogout${sep}operatePort=2`,
            method: 'POST',
            header: { 'Authorization': token, 'Content-Type': 'application/json' },
          })
          uni.removeStorageSync('jclaw_token')
          uni.reLaunch({ url: '/pages/login/login' })
          return
        }
        resolve(body)
      },
      fail: reject,
    })
  })
}

export const http = {
  get:    (url, params) =>       request(url, { method: 'GET', params }),
  post:   (url, data, params) => request(url, { method: 'POST', data, params }),
  put:    (url, data, params) => request(url, { method: 'PUT', data, params }),
  delete: (url, params) =>       request(url, { method: 'DELETE', params }),
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/utils/request.test.js
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/request.js src/utils/request.test.js
git commit -m "feat: add HTTP client with uni.request (token, clientid, operatePort)"
```

---

## Phase 2: Authentication

### Task 4: `src/api/login.js` — Auth API wrappers

**Files:**
- Create: `src/api/login.js`

- [ ] **Step 1: Create `src/api/login.js`**

```js
import { http } from '../utils/request.js'

/** GET /code — 获取滑块验证码图片 */
export function getCaptchaApi() {
  return http.get('/code')
}

/**
 * POST /auth/send/verification/code
 * @param {object} p
 * @param {string} p.phoneNumber
 * @param {string} p.uuid       — from getCaptchaApi
 * @param {number} p.code       — scaled slider distance
 * @param {number} [p.sendType] — default 1
 */
export function sendSmsCodeApi({ phoneNumber, uuid, code, sendType = 1 }) {
  return http.post('/auth/send/verification/code', { phoneNumber, uuid, code, sendType })
}

/**
 * POST /auth/ai/sysLogin
 * @param {object} p
 * @param {string} p.phoneNumber
 * @param {string} p.code       — SMS verification code
 * @param {string} p.uuid       — smsUuid from sendSmsCodeApi
 */
export function mobileLoginApi({ phoneNumber, code, uuid }) {
  return http.post('/auth/ai/sysLogin', {
    phoneNumber,
    code,
    uuid,
    forceType: 1,
    sourceType: 3,
    operateSource: 2,
  })
}

/** POST /auth/ai/switchLogin — switch active role */
export function switchLoginApi({ userId }) {
  return http.post('/auth/ai/switchLogin', { userId })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/login.js
git commit -m "feat: add login API layer"
```

---

### Task 5: `src/api/agent.js` — Session & message APIs

**Files:**
- Create: `src/api/agent.js`

- [ ] **Step 1: Create `src/api/agent.js`**

```js
import { http } from '../utils/request.js'

/** GET /eng/chat/getChatIMLongConnection */
export function getChatIMLongConnection(params) {
  return http.get('/eng/chat/getChatIMLongConnection', params)
}

/** GET /eng/agent/getUserAccountChatList */
export function getUserAccountChatList() {
  return http.get('/eng/agent/getUserAccountChatList')
}

/** POST /eng/agent/add — create session, returns pkId */
export function addChat(data) {
  return http.post('/eng/agent/add', data)
}

/** DELETE /eng/agent/delete */
export function deleteAgent(params) {
  return http.delete('/eng/agent/delete', params)
}

/**
 * POST /eng/agent/addChatRecordData
 * @param {object} p
 * @param {number} p.fkChatId
 * @param {string} p.chatContent
 * @param {string} p.chatObject  — '0'=user, '1'=assistant
 * @param {Array}  [p.chatRecordFileList]
 */
export function addChatRecordData(data) {
  return http.post('/eng/agent/addChatRecordData', data)
}

/** GET /eng/agent/chatRecordDataSearchPage */
export function chatRecordDataSearchPage(params) {
  return http.get('/eng/agent/chatRecordDataSearchPage', params)
}

/** GET /eng/file/temporary/token */
export function getUploadToken() {
  return http.get('/eng/file/temporary/token')
}

/** GET /eng/voice/aliyunToken */
export function getAliyunToken() {
  return http.get('/eng/voice/aliyunToken')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/agent.js
git commit -m "feat: add agent/session API layer"
```

---

### Task 6: `src/composables/useAuth.js`

**Files:**
- Create: `src/composables/useAuth.js`
- Create: `src/composables/useAuth.test.js`

- [ ] **Step 1: Write failing test**

Create `src/composables/useAuth.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const storageMap = {}
global.uni = {
  getStorageSync: vi.fn(key => storageMap[key] ?? ''),
  setStorageSync: vi.fn((key, val) => { storageMap[key] = val }),
  removeStorageSync: vi.fn(key => { delete storageMap[key] }),
  reLaunch: vi.fn(),
  showToast: vi.fn(),
}

vi.mock('../api/login.js', () => ({
  mobileLoginApi: vi.fn(async () => ({
    code: 200,
    data: {
      access_token: 'tok-123',
      userList: [{ userId: 1, telephone: '18012345678', userRolePrompt: 'You are an AI', orgName: 'Acme' }],
    },
  })),
}))

// useAuth uses module-level singletons — import once and reset state manually between tests
import { useAuth } from './useAuth.js'

describe('useAuth', () => {
  beforeEach(() => {
    Object.keys(storageMap).forEach(k => delete storageMap[k])
    vi.clearAllMocks()
    uni.getStorageSync.mockImplementation(key => storageMap[key] ?? '')
    uni.setStorageSync.mockImplementation((key, val) => { storageMap[key] = val })
    uni.removeStorageSync.mockImplementation(key => { delete storageMap[key] })
    // Reset singleton refs between tests
    const auth = useAuth()
    auth.logout()
  })

  it('isLoggedIn is false initially', () => {
    const auth = useAuth()
    expect(auth.isLoggedIn.value).toBe(false)
  })

  it('loginByMobile stores token and roles', async () => {
    const auth = useAuth()
    await auth.loginByMobile('18012345678', '1234', 'uuid-abc')
    expect(auth.token.value).toBe('tok-123')
    expect(auth.roles.value).toHaveLength(1)
    expect(auth.isLoggedIn.value).toBe(true)
  })

  it('logout clears state', async () => {
    const auth = useAuth()
    await auth.loginByMobile('18012345678', '1234', 'uuid-abc')
    auth.logout()
    expect(auth.token.value).toBe('')
    expect(auth.isLoggedIn.value).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx vitest run src/composables/useAuth.test.js
```

- [ ] **Step 3: Implement `src/composables/useAuth.js`**

```js
import { ref, computed } from 'vue'
import { mobileLoginApi, switchLoginApi } from '../api/login.js'

// Module-level singletons
const token = ref(uni.getStorageSync('jclaw_token') || '')
const roles = ref([])
const currentRoleId = ref('')

function _restore() {
  const stored = uni.getStorageSync('jclaw_auth')
  if (stored) {
    roles.value = stored.roles || []
    currentRoleId.value = String(stored.currentRoleId || '')
  }
}
_restore()

const isLoggedIn = computed(() => !!token.value && roles.value.length > 0)
const currentRole = computed(
  () => roles.value.find(r => String(r.userId) === currentRoleId.value) || roles.value[0] || null
)

async function loginByMobile(phoneNumber, smsCode, smsUuid) {
  // Must set phone before any request so device.js can find keypair
  uni.setStorageSync('jclaw_last_phone', phoneNumber)

  const res = await mobileLoginApi({ phoneNumber, code: smsCode, uuid: smsUuid })
  if (res.code !== 200) throw new Error(res.msg || '登录失败')

  token.value = res.data.access_token
  roles.value = res.data.userList || []
  currentRoleId.value = String(roles.value[0]?.userId || '')

  uni.setStorageSync('jclaw_token', token.value)
  uni.setStorageSync('jclaw_auth', { roles: roles.value, currentRoleId: currentRoleId.value })
}

async function switchRole(roleId) {
  const res = await switchLoginApi({ userId: roleId })
  if (res.code !== 200) throw new Error(res.msg || '切换角色失败')
  token.value = res.data.access_token
  currentRoleId.value = String(roleId)
  uni.setStorageSync('jclaw_token', token.value)
  uni.setStorageSync('jclaw_auth', { roles: roles.value, currentRoleId: currentRoleId.value })
}

function logout() {
  token.value = ''
  roles.value = []
  currentRoleId.value = ''
  uni.removeStorageSync('jclaw_token')
  uni.removeStorageSync('jclaw_auth')
}

export function useAuth() {
  return { token, roles, currentRoleId, isLoggedIn, currentRole, loginByMobile, switchRole, logout }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx vitest run src/composables/useAuth.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/composables/useAuth.js src/composables/useAuth.test.js
git commit -m "feat: add useAuth composable with login/role/logout"
```

---

### Task 7: `src/components/SliderCaptcha.vue`

**Files:**
- Create: `src/components/SliderCaptcha.vue`

- [ ] **Step 1: Create `src/components/SliderCaptcha.vue`**

```vue
<template>
  <view class="sc-overlay" @tap.self="$emit('cancel')">
    <view class="sc-box">
      <text class="sc-title">请拖动滑块完成验证</text>

      <!-- Captcha images -->
      <view class="sc-img-wrap" ref="containerRef">
        <image
          class="sc-bg"
          :src="'data:image/png;base64,' + bgImg"
          mode="scaleToFill"
        />
        <image
          class="sc-piece"
          :src="'data:image/png;base64,' + pieceImg"
          :style="{ left: dragX + 'px' }"
          mode="aspectFit"
        />
      </view>

      <!-- Slider track -->
      <view class="sc-track"
        @touchstart="onStart"
        @touchmove.prevent="onMove"
        @touchend="onEnd"
      >
        <view class="sc-fill" :style="{ width: dragX + 'px' }" />
        <view class="sc-handle" :style="{ left: dragX + 'px' }">
          <text class="sc-arrow">›</text>
        </view>
        <text class="sc-hint">{{ status === 'idle' ? '按住向右滑动' : status === 'ok' ? '验证通过' : '拖动失败，请重试' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  bgImg:        { type: String, required: true },
  pieceImg:     { type: String, required: true },
  oriImageWidth:{ type: Number, default: 320 },
})
const emit = defineEmits(['success', 'cancel'])

const dragX = ref(0)
const status = ref('idle') // 'idle' | 'ok' | 'fail'
let containerWidth = 0
let startClientX = 0
let isDragging = false

function onStart(e) {
  if (status.value === 'ok') return
  isDragging = true
  startClientX = e.touches[0].clientX - dragX.value
  // Measure container on first drag
  if (!containerWidth) {
    uni.createSelectorQuery().select('.sc-track').boundingClientRect(rect => {
      if (rect) containerWidth = rect.width
    }).exec()
  }
}

function onMove(e) {
  if (!isDragging) return
  const x = Math.max(0, Math.min(e.touches[0].clientX - startClientX, containerWidth || 300))
  dragX.value = x
}

function onEnd() {
  if (!isDragging) return
  isDragging = false
  const w = containerWidth || 300
  const scaledDist = Math.round(dragX.value * props.oriImageWidth / w)
  emit('success', scaledDist)
}

function reset() {
  dragX.value = 0
  status.value = 'idle'
  containerWidth = 0
}

defineExpose({ reset })
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.sc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.sc-box {
  background: $surface;
  border-radius: $radius-xl;
  padding: 40rpx;
  width: 680rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.sc-title {
  font-size: 28rpx;
  color: $on-surface;
  text-align: center;
}

.sc-img-wrap {
  position: relative;
  width: 100%;
  height: 200rpx;
  border-radius: $radius-md;
  overflow: hidden;
}

.sc-bg {
  width: 100%;
  height: 100%;
}

.sc-piece {
  position: absolute;
  top: 0;
  width: 80rpx;
  height: 100%;
}

.sc-track {
  position: relative;
  height: 72rpx;
  background: $surface-container-highest;
  border-radius: 36rpx;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.sc-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: rgba($primary, 0.2);
  transition: none;
}

.sc-handle {
  position: absolute;
  top: 0;
  width: 72rpx;
  height: 72rpx;
  background: $primary;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.sc-arrow {
  color: $on-primary;
  font-size: 40rpx;
}

.sc-hint {
  position: absolute;
  width: 100%;
  text-align: center;
  font-size: 24rpx;
  color: $on-surface-variant;
  pointer-events: none;
}
</style>
```

- [ ] **Step 2: Manual test — verify component renders**

```bash
npm run dev:h5
```

Navigate to login page (can temporarily add `<SliderCaptcha>` to login.vue to preview). Check: background image displays, slider handle is draggable, `success` event emits with a number.

- [ ] **Step 3: Commit**

```bash
git add src/components/SliderCaptcha.vue
git commit -m "feat: add SliderCaptcha component (touch drag verification)"
```

---

### Task 8: Update `src/pages/login/login.vue` — real login flow

**Files:**
- Modify: `src/pages/login/login.vue`

- [ ] **Step 1: Replace login.vue script section**

Replace lines 78–109 of `src/pages/login/login.vue` with:

```vue
<script setup>
import { ref, onUnmounted } from 'vue'
import SliderCaptcha from '@/components/SliderCaptcha.vue'
import { useAuth } from '@/composables/useAuth.js'
import { getCaptchaApi, sendSmsCodeApi } from '@/api/login.js'

const auth = useAuth()
const phone = ref('')
const code  = ref('')
const countdown = ref(0)
const showCaptcha = ref(false)
const captchaData = ref({ bgImg: '', pieceImg: '', uuid: '', oriImageWidth: 320 })
const captchaRef = ref(null)
const loading = ref(false)

let countdownTimer = null

async function startCountdown() {
  if (countdown.value > 0 || !phone.value.trim()) return
  if (!phone.value.match(/^1[3-9]\d{9}$/)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const res = await getCaptchaApi()
    if (res.code !== 200) throw new Error(res.msg || '获取验证码失败')
    captchaData.value = {
      bgImg: res.data.img,
      pieceImg: res.data.smallImage,
      uuid: res.data.uuid,
      oriImageWidth: res.data.oriImageWidth || 320,
    }
    showCaptcha.value = true
  } catch (e) {
    uni.showToast({ title: e.message || '获取验证码失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function onSliderSuccess(distance) {
  showCaptcha.value = false
  loading.value = true
  try {
    const res = await sendSmsCodeApi({
      phoneNumber: phone.value,
      uuid: captchaData.value.uuid,
      code: distance,
    })
    if (res.code !== 200) throw new Error(res.msg || '发送短信失败')
    // Store smsUuid for login step
    captchaData.value.smsUuid = res.data
    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }, 1000)
    uni.showToast({ title: '验证码已发送', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败，请重试', icon: 'none' })
    // Re-fetch a fresh captcha on failure (same uuid rejected by backend after one attempt)
    try {
      const res2 = await getCaptchaApi()
      if (res2.code === 200) {
        captchaData.value = { ...captchaData.value, bgImg: res2.data.img, pieceImg: res2.data.smallImage, uuid: res2.data.uuid }
        captchaRef.value?.reset()
        showCaptcha.value = true
      }
    } catch { /* ignore refresh failure */ }
  } finally {
    loading.value = false
  }
}

async function handleLogin() {
  if (!phone.value.trim() || !code.value.trim()) {
    uni.showToast({ title: '请填写手机号和验证码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    await auth.loginByMobile(phone.value.trim(), code.value.trim(), captchaData.value.smsUuid || '')
    uni.reLaunch({ url: '/pages/chat/chat' })
  } catch (e) {
    uni.showToast({ title: e.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>
```

- [ ] **Step 2: Add SliderCaptcha to template**

Inside the `<view class="page">`, add before `</view>` (closing page tag):

```vue
<!-- Slider captcha modal -->
<SliderCaptcha
  v-if="showCaptcha"
  :bg-img="captchaData.bgImg"
  :piece-img="captchaData.pieceImg"
  :ori-image-width="captchaData.oriImageWidth"
  ref="captchaRef"
  @success="onSliderSuccess"
  @cancel="showCaptcha = false"
/>
```

- [ ] **Step 3: Update Get Code button to show loading**

In the template, change `@tap="startCountdown"` button text to:

```vue
<text class="get-code-text">
  {{ loading ? '...' : countdown > 0 ? `${countdown}s` : '获取验证码' }}
</text>
```

- [ ] **Step 4: Manual test on H5**

```bash
npm run dev:h5
```

Flow: Enter phone → tap 获取验证码 → Slider captcha appears → drag → SMS sent toast → Enter code → Login → redirects to chat.

- [ ] **Step 5: Commit**

```bash
git add src/pages/login/login.vue
git commit -m "feat: wire real SMS + slider captcha login flow"
```

---

## Phase 3: WUKONGIM + Chat Core

### Task 9: `src/composables/useWukongIM.js`

**Files:**
- Create: `src/composables/useWukongIM.js`

- [ ] **Step 1: Create `src/composables/useWukongIM.js`**

```js
import { ref } from 'vue'
import { WKSDK, MessageText, Channel, ChannelTypePerson } from 'wukongimjssdk'
import { getChatIMLongConnection } from '../api/agent.js'

// Module-level singletons
const status = ref('disconnected') // 'connecting' | 'connected' | 'disconnected'
let _linkStatus = 0    // 1 = connected
let _telephone = ''    // saved for sendText channel + reconnect
let _userId = ''
let _token = ''
const _messageHandlers = new Set()

function _statusListener(s) {
  _linkStatus = s
  status.value = s === 1 ? 'connected' : 'disconnected'
}

function _msgListener(message) {
  _messageHandlers.forEach(h => h(message))
}

export function useWukongIM() {
  async function connect(userId, telephone, token) {
    if (_linkStatus === 1) return
    status.value = 'connecting'
    _userId = String(userId)
    _telephone = telephone
    _token = token

    try {
      const res = await getChatIMLongConnection({ sourceType: 3 })
      if (res.code !== 200) throw new Error('获取IM连接地址失败')
      const { modelType, wsAddr } = res.data

      const sdk = WKSDK.shared()
      if (modelType === 2) {
        sdk.config.provider.connectAddrCallback = (cb) => cb(wsAddr)
      } else {
        sdk.config.addr = wsAddr
      }
      sdk.config.uid = _userId
      sdk.config.token = _token

      sdk.connectManager.addConnectStatusListener(_statusListener)
      sdk.chatManager.addMessageListener(_msgListener)
      sdk.connectManager.connect()
    } catch (err) {
      status.value = 'disconnected'
      console.error('[WukongIM] 连接失败', err)
    }
  }

  function disconnect() {
    const sdk = WKSDK.shared()
    sdk.chatManager.removeMessageListener(_msgListener)
    sdk.connectManager.removeConnectStatusListener(_statusListener)
    sdk.connectManager.disconnect()
    _linkStatus = 0
    status.value = 'disconnected'
  }

  // reconnect: reuse saved SDK config directly, no extra HTTP call
  function reconnect() {
    if (_linkStatus === 1) return
    if (_telephone && _userId) {
      WKSDK.shared().connectManager.connect()
      status.value = 'connecting'
    }
  }

  function sendText(text) {
    const msg = new MessageText(text)
    const channel = new Channel(_telephone, ChannelTypePerson)
    WKSDK.shared().chatManager.send(msg, channel)
  }

  function onMessage(handler) {
    _messageHandlers.add(handler)
    return () => _messageHandlers.delete(handler)
  }

  return { status, connect, disconnect, reconnect, sendText, onMessage }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/composables/useWukongIM.js
git commit -m "feat: add useWukongIM composable (WKSDK.shared() wrapper)"
```

---

### Task 10: Refactor `src/stores/chat.js` — real data model

**Files:**
- Modify: `src/stores/chat.js`
- Modify: `src/stores/chat.test.js`

- [ ] **Step 1: Update `src/stores/chat.test.js`** to match new shape

Replace the entire file:

```js
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from './chat'

describe('useChatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with empty sessions and no active session', () => {
    const store = useChatStore()
    expect(store.sessions).toEqual([])
    expect(store.activeSessionId).toBe('')
  })

  it('newLocalSession adds a session and makes it active', () => {
    const store = useChatStore()
    store.newLocalSession()
    expect(store.sessions).toHaveLength(1)
    expect(store.activeSessionId).toBe(store.sessions[0].id)
  })

  it('activeMessages returns messages for active session', () => {
    const store = useChatStore()
    store.newLocalSession()
    store.pushMessage({
      id: 'm1', sessionId: store.activeSessionId,
      role: 'user', content: 'Hello', status: 'sent', createdAt: Date.now(),
    })
    expect(store.activeMessages).toHaveLength(1)
    expect(store.activeMessages[0].content).toBe('Hello')
  })

  it('switchSession changes active session', () => {
    const store = useChatStore()
    store.newLocalSession()
    const firstId = store.activeSessionId
    store.newLocalSession()
    store.switchSession(firstId)
    expect(store.activeSessionId).toBe(firstId)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL** (store shape not yet changed)

```bash
npx vitest run src/stores/chat.test.js
```

- [ ] **Step 3: Rewrite `src/stores/chat.js`**

```js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

let _seq = 0
function uid() { return `local-${Date.now()}-${++_seq}` }

export const useChatStore = defineStore('chat', () => {
  // ── State ────────────────────────────────────────
  const sessions   = ref([])   // [{ id, title, backendId?, createdAt }]
  const messages   = ref([])   // [{ id, sessionId, role, content, thinking?, attachments?, status, createdAt }]
  const activeSessionId = ref('')
  const aiReplying = ref(false)
  const wsStatus   = ref('disconnected')

  // ── Getters ──────────────────────────────────────
  const activeMessages = computed(
    () => messages.value.filter(m => m.sessionId === activeSessionId.value)
  )
  function activeSession() {
    return sessions.value.find(s => s.id === activeSessionId.value) || null
  }

  // ── Actions ──────────────────────────────────────
  function switchSession(id) {
    activeSessionId.value = id
  }

  function newLocalSession() {
    const id = uid()
    sessions.value.unshift({ id, title: '新对话', createdAt: Date.now() })
    activeSessionId.value = id
    return id
  }

  function pushMessage(msg) {
    messages.value.push(msg)
  }

  function upsertMessage(msg) {
    const idx = messages.value.findIndex(m => m.id === msg.id)
    if (idx >= 0) messages.value[idx] = msg
    else messages.value.push(msg)
  }

  function removeMessage(id) {
    messages.value = messages.value.filter(m => m.id !== id)
  }

  function setSessions(list) {
    sessions.value = list
  }

  function setMessages(list) {
    // Replace messages for the active session only
    messages.value = [
      ...messages.value.filter(m => m.sessionId !== activeSessionId.value),
      ...list,
    ]
  }

  return {
    sessions, messages, activeSessionId, aiReplying, wsStatus,
    activeMessages, activeSession,
    switchSession, newLocalSession, pushMessage, upsertMessage,
    removeMessage, setSessions, setMessages,
  }
})
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/stores/chat.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/chat.js src/stores/chat.test.js
git commit -m "refactor: replace mock chat store with real data model"
```

---

### Task 11: `src/composables/useChat.js`

**Files:**
- Create: `src/composables/useChat.js`

- [ ] **Step 1: Create `src/composables/useChat.js`**

```js
import { useChatStore } from '../stores/chat.js'
import { useWukongIM } from './useWukongIM.js'
import { useAuth } from './useAuth.js'
import { addChat, addChatRecordData, chatRecordDataSearchPage, getUserAccountChatList } from '../api/agent.js'

function randomId() {
  return 'xxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16))
}

// Text extraction from WKSDK message object
function extractText(message) {
  if (!message || typeof message !== 'object') return ''
  const content = message.content
  if (content && typeof content.content === 'string') return content.content
  if (content && typeof content.text === 'string') return content.text
  if (typeof content === 'string') return content
  if (typeof message.text === 'string') return message.text
  return ''
}

function extractThinking(text) {
  const m = text.match(/<\s*think(?:ing)?\s*>([\s\S]*?)<\s*\/\s*think(?:ing)?\s*>/i)
  return m ? m[1].trim() : ''
}

function stripThinkingTags(text) {
  return text.replace(/<\s*think(?:ing)?\s*>[\s\S]*?<\s*\/\s*think(?:ing)?\s*>/gi, '').trim()
}

function stripSystemBlock(text) {
  return text.replace(/<system>[\s\S]*?<\/system>\n*/gi, '').trim()
}

function stripActionTags(text) {
  return text
    .replace(/<pcAction>[\s\S]*?<\/pcAction>/gi, '')
    .replace(/<appAction>[\s\S]*?<\/appAction>/gi, '')
    .replace(/<deskAction>[\s\S]*?<\/deskAction>/gi, '')
    .trim()
}

function persistMessages(sessionId, msgs) {
  uni.setStorageSync(`jclaw_msgs_${sessionId}`, msgs)
}

function loadCachedMessages(sessionId) {
  return uni.getStorageSync(`jclaw_msgs_${sessionId}`) || []
}

let initialized = false
let streamingId = null
let doneTimer = null

export function useChat() {
  const store = useChatStore()
  const wkIM = useWukongIM()
  const auth = useAuth()

  // Register global WS message handler once
  if (!initialized) {
    initialized = true
    wkIM.onMessage((rawMsg) => {
      const role = auth.currentRole.value
      if (!role) return
      if (rawMsg.fromUID === String(role.userId)) return
      if (rawMsg.contentType !== 1 && rawMsg.contentType !== 103) return
      const text = extractText(rawMsg)
      if (!text) return

      _handleIncoming(text)
    })
  }

  function _handleIncoming(rawText) {
    const thinking = extractThinking(rawText)
    const clean = stripActionTags(stripSystemBlock(stripThinkingTags(rawText)))

    const msgId = streamingId || randomId()
    const sessionId = store.activeSessionId

    const msg = {
      id: msgId,
      sessionId,
      role: 'assistant',
      content: clean,
      thinking: thinking || undefined,
      status: 'done',
      createdAt: Date.now(),
    }

    store.upsertMessage(msg)
    persistMessages(sessionId, store.activeMessages)

    // Reset debounce timer — mark done 2 s after last incoming chunk
    clearTimeout(doneTimer)
    doneTimer = setTimeout(() => {
      streamingId = null
      store.aiReplying = false
    }, 2000)

    // Save AI message to backend
    const session = store.activeSession()
    if (session?.backendId && clean) {
      addChatRecordData({ fkChatId: session.backendId, chatContent: clean, chatObject: '1' })
        .catch(() => {})
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async function send(text, attachments = []) {
    if (!store.activeSessionId) store.newLocalSession()

    const userMsg = {
      id: randomId(),
      sessionId: store.activeSessionId,
      role: 'user',
      content: text,
      attachments: attachments.length ? attachments : undefined,
      status: 'sent',
      createdAt: Date.now(),
    }
    store.pushMessage(userMsg)

    // Placeholder AI message
    const placeholder = {
      id: randomId(),
      sessionId: store.activeSessionId,
      role: 'assistant',
      content: '',
      thinking: ' ',
      status: 'streaming',
      createdAt: Date.now(),
    }
    store.pushMessage(placeholder)
    streamingId = placeholder.id
    store.aiReplying = true

    // Update session title on first message
    const session = store.activeSession()
    if (session?.title === '新对话' && text) session.title = text.slice(0, 20)

    // Ensure backend session exists
    if (session && !session.backendId) {
      try {
        const res = await addChat({ chatTitle: text ? text.slice(0, 50) : '对话' })
        if (res.code === 200 && res.data) session.backendId = res.data
      } catch { /* continue without backendId */ }
    }

    // Build system prompt block
    const role = auth.currentRole.value
    const sysLines = [
      role?.userRolePrompt || '',
      ' operate-port: 2 ',
      auth.token.value ? `用户令牌：${auth.token.value}` : '',
    ].filter(Boolean).join('\n')
    const sysBlock = sysLines ? `<system>\n${sysLines}\n</system>\n\n` : ''

    // Save user message to backend
    if (session?.backendId) {
      const fileList = attachments.map(a => {
        let fileType = 1
        if (a.mimeType.startsWith('image/')) fileType = 0
        else if (a.mimeType.startsWith('audio/')) fileType = 2
        return { fileName: a.name, fileType: String(fileType), fileUrl: a.data }
      })
      addChatRecordData({
        fkChatId: session.backendId,
        chatContent: sysBlock + text,
        chatObject: '0',
        ...(fileList.length ? { chatRecordFileList: fileList } : {}),
      }).catch(() => {})
    }

    // Build IM payload (images as markdown, audio/files as links)
    let imText = text
    if (attachments.length) {
      const parts = []
      attachments.filter(a => a.mimeType.startsWith('image/')).forEach(a => parts.push(`![${a.name}](${a.data})`))
      if (!text) attachments.filter(a => a.mimeType.startsWith('audio/')).forEach(a => parts.push(`[🎵 语音](${a.data})`))
      attachments.filter(a => !a.mimeType.startsWith('image/') && !a.mimeType.startsWith('audio/')).forEach(a => parts.push(`[📄 ${a.name}](${a.data})`))
      if (parts.length) imText = parts.join('\n') + (text ? '\n' + text : '')
    }

    try {
      wkIM.sendText(sysBlock + imText)
      persistMessages(store.activeSessionId, store.activeMessages)
    } catch (err) {
      store.upsertMessage({ ...userMsg, status: 'error' })
      store.removeMessage(placeholder.id)
      streamingId = null
      store.aiReplying = false
    }
  }

  async function loadSession(sessionId) {
    store.switchSession(sessionId)
    // Try cache first
    const cached = loadCachedMessages(sessionId)
    if (cached.length) {
      store.setMessages(cached)
      return
    }
    // Load from backend
    const session = store.sessions.find(s => s.id === sessionId)
    if (!session?.backendId) return
    try {
      const res = await chatRecordDataSearchPage({ fkChatId: session.backendId, pageNum: 1, pageSize: 200 })
      if (res.code !== 200) return
      const records = res.data?.records || []
      const msgs = records.map(r => ({
        id: String(r.pkId),
        sessionId,
        role: String(r.chatObject) === '0' ? 'user' : 'assistant',
        content: stripSystemBlock(r.chatContent || ''),
        status: 'done',
        createdAt: r.createTime || Date.now(),
        attachments: r.chatRecordFileList?.map(f => ({
          name: f.fileName || 'file',
          mimeType: f.fileType === '0' ? 'image/png' : f.fileType === '2' ? 'audio/mp3' : 'application/octet-stream',
          data: f.fileUrl || '',
          previewUrl: f.fileType === '0' ? f.fileUrl : undefined,
        })),
      }))
      store.setMessages(msgs)
      persistMessages(sessionId, msgs)
    } catch { /* ignore load errors */ }
  }

  async function loadSessions() {
    try {
      const res = await getUserAccountChatList()
      if (res.code !== 200) return
      const list = (res.data || []).map(item => ({
        id: String(item.pkId),
        title: item.chatTitle || '对话',
        backendId: item.pkId,
        createdAt: item.createTime || Date.now(),
      }))
      store.setSessions(list)
      if (list.length && !store.activeSessionId) {
        store.switchSession(list[0].id)
        await loadSession(list[0].id)
      }
    } catch { /* ignore */ }
  }

  function newSession() {
    store.newLocalSession()
  }

  return { send, loadSession, loadSessions, newSession }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/composables/useChat.js
git commit -m "feat: add useChat composable (send, load, AI response handling)"
```

---

### Task 12: `src/components/MarkdownContent.vue`

**Files:**
- Create: `src/components/MarkdownContent.vue`

- [ ] **Step 1: Create `src/components/MarkdownContent.vue`**

```vue
<template>
  <!-- #ifdef H5 -->
  <div class="md-body" v-html="rendered" />
  <!-- #endif -->
  <!-- #ifndef H5 -->
  <rich-text class="md-body" :nodes="rendered" />
  <!-- #endif -->
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps({ content: { type: String, default: '' } })
const rendered = computed(() => marked(props.content || '', { breaks: true }))
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.md-body {
  font-size: 28rpx;
  line-height: 1.6;
  color: $on-surface;
  word-break: break-word;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MarkdownContent.vue
git commit -m "feat: add MarkdownContent component (H5: v-html, App: rich-text)"
```

---

### Task 13: Update `src/components/ChatBubble.vue` — new message model + Markdown

**Files:**
- Modify: `src/components/ChatBubble.vue`

The existing ChatBubble reads `message.type`/`message.text`. The new model uses `message.role`/`message.content`/`message.thinking`. Replace the entire file:

- [ ] **Step 1: Replace `src/components/ChatBubble.vue`**

```vue
<template>
  <view class="bubble-row" :class="message.role === 'user' ? 'bubble-row--user' : ''">
    <!-- AI avatar -->
    <view v-if="message.role === 'assistant'" class="bubble-avatar">
      <text class="avatar-text">AI</text>
    </view>

    <view class="bubble-col">
      <!-- Thinking block (collapsible) -->
      <view v-if="message.thinking && message.thinking.trim()" class="thinking-block" @tap="thinkExpanded = !thinkExpanded">
        <text class="thinking-label">{{ thinkExpanded ? '▾ 思考过程' : '▸ 思考过程' }}</text>
        <text v-if="thinkExpanded" class="thinking-text">{{ message.thinking }}</text>
      </view>

      <!-- Message content -->
      <view class="bubble" :class="bubbleClass">
        <!-- Streaming placeholder -->
        <view v-if="message.status === 'streaming' && !message.content" class="streaming-dots">
          <view class="dot" /><view class="dot dot--2" /><view class="dot dot--3" />
        </view>
        <!-- AI: render markdown -->
        <MarkdownContent v-else-if="message.role === 'assistant'" :content="message.content" />
        <!-- User: plain text -->
        <text v-else class="msg-text">{{ message.content }}</text>
      </view>

      <!-- Attachments -->
      <view v-if="message.attachments && message.attachments.length" class="attach-list">
        <view v-for="(a, i) in message.attachments" :key="i" class="attach-chip">
          <image v-if="a.previewUrl" :src="a.previewUrl" class="attach-img" mode="aspectFill" />
          <text v-else class="attach-name">📎 {{ a.name }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import MarkdownContent from './MarkdownContent.vue'

const props = defineProps({ message: { type: Object, required: true } })
const thinkExpanded = ref(false)

const bubbleClass = computed(() => ({
  'bubble--user': props.message.role === 'user',
  'bubble--ai':   props.message.role === 'assistant',
  'bubble--error': props.message.status === 'error',
}))
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.bubble-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: 24rpx;
  &--user { flex-direction: row-reverse; }
}

.bubble-avatar {
  width: 56rpx;
  height: 56rpx;
  background-color: $primary;
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  flex-shrink: 0;
}
.avatar-text { color: $on-primary; font-size: 20rpx; font-weight: 700; }

.bubble-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  max-width: 80%;
}

.thinking-block {
  background: rgba($secondary-container, 0.5);
  border-radius: $radius-md;
  padding: 12rpx 16rpx;
}
.thinking-label { font-size: 22rpx; color: $on-surface-variant; font-weight: 600; }
.thinking-text  { font-size: 22rpx; color: $on-surface-variant; margin-top: 8rpx; line-height: 1.5; }

.bubble {
  padding: 20rpx 24rpx;
  border-radius: $radius-xl;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);

  &--user  { background-color: $primary; align-self: flex-end; border-bottom-right-radius: $radius-sm; }
  &--ai    { background-color: $surface-container-lowest; border-bottom-left-radius: $radius-sm; }
  &--error { background-color: rgba($error, 0.1); }
}

.msg-text { font-size: 28rpx; color: $on-primary; line-height: 1.6; }

.streaming-dots {
  display: flex; flex-direction: row; gap: 8rpx; padding: 4rpx 0;
}
.dot {
  width: 12rpx; height: 12rpx; border-radius: 50%; background-color: $outline;
  animation: bounce 1.2s infinite;
  &--2 { animation-delay: 0.2s; }
  &--3 { animation-delay: 0.4s; }
}
@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30%            { transform: translateY(-10rpx); }
}

.attach-list { display: flex; flex-direction: row; flex-wrap: wrap; gap: 8rpx; }
.attach-chip { border-radius: $radius-md; overflow: hidden; max-width: 160rpx; }
.attach-img  { width: 160rpx; height: 120rpx; }
.attach-name { font-size: 22rpx; color: $on-surface-variant; padding: 8rpx; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ChatBubble.vue
git commit -m "feat: update ChatBubble for new message model (role/content/thinking + Markdown)"
```

---

### Task 14: Update `src/pages/chat/chat.vue` and `src/App.vue`

**Files:**
- Modify: `src/pages/chat/chat.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: Replace the entire `<script setup>` block in `src/pages/chat/chat.vue`**

Find and replace the full `<script setup>...</script>` section:

```vue
<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useChat } from '@/composables/useChat.js'
import ChatBubble from '@/components/ChatBubble.vue'
import InputBar from '@/components/InputBar.vue'
import DrawerNav from '@/components/DrawerNav.vue'

const store = useChatStore()
const chat = useChat()
const drawerVisible = ref(false)
const scrollTarget = ref('')

onMounted(async () => {
  await chat.loadSessions()
})

watch(
  () => store.activeMessages.length,
  () => {
    scrollTarget.value = ''
    nextTick(() => { scrollTarget.value = 'msg-bottom' })
  }
)

async function handleSend({ text, attachments }) {
  await chat.send(text, attachments)
}

async function handleSelectSession(id) {
  drawerVisible.value = false
  await chat.loadSession(id)
}

async function handleSelectRole(id) {
  try {
    await auth.switchRole(id)
    const role = auth.currentRole.value
    if (role) wkIM.connect(String(role.userId), role.telephone, auth.token.value)
  } catch (e) {
    uni.showToast({ title: e.message || '切换角色失败', icon: 'none' })
  }
}

function handleNewChat() {
  chat.newSession()
  drawerVisible.value = false
}
</script>
```

- [ ] **Step 2: Update the template in `src/pages/chat/chat.vue`**

The template must be updated to use the new store API. Replace the template `<ChatBubble>` loop, `v-if="store.isTyping"`, and the `DrawerNav` bindings. The full updated template section (inside `<view class="page">`):

```vue
<!-- Message list -->
<scroll-view scroll-y class="message-list" :scroll-into-view="scrollTarget">
  <view class="message-list-inner">
    <ChatBubble
      v-for="msg in store.activeMessages"
      :key="msg.id"
      :message="msg"
    />
    <!-- Typing indicator -->
    <view v-if="store.aiReplying" class="typing-row">
      <view class="typing-icon"><text class="typing-icon-text">AI</text></view>
      <view class="typing-bubble">
        <view class="dot" /><view class="dot dot--2" /><view class="dot dot--3" />
      </view>
    </view>
    <view id="msg-bottom" class="scroll-anchor" />
  </view>
</scroll-view>
```

For `DrawerNav`, roles now come from `useAuth`:

```vue
<DrawerNav
  :visible="drawerVisible"
  :sessions="store.sessions"
  :active-session-id="store.activeSessionId"
  :roles="auth.roles.value"
  :active-role-id="auth.currentRoleId.value"
  @close="drawerVisible = false"
  @select-session="handleSelectSession"
  @select-role="handleSelectRole"
  @new-chat="handleNewChat"
/>
```

Add `import { useAuth } from '@/composables/useAuth.js'` and `const auth = useAuth()` to the script.

- [ ] **Step 3: Update `src/App.vue` — WS lifecycle**

Replace `src/App.vue` with:

```vue
<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useAuth } from '@/composables/useAuth.js'
import { useWukongIM } from '@/composables/useWukongIM.js'

const auth = useAuth()
const wkIM = useWukongIM()

onLaunch(() => {
  // #ifdef H5
  const info = uni.getSystemInfoSync()
  document.documentElement.style.setProperty('--status-bar-height', info.statusBarHeight + 'px')
  // #endif

  // Auto-connect if already logged in
  if (auth.isLoggedIn.value) {
    const role = auth.currentRole.value
    if (role) wkIM.connect(String(role.userId), role.telephone, auth.token.value)
  }
})

onShow(() => {
  if (auth.isLoggedIn.value) wkIM.reconnect()
})

onHide(() => {
  wkIM.disconnect()
})
</script>

<style lang="scss">
@use '@/styles/variables.scss' as *;
page {
  background-color: $surface;
  font-family: 'PingFang SC', 'Helvetica Neue', sans-serif;
  box-sizing: border-box;
}
* { box-sizing: border-box; }
</style>
```

- [ ] **Step 4: Connect after login — update `login.vue` handleLogin**

After `uni.reLaunch`, also trigger WS connect. Since the redirect will fire `App.vue onLaunch`, and auth state is already set, the auto-connect in App.vue handles this. No extra change needed.

- [ ] **Step 5: Manual test**

```bash
npm run dev:h5
```

Full flow: Login → chat page loads → sessions appear in drawer → send a message → AI responds via WS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/chat/chat.vue src/App.vue
git commit -m "feat: wire chat page and App.vue to real WUKONGIM + useChat"
```

---

## Phase 4: Multimedia Input

### Task 15: `src/utils/upload.js` — File upload (COS / MinIO)

**Files:**
- Create: `src/utils/upload.js`

- [ ] **Step 1: Create `src/utils/upload.js`**

```js
import COS from 'cos-js-sdk-v5'
import { getUploadToken } from '../api/agent.js'

async function uploadToCOS(file, tokenData, onProgress) {
  return new Promise((resolve, reject) => {
    const cos = new COS({
      getAuthorization(_options, callback) {
        callback({
          TmpSecretId: tokenData.tmpSecretId,
          TmpSecretKey: tokenData.tmpSecretKey,
          SecurityToken: tokenData.token,
          ExpiredTime: Math.floor(Date.now() / 1000) + 3600,
        })
      },
    })
    const key = `${tokenData.folderName || 'uploads'}/${Date.now()}_${file.name || 'file'}`
    cos.uploadFile({
      Bucket: tokenData.bucketName,
      Region: tokenData.regionName,
      Key: key,
      Body: file,
      onProgress: ({ percent }) => onProgress && onProgress(Math.round(percent * 100)),
      onSuccess(data) { resolve(`https://${data.Location}`) },
      onError: reject,
    })
  })
}

async function uploadToMinIO(file, tokenData, onProgress) {
  // MinIO: use uni.uploadFile (multipart)
  return new Promise((resolve, reject) => {
    const key = `${tokenData.folderName || 'uploads'}/${Date.now()}_${file.name || 'file'}`
    // #ifdef H5
    // In H5, file is a File/Blob. Use fetch with PUT to MinIO presigned-like URL.
    // The token data for MinIO case contains endpoint + bucketName.
    const url = `${tokenData.endpoint}/${tokenData.bucketName}/${key}`
    fetch(url, { method: 'PUT', body: file })
      .then(() => resolve(url))
      .catch(reject)
    // #endif
    // #ifndef H5
    uni.uploadFile({
      url: `${tokenData.endpoint}/${tokenData.bucketName}/${key}`,
      filePath: file.path || file,
      name: 'file',
      success(res) { resolve(`${tokenData.endpoint}/${tokenData.bucketName}/${key}`) },
      fail: reject,
    })
    // #endif
  })
}

/**
 * Upload a file and return its public URL.
 * @param {File|{path:string, name:string}} file
 * @param {Function} [onProgress]  — called with 0-100 progress number
 * @returns {Promise<string>} public URL
 */
export async function uploadFile(file, onProgress) {
  const res = await getUploadToken()
  if (res.code !== 200) throw new Error(res.msg || '获取上传凭证失败')
  const tokenData = res.data
  if (tokenData.usageType === 1) {
    return uploadToCOS(file, tokenData, onProgress)
  }
  return uploadToMinIO(file, tokenData, onProgress)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/upload.js
git commit -m "feat: add file upload utility (COS/MinIO via token)"
```

---

### Task 16: `src/components/VoiceRecorder.vue`

**Files:**
- Create: `src/components/VoiceRecorder.vue`

- [ ] **Step 1: Create `src/components/VoiceRecorder.vue`**

```vue
<template>
  <view class="vr-btn"
    :class="recording ? 'vr-btn--active' : ''"
    @touchstart.prevent="startRecord"
    @touchend="stopRecord"
    @touchcancel="cancelRecord"
  >
    <image src="/static/icon-mic.svg" class="vr-icon" mode="aspectFit" />
    <text v-if="recording" class="vr-hint">松开结束</text>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { getAliyunToken } from '@/api/agent.js'
import { uploadFile } from '@/utils/upload.js'

const emit = defineEmits(['text', 'file'])
const recording = ref(false)

// ── H5: MediaRecorder ─────────────────────────────────────────────────
// #ifdef H5
let _mediaRecorder = null
let _chunks = []

async function startRecord() {
  recording.value = true
  _chunks = []
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']
      .find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'
    _mediaRecorder = new MediaRecorder(stream, { mimeType })
    _mediaRecorder.ondataavailable = e => { if (e.data.size > 0) _chunks.push(e.data) }
    _mediaRecorder.onstop = () => _processH5Audio(mimeType, stream)
    _mediaRecorder.start()
  } catch {
    recording.value = false
    uni.showToast({ title: '麦克风权限未授权', icon: 'none' })
  }
}

function stopRecord() {
  if (_mediaRecorder?.state === 'recording') _mediaRecorder.stop()
  recording.value = false
}

function cancelRecord() {
  if (_mediaRecorder?.state === 'recording') {
    _mediaRecorder.ondataavailable = null
    _mediaRecorder.stop()
  }
  recording.value = false
}

async function _processH5Audio(mimeType, stream) {
  stream.getTracks().forEach(t => t.stop())
  const blob = new Blob(_chunks, { type: mimeType })
  const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('ogg') ? 'ogg' : 'mp4'
  const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: mimeType })
  await _sendToASR(blob, mimeType, file)
}
// #endif

// ── App: uni.getRecorderManager ───────────────────────────────────────
// #ifndef H5
let _recManager = null
let _lastFilePath = ''

function startRecord() {
  recording.value = true
  if (!_recManager) {
    _recManager = uni.getRecorderManager()
    _recManager.onStop(res => { _processAppAudio(res.tempFilePath) })
    _recManager.onError(() => { recording.value = false })
  }
  _recManager.start({ format: 'aac', duration: 60000 })
}

function stopRecord() {
  _recManager?.stop()
  recording.value = false
}

function cancelRecord() {
  _recManager?.stop()
  recording.value = false
}

async function _processAppAudio(tempFilePath) {
  _lastFilePath = tempFilePath
  const mimeType = 'audio/aac'
  // Read file as ArrayBuffer for ASR
  const res = await new Promise((resolve, reject) => {
    const fs = uni.getFileSystemManager()
    fs.readFile({ filePath: tempFilePath, success: resolve, fail: reject })
  })
  const buf = res.data
  await _sendToASR(buf, mimeType, { path: tempFilePath, name: `voice_${Date.now()}.aac` })
}
// #endif

// ── Shared: Aliyun ASR via WebSocket ─────────────────────────────────
function getAsrFormat(mimeType) {
  if (mimeType.includes('webm') || mimeType.includes('ogg')) return 'opus'
  if (mimeType.includes('mp4') || mimeType.includes('aac')) return 'aac'
  return 'pcm'
}

async function _sendToASR(audioData, mimeType, file) {
  // Upload file first (for attachment embed in message)
  let uploadedUrl = ''
  try {
    uploadedUrl = await uploadFile(file)
    emit('file', { name: file.name || 'voice', mimeType, data: uploadedUrl })
  } catch { /* non-blocking — still attempt ASR */ }

  // ASR recognition
  try {
    const tokenRes = await getAliyunToken()
    if (tokenRes.code !== 200) throw new Error('获取ASR凭证失败')
    const { token, appKey } = tokenRes.data
    const format = getAsrFormat(mimeType)
    const text = await _aliyunISI(audioData, token, appKey, format)
    if (text) emit('text', text)
  } catch (e) {
    uni.showToast({ title: '语音识别失败', icon: 'none' })
  }
}

function _aliyunISI(audioData, token, appKey, format) {
  return new Promise((resolve, reject) => {
    const taskId = 'xxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16))
    const ws = new WebSocket(`wss://nls-gateway-cn-shenzhen.aliyuncs.com/ws/v1?token=${token}`)

    ws.binaryType = 'arraybuffer'
    ws.onopen = () => {
      ws.send(JSON.stringify({
        header: { message_id: taskId, task_id: taskId, namespace: 'SpeechRecognizer', name: 'StartRecognition', appkey: appKey },
        payload: { format, sample_rate: 16000, enable_punctuation_prediction: true, enable_inverse_text_normalization: true },
      }))
    }

    let _result = ''
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        const name = msg.header?.name
        if (name === 'RecognitionResultChanged') _result = msg.payload?.result || _result
        if (name === 'RecognitionCompleted') {
          _result = msg.payload?.result || _result
          ws.close()
          resolve(_result)
        }
        if (name === 'TaskFailed') { ws.close(); reject(new Error(msg.header?.status_message)) }
        // After StartRecognitionCompleted, send audio then stop
        if (name === 'StartRecognitionCompleted') {
          const buf = audioData instanceof ArrayBuffer ? audioData : audioData
          const CHUNK = 8192
          let offset = 0
          while (offset < buf.byteLength) {
            ws.send(buf.slice(offset, offset + CHUNK))
            offset += CHUNK
          }
          ws.send(JSON.stringify({
            header: { message_id: taskId, task_id: taskId, namespace: 'SpeechRecognizer', name: 'StopRecognition', appkey: appKey },
          }))
        }
      } catch { /* ignore parse errors */ }
    }
    ws.onerror = reject
    setTimeout(() => { ws.close(); resolve(_result) }, 30000) // 30s timeout
  })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.vr-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  position: relative;

  &--active {
    background-color: rgba($error, 0.1);
  }
}

.vr-icon {
  width: 40rpx;
  height: 40rpx;
}

.vr-hint {
  position: absolute;
  bottom: -40rpx;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 20rpx;
  color: $error;
  background: rgba($surface, 0.9);
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/VoiceRecorder.vue
git commit -m "feat: add VoiceRecorder (H5: MediaRecorder, App: uni.getRecorderManager + Aliyun ASR)"
```

---

### Task 17: Update `src/components/InputBar.vue` — multimedia support

**Files:**
- Modify: `src/components/InputBar.vue`

- [ ] **Step 1: Replace `src/components/InputBar.vue`**

```vue
<template>
  <view class="input-bar-wrapper">
    <!-- Attachment previews -->
    <view v-if="attachments.length" class="attach-preview-row">
      <view
        v-for="(a, i) in attachments"
        :key="i"
        class="attach-item"
        @tap="removeAttachment(i)"
      >
        <image v-if="a.previewUrl" :src="a.previewUrl" class="attach-thumb" mode="aspectFill" />
        <view v-else class="attach-file-icon">
          <text class="attach-file-text">{{ a.name.slice(-6) }}</text>
        </view>
        <view class="attach-remove"><text>×</text></view>
      </view>
    </view>

    <!-- Icon row -->
    <view class="icon-row">
      <!-- Image picker -->
      <view class="icon-btn" @tap="pickImage">
        <image src="/static/icon-camera.svg" class="icon" mode="aspectFit" />
      </view>

      <!-- File picker -->
      <view class="icon-btn" @tap="pickFile">
        <image src="/static/icon-attach.svg" class="icon" mode="aspectFit" />
        <!-- H5 hidden file input -->
        <!-- #ifdef H5 -->
        <input
          ref="fileInputRef"
          type="file"
          accept=".pdf,.txt,.doc,.docx,.xls,.xlsx"
          class="file-input-hidden"
          @change="onFileInputChange"
        />
        <!-- #endif -->
      </view>

      <!-- Voice recorder -->
      <VoiceRecorder @text="onVoiceText" @file="onVoiceFile" />
    </view>

    <!-- Input + send row -->
    <view class="input-row">
      <textarea
        v-model="inputText"
        class="input-field"
        :auto-height="true"
        :max-height="200"
        placeholder="Message Architect AI..."
        placeholder-class="input-placeholder"
        @confirm="handleSend"
      />
      <view
        class="send-btn"
        :class="canSend ? 'send-btn--active' : 'send-btn--disabled'"
        @tap="handleSend"
      >
        <image src="/static/icon-send.svg" class="send-icon" mode="aspectFit" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import VoiceRecorder from './VoiceRecorder.vue'
import { uploadFile } from '@/utils/upload.js'

const emit = defineEmits(['send'])
const inputText = ref('')
const attachments = ref([])  // [{ name, mimeType, data: url, previewUrl? }]
const uploading = ref(false)
// #ifdef H5
const fileInputRef = ref(null)
// #endif

const canSend = computed(() => !uploading.value && (inputText.value.trim() || attachments.value.length > 0))

function handleSend() {
  if (!canSend.value) return
  emit('send', { text: inputText.value.trim(), attachments: [...attachments.value] })
  inputText.value = ''
  attachments.value = []
}

// ── Image picker ──────────────────────────────────────────────────────
function pickImage() {
  uni.chooseImage({
    count: 9,
    sizeType: ['compressed'],
    async success(res) {
      uploading.value = true
      try {
        for (const path of res.tempFilePaths) {
          const url = await uploadFile({ path, name: `image_${Date.now()}.jpg` })
          attachments.value.push({ name: 'image.jpg', mimeType: 'image/jpeg', data: url, previewUrl: url })
        }
      } catch {
        uni.showToast({ title: '图片上传失败', icon: 'none' })
      } finally {
        uploading.value = false
      }
    },
  })
}

// ── File picker ───────────────────────────────────────────────────────
function pickFile() {
  // #ifdef H5
  fileInputRef.value?.click()
  // #endif
  // #ifndef H5
  uni.chooseFile({
    count: 1,
    async success(res) {
      uploading.value = true
      try {
        const file = res.tempFiles[0]
        const url = await uploadFile({ path: file.path, name: file.name })
        attachments.value.push({ name: file.name, mimeType: 'application/octet-stream', data: url })
      } catch {
        uni.showToast({ title: '文件上传失败', icon: 'none' })
      } finally {
        uploading.value = false
      }
    },
  })
  // #endif
}

// #ifdef H5
async function onFileInputChange(e) {
  const file = e.target.files[0]
  if (!file) return
  uploading.value = true
  try {
    const url = await uploadFile(file)
    attachments.value.push({ name: file.name, mimeType: file.type, data: url })
  } catch {
    uni.showToast({ title: '文件上传失败', icon: 'none' })
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}
// #endif

// ── Voice callbacks ───────────────────────────────────────────────────
function onVoiceText(text) {
  inputText.value += (inputText.value ? ' ' : '') + text
}

function onVoiceFile(file) {
  attachments.value.push(file)
}

function removeAttachment(index) {
  attachments.value.splice(index, 1)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.input-bar-wrapper {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  background-color: $surface;
  padding-top: 16rpx;
  padding-left: 24rpx;
  padding-right: 24rpx;
}

.attach-preview-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 12rpx 0;
}

.attach-item {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  border-radius: $radius-md;
  overflow: hidden;
  background-color: $surface-container-highest;
}

.attach-thumb {
  width: 100%;
  height: 100%;
}

.attach-file-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.attach-file-text {
  font-size: 20rpx;
  color: $on-surface-variant;
}

.attach-remove {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 36rpx;
  height: 36rpx;
  background: rgba(0,0,0,0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: white;
}

.icon-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 16rpx;
  background-color: rgba(255, 255, 255, 0.85);
  border: 2rpx solid rgba($outline-variant, 0.3);
  border-radius: 32rpx 32rpx 0 0;
  border-bottom: none;
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.icon { width: 40rpx; height: 40rpx; }

.file-input-hidden {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  cursor: pointer;
}

.input-row {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  background-color: rgba(255, 255, 255, 0.85);
  border: 2rpx solid rgba($outline-variant, 0.3);
  border-top: 1rpx solid rgba($outline-variant, 0.15);
  border-radius: 0 0 32rpx 32rpx;
  padding: 8rpx 12rpx 12rpx 12rpx;
}

.input-field {
  flex: 1;
  font-size: 28rpx;
  color: $on-surface;
  padding: 16rpx 12rpx;
  min-height: 72rpx;
  line-height: 1.5;
  background: transparent;
}

.input-placeholder { color: rgba($on-surface-variant, 0.5); }

.send-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: $radius-xl;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &--active  { background-color: $primary; }
  &--disabled { background-color: $surface-container-high; opacity: 0.6; }
}

.send-icon {
  width: 40rpx;
  height: 40rpx;
  filter: brightness(0) invert(1);
}
</style>
```

- [ ] **Step 2: Update `chat.vue` handleSend to destructure `{ text, attachments }`**

`handleSend` already accepts `{ text, attachments }` from Task 13. If not done, update:

```js
async function handleSend({ text, attachments }) {
  await chat.send(text, attachments)
}
```

- [ ] **Step 3: Manual test — full flow**

```bash
npm run dev:h5
```

Test:
1. Select an image → preview appears → send → message contains image thumbnail
2. Hold mic button → speak → release → recognized text appears in input
3. Select a file → send → message shows filename

- [ ] **Step 4: Commit**

```bash
git add src/components/InputBar.vue
git commit -m "feat: add multimedia input (image/file/voice) to InputBar"
```

---

## Final Verification Checklist

- [ ] `npm run dev:h5` — dev server starts without errors
- [ ] Login: phone → slider captcha → SMS → login → chat page
- [ ] Error cases: wrong SMS code → toast shown, page stays
- [ ] Chat: send text → WS response → AI bubble renders with markdown
- [ ] Thinking blocks: if AI response has `<thinking>` content, it appears in ChatBubble
- [ ] Image upload: choose image → attachment preview → send → backend record
- [ ] Voice: hold mic → speak → text in input box
- [ ] Token expiry: modify jclaw_token in storage → next request → auto redirect to login
- [ ] App background/foreground: `npm run dev:app` if available → background then foreground → WS reconnects
- [ ] Run unit tests: `npx vitest run` — all pass

---

## Appendix: Running Tests

```bash
# All unit tests
npx vitest run

# Watch mode during development
npx vitest
```

Expected passing tests:
- `src/utils/device.test.js` — 3 tests
- `src/utils/request.test.js` — 3 tests
- `src/composables/useAuth.test.js` — 3 tests
- `src/stores/chat.test.js` — 4 tests
