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
| 录音 H5 | `MediaRecorder` API |
| 录音 App | `uni.getRecorderManager()` |

---

## 目录结构变更

```
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
│   ├── useWukongIM.js    # WKSDK 连接管理、消息收发
│   └── useChat.js        # 消息流、会话管理、系统提示词构建
├── components/
│   ├── SliderCaptcha.vue     # 拖动验证码（touch 事件）
│   ├── VoiceRecorder.vue     # 语音录制（条件编译）
│   └── MarkdownContent.vue   # AI 回复 Markdown 渲染
├── pages/
│   ├── login/login.vue   # 改造为真实登录逻辑
│   └── chat/chat.vue     # 接入真实 WUKONGIM 数据
└── stores/
    └── chat.js           # 扩展为真实数据模型
```

---

## 一、登录流程

### 1.1 完整流程

```
用户输入手机号
    ↓
点击「获取验证码」
    → GET /code
    → 返回 { img(Base64背景), smallImage(Base64滑块), uuid }
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
    → POST /auth/ai/sysLogin
      { phoneNumber, code: smsCode, uuid: smsUuid,
        forceType: 1, sourceType: 3, operateSource: 2 }
    → 返回 { access_token, userList }
    → uni.setStorageSync('jclaw_token', access_token)
    → uni.setStorageSync('jclaw_auth', { roles: userList, currentRoleId: userList[0].userId })
    → uni.reLaunch({ url: '/pages/chat/chat' })
```

### 1.2 SliderCaptcha.vue

- 接收 Base64 背景图（320px 原始宽度）与滑块图
- 在 380px 宽容器内展示，拖动距离乘以缩放系数 `320/380` 传给接口
- 使用 `@touchstart` / `@touchmove` / `@touchend` 事件（兼容 H5 + App）
- 验证失败自动刷新验证码图片

### 1.3 utils/request.js

```js
// 核心逻辑
async function request(url, options = {}) {
  const token = uni.getStorageSync('jclaw_token')
  const clientId = await getDeviceId()
  const allParams = { ...(options.params || {}), operatePort: 2 }

  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method: options.method || 'GET',
      data: options.body ? JSON.parse(options.body) : allParams,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token || '',
        'clientid': clientId,
      },
      success(res) {
        if (res.data.code === 503) {
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
- 存储 key：`jclaw_device_keypair_v2_${phoneNumber}`（uni.setStorageSync）

---

## 二、WUKONGIM 连接

### 2.1 连接流程（composables/useWukongIM.js）

```js
async function connect(userId, telephone, token) {
  const { modelType, wsAddr } = await getChatIMLongConnection({ sourceType: 3 })
  if (modelType === 2) {
    WKSDK.config.provider.connectAddrCallback = (cb) => cb(wsAddr)
  } else {
    WKSDK.config.addr = wsAddr
  }
  WKSDK.config.uid = String(userId)
  WKSDK.config.token = token
  WKSDK.connectManager.addConnectStatusListener(statusListener)
  WKSDK.chatManager.addMessageListener(messageListener)
  WKSDK.connectManager.connect()
}
```

### 2.2 消息监听

- 过滤 `msg.fromUID === currentUserId` 的消息（自己发的）
- 只处理 `contentType === 1`（文本）和 `contentType === 103`（扩展）
- 提取 `<thinking>...</thinking>` 内容单独展示
- 清除 `<system>`, `<pcAction>`, `<appAction>`, `<deskAction>` 等标签

---

## 三、AI 聊天消息流

### 3.1 发送消息（composables/useChat.js）

```
1. 本地插入 user 消息（status: 'sent'）
2. 插入 AI 占位消息（content: '', thinking: ' ', status: 'streaming'）
3. 如果新会话：POST /eng/agent/add → 获取 backendId
4. POST /eng/agent/addChatRecordData（含系统提示词 + 附件列表）
5. wkIM.sendText("<system>\n角色提示词\noperate-port: 2\n用户令牌\n</system>\n\n用户消息")
6. AI 通过 WS 回包 → 解析 → 更新占位消息
7. uni.setStorageSync('jclaw_msgs_' + sessionId, messages)
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
// 扩展现有 stores/chat.js
{
  id: string,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  thinking: string,         // <thinking> 内容
  attachments: Attachment[],
  status: 'sent' | 'streaming' | 'done' | 'error',
  createdAt: number,
}
```

---

## 四、多媒体输入

### 4.1 InputBar.vue 改造

新增按钮：📎 附件、🖼 图片、🎤 语音

| 操作 | 实现 |
|------|------|
| 选择图片 | `uni.chooseImage({ count: 9, sizeType: ['compressed'] })` |
| 选择文件 | H5: `<input type="file" accept=".pdf,.txt">` / App: `uni.chooseFile` |
| 语音录制 | VoiceRecorder 组件（见下） |
| 附件预览 | 列表展示缩略图，支持删除 |

### 4.2 VoiceRecorder.vue（条件编译）

```vue
<!-- H5 分支 -->
<!-- #ifdef H5 -->
<template><!-- 长按录音按钮，MediaRecorder(WebM/Opus) --></template>
<!-- #endif -->

<!-- App 分支 -->
<!-- #ifndef H5 -->
<template><!-- uni.getRecorderManager() 录制 AAC --></template>
<!-- #endif -->
```

录制完成 → 上传文件 → 获取阿里云 ASR token → WebSocket 发送音频 → 返回文字追加到输入框

### 4.3 utils/upload.js

```js
// 根据后端返回的 usageType 判断上传方式
async function uploadFile(file, onProgress) {
  const token = await getUploadToken() // GET /eng/file/temporary/token
  if (token.usageType === 1) {
    return uploadToCOS(file, token, onProgress)
  } else {
    return uploadToMinIO(file, token, onProgress)
  }
}
```

---

## 五、stores/chat.js 改造

现有 mock store 改造为真实数据：
- 去除硬编码 mock 消息
- `sessions` 从 `/eng/agent/getUserAccountChatList` 加载
- `messages` 从 `/eng/agent/chatRecordDataSearchPage` 分页加载
- 保留 `isTyping` / `aiReplying` 等 UI 状态

---

## 六、环境配置

新增 `.env.dev`：
```
VITE_API_BASE_URL=http://192.168.2.99:9199
```

---

## 七、依赖安装

```bash
npm install wukongimjssdk tweetnacl js-sha256 cos-js-sdk-v5 marked
```

---

## 八、验证方式

1. **登录流程**: 输入手机号 → 滑块弹出 → 拖动成功 → 短信收到 → 登录跳转聊天页
2. **聊天基础**: 发送文本消息 → WS 回包 → AI 消息展示（含 thinking 折叠）
3. **图片上传**: 选择图片 → 上传进度 → 消息中显示缩略图
4. **语音识别**: 按住录音 → 松开 → 文字出现在输入框
5. **会话持久化**: 刷新页面后消息仍在（localStorage）
6. **登录态过期**: token 失效时自动跳转登录页
