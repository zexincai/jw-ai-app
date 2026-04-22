# 移动端登录 & AI 聊天功能设计文档

**日期**: 2026-04-19
**项目**: my-vue3-project（uni-app 移动端）
**参考**: app-jw-web（PC 端实现）

---

## 背景与目标

PC 端（app-jw-web）已完整实现：短信 + 滑块验证码登录、WUKONGIM 长连接 AI 聊天、多媒体输入（图片、文件、语音）。

移动端（my-vue3-project）当前仅有 UI 原型，无真实后端对接。本设计在保持现有设计语言（Material Design 3 蓝色主题）的基础上，实现与 PC 端相同的功能，目标平台为 **H5 + App 双端**，开发语言保持 **JavaScript**。

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 框架 | Vue 3 + uni-app |
| 状态管理 | Pinia（已有） |
| HTTP | `uni.request` 封装（替换 fetch） |
| IM SDK | `wukongimjssdk` |
| 设备指纹 | `tweetnacl` + `js-sha256` |
| 文件上传 | COS JS SDK（cos-js-sdk-v5）或 MinIO multipart |
| 语音识别 | 阿里云 ISI（WebSocket） |
| 录音 H5 | `MediaRecorder` API（运行时选择支持的 MIME 类型） |
| 录音 App | `uni.getRecorderManager()` |
| Markdown App | `<rich-text>` 节点树（不能用 v-html） |
| Markdown H5 | `marked` + `v-html` |

---

## 目录结构变更

```text
src/
├── api/
│   ├── login.js          # getCaptchaApi, sendSmsCodeApi, mobileLoginApi
│   └── agent.js          # 会话 CRUD、消息记录 API
├── utils/
│   ├── request.js        # uni.request 封装（自动注入 token/clientid/operatePort）
│   ├── device.js         # Ed25519 设备 ID 生成与持久化
│   └── upload.js         # 文件上传（COS / MinIO）
├── composables/
│   ├── useAuth.js        # 登录状态、token/roles 持久化
│   ├── useWukongIM.js    # WKSDK.shared() 连接管理、消息收发
│   └── useChat.js        # 消息流、会话管理、系统提示词构建
├── components/
│   ├── SliderCaptcha.vue     # 拖动验证码（touch 事件）
│   ├── VoiceRecorder.vue     # 语音录制（条件编译）
│   └── MarkdownContent.vue   # AI 回复 Markdown 渲染（H5/App 双路）
├── pages/
│   ├── login/login.vue   # 改造为真实登录逻辑
│   └── chat/chat.vue     # 接入真实 WUKONGIM 数据
└── stores/
    └── chat.js           # 扩展为真实数据模型
```

---

## 一、登录流程

### 1.1 完整流程

```text
用户输入手机号
    ↓
点击「获取验证码」
    → GET /code
    → 返回 { img(Base64 背景), smallImage(Base64 滑块), uuid, oriImageWidth }
    → 弹出 SliderCaptcha 组件
    ↓
用户拖动滑块
    → emit('success', distance)
    → POST /auth/send/verification/code
      { phoneNumber, uuid, code: distance, sendType: 1 }
    → 返回 smsUuid
    → 倒计时 60s 开始
    ↓
用户输入短信验证码，点「登录」
    → 存 uni.setStorageSync('jclaw_last_phone', phoneNumber)   ← 必须先存，device.js 依赖它
    → POST /auth/ai/sysLogin
      { phoneNumber, code: smsCode, uuid: smsUuid,
        forceType: 1, sourceType: 3, operateSource: 2 }
    → 返回 { access_token, userList }
    → uni.setStorageSync('jclaw_token', access_token)
    → uni.setStorageSync('jclaw_auth', { roles: userList, currentRoleId: userList[0].userId })
    → uni.reLaunch({ url: '/pages/chat/chat' })

各步骤错误均通过 uni.showToast({ title: errMsg, icon: 'none' }) 展示
```

### 1.2 SliderCaptcha.vue

- 接收 Base64 背景图和滑块图，以及 `oriImageWidth` 字段
- 缩放系数 = `oriImageWidth / containerWidth`（不硬编码，从接口返回值计算）
- 使用 `@touchstart` / `@touchmove` / `@touchend` 事件（兼容 H5 + App）
- 验证失败自动调用 `getCaptchaApi()` 刷新图片

### 1.3 utils/request.js

`operatePort` 必须始终追加到 **URL 查询参数**，不管是 GET 还是 POST。

`BASE_URL` 按平台 / 环境区分：H5 开发时走 Vite proxy（`/api`），App 及生产 H5 直接用完整地址。

```js
// H5 开发用代理前缀，其他环境用完整地址
// #ifdef H5
const BASE_URL = import.meta.env.DEV ? '/api' : import.meta.env.VITE_API_BASE_URL
// #ifndef H5
// const BASE_URL = import.meta.env.VITE_API_BASE_URL
// #endif

async function request(url, options = {}) {
  const token = uni.getStorageSync('jclaw_token')
  const clientId = await getDeviceId()

  // operatePort 始终在 URL 查询参数里（兼容老版 App 运行时，不用 URLSearchParams）
  const allParams = { ...(options.params || {}), operatePort: 2 }
  const qs = Object.entries(allParams).map(([k, v]) => `${k}=${v}`).join('&')
  const fullUrl = `${BASE_URL}${url}${url.includes('?') ? '&' : '?'}${qs}`

  return new Promise((resolve, reject) => {
    uni.request({
      url: fullUrl,
      method: options.method || 'GET',
      data: options.data || undefined,   // POST body 原样传对象
      header: {
        'Content-Type': 'application/json',
        'Authorization': token || '',
        'clientid': clientId,
      },
      success(res) {
        if (res.data.code === 503) {
          // callLogoutSilently: 尽力而为，不 await，不阻塞跳转
          // POST /auth/ai/sysLogout，带上当前 token header 即可
          uni.request({ url: `${BASE_URL}/auth/ai/sysLogout?operatePort=2`,
            method: 'POST', header: { Authorization: token } })
          uni.removeStorageSync('jclaw_token')
          uni.reLaunch({ url: '/pages/login/login' })
          return
        }
        resolve(res.data)
      },
      fail: reject,
    })
  })
}
```

### 1.4 utils/device.js

- 用 `tweetnacl.sign.keyPair()` 生成 Ed25519 密钥对
- `deviceId = sha256(publicKey)` 作为 HTTP `clientid` 头
- 存储 key：`jclaw_device_keypair_v2_${phoneNumber}`（优先用传入的 phone，fallback 取 `jclaw_last_phone`）
- **注意**：`tweetnacl` 在 App 的 V8 引擎下可正常运行；若出现 `crypto` 异常，降级为 `Math.random` 生成 32 字节随机 hex 作为 deviceId

---

## 二、WUKONGIM 连接

### 2.1 连接流程（composables/useWukongIM.js）

所有 SDK 调用必须通过 `WKSDK.shared()` 单例，不可直接用 `WKSDK.*`：

```js
import WKSDK from 'wukongimjssdk'

async function connect(userId, telephone, token) {
  const { modelType, wsAddr } = await getChatIMLongConnection({ sourceType: 3 })
  const sdk = WKSDK.shared()

  if (modelType === 2) {
    sdk.config.provider.connectAddrCallback = (cb) => cb(wsAddr)
  } else {
    sdk.config.addr = wsAddr
  }
  sdk.config.uid = String(userId)
  sdk.config.token = token
  sdk.connectManager.addConnectStatusListener(statusListener)
  sdk.chatManager.addMessageListener(messageListener)
  sdk.connectManager.connect()
}

function disconnect() {
  WKSDK.shared().connectManager.disconnect()
}

// reconnect = 用已保存的 uid/token/addr 直接重连，无需重新获取 wsAddr
function reconnect() {
  WKSDK.shared().connectManager.connect()
}
```

### 2.2 App 生命周期管理

在 `App.vue` 中处理前后台切换，防止连接静默死亡：

```js
onHide(() => { wkIM.disconnect() })
onShow(() => { if (auth.isLoggedIn) wkIM.reconnect() })
```

### 2.3 消息监听

- 过滤 `msg.fromUID === currentUserId` 的消息（自己发的）
- 只处理 `contentType === 1`（文本）和 `contentType === 103`（扩展）
- 提取 `<thinking>...</thinking>` 内容单独展示
- 清除 `<system>`, `<pcAction>`, `<appAction>`, `<deskAction>` 等标签后再显示

---

## 三、AI 聊天消息流

### 3.1 发送消息（composables/useChat.js）

```text
1. 本地插入 user 消息（status: 'sent'）
2. 插入 AI 占位消息（content: '', thinking: ' ', status: 'streaming'）
   → streamingId = 占位消息 id
3. 如果新会话：POST /app/agent/add → 获取 backendId
4. POST /app/agent/addChatRecordData（含系统提示词 + 附件列表）
5. wkIM.sendText("<system>\n角色提示词\noperate-port: 2\n用户令牌\n</system>\n\n用户消息")

--- AI WS 回包（WUKONGIM 发离散 text 消息，非 SSE）---

6. 第一条回包：content 非空 → 替换占位消息 content，status 保持 'streaming'
7. 每条后续回包：追加 content，提取 thinking 标签
8. 收到结束信号后 → status = 'done'，streamingId = null

   结束信号判断规则（与 PC 端一致）：
   · 消息 content 以约定结束标记结尾（后端实现决定，首选：判断 AI 在一段
     静默时间内（2 s）无新消息，用防抖 timer 触发 done）
   · 若后端明确发送 contentType=999 的结束帧则优先用该信号

9. uni.setStorageSync('jclaw_msgs_' + sessionId, messages)
```

### 3.2 系统提示词构建

```js
const sysBlock = [
  role?.userRolePrompt || '',
  'operate-port: 2',
  token ? `用户令牌：${token}` : '',
].filter(Boolean).join('\n')
const wrapped = `<system>\n${sysBlock}\n</system>\n\n${userMessage}`
```

### 3.3 消息数据模型

```js
// stores/chat.js 扩展
{
  id: String,
  sessionId: String,
  role: 'user' | 'assistant',
  content: String,
  thinking: String,          // <thinking> 内容
  attachments: Attachment[], // { name, mimeType, url, previewUrl }
  status: 'sent' | 'streaming' | 'done' | 'error',
  createdAt: Number,
}
```

### 3.4 多角色支持

`userList` 可能包含多个角色：
- 登录成功后默认激活 `userList[0]`
- Chat 页面顶部提供角色切换入口（复用现有 DrawerNav 中的角色选择）
- 切换角色时：调用 `/auth/ai/switchLogin` → 更新 token → 重新连接 WUKONGIM

---

## 四、多媒体输入

### 4.1 InputBar.vue 改造

新增按钮：附件、图片、语音

| 操作 | 实现 |
|------|------|
| 选择图片 | `uni.chooseImage({ count: 9, sizeType: ['compressed'] })` |
| 选择文件 | H5: `<input type="file" accept=".pdf,.txt">` / App: `uni.chooseFile` |
| 语音录制 | VoiceRecorder 组件（见下） |
| 附件预览 | 列表展示缩略图，支持删除 |

### 4.2 VoiceRecorder.vue（条件编译）

**H5 分支**：

```js
// 运行时检测支持的格式
const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']
  .find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'
const recorder = new MediaRecorder(stream, { mimeType })
```

**App 分支**：

```js
// #ifndef H5
const manager = uni.getRecorderManager()
manager.start({ format: 'aac', duration: 60000 })
// mimeType = 'audio/aac'
// #endif
```

录制完成后通过 `getAsrFormat(mimeType)` 映射阿里云格式字符串：

```js
function getAsrFormat(mimeType) {
  if (mimeType.includes('webm') || mimeType.includes('ogg')) return 'opus'
  if (mimeType.includes('mp4') || mimeType.includes('aac')) return 'aac'
  return 'pcm'
}
```

上传录音文件 → 获取阿里云 ASR token（`GET /app/voice/aliyunToken`）→ WebSocket ISI 识别 → 文字追加到输入框

### 4.3 utils/upload.js

```js
async function uploadFile(file, onProgress) {
  const tokenData = await getUploadToken() // GET /app/file/temporary/token
  if (tokenData.usageType === 1) {
    return uploadToCOS(file, tokenData, onProgress)
  } else {
    return uploadToMinIO(file, tokenData, onProgress)
  }
}
```

---

## 五、MarkdownContent.vue（双路渲染）

uni-app 3.x 的 `<rich-text>` 组件可直接接受 HTML 字符串（不需要手动转节点树），两端都能复用同一份 `marked` 输出：

```vue
<template>
  <!-- H5: v-html 渲染，支持自定义 CSS -->
  <!-- #ifdef H5 -->
  <div class="markdown-body" v-html="renderedHtml" />
  <!-- #endif -->

  <!-- App: rich-text 接受 HTML 字符串 -->
  <!-- #ifndef H5 -->
  <rich-text :nodes="renderedHtml" />
  <!-- #endif -->
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps({ content: String })
const renderedHtml = computed(() => marked(props.content || ''))
</script>
```

**限制**：`<rich-text>` 不支持 `<script>` / `<style>` 标签及事件绑定，但 AI 纯文本 Markdown 回复不需要这些，可以接受。

---

## 六、stores/chat.js 改造

现有 mock store 改造为真实数据：

- 去除硬编码 mock 消息
- `sessions` 从 `/app/agent/getUserAccountChatList` 加载
- `messages` 从 `/app/agent/chatRecordDataSearchPage` 分页加载
- 保留 `isTyping` / `aiReplying` 等 UI 状态

---

## 七、环境配置

新增 `.env.dev`：

```bash
VITE_API_BASE_URL=http://192.168.2.99:9199
```

`vite.config.js` 新增 H5 开发代理（解决跨域）：

```js
server: {
  proxy: {
    '/api': {
      target: process.env.VITE_API_BASE_URL,
      changeOrigin: true,
      rewrite: path => path.replace(/^\/api/, ''),
    }
  }
}
```

---

## 八、依赖安装

```bash
npm install wukongimjssdk tweetnacl js-sha256 cos-js-sdk-v5 marked
```

---

## 九、验证方式

1. **登录流程**: 输入手机号 → 滑块弹出 → 拖动成功 → 短信收到 → 登录跳转聊天页
2. **登录错误**: 故意输错验证码 → 看到 toast 提示，不崩溃
3. **聊天基础**: 发送文本消息 → WS 回包 → AI 消息展示（含 thinking 折叠）
4. **图片上传**: 选择图片 → 上传进度 → 消息中显示缩略图
5. **语音识别**: 按住录音 → 松开 → 文字出现在输入框
6. **会话持久化**: 刷新页面后消息仍在（uni.setStorageSync）
7. **登录态过期**: 修改 token 为非法值 → 自动跳回登录页
8. **App 后台切换**: 切换到后台再回来 → WS 自动重连，消息正常收发
