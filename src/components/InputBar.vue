<template>
  <view class="input-bar-wrapper">
    <!-- Quick actions chip row -->
    <QuickActions @action="onQuickAction" />

    <!-- Attachment preview -->
    <view v-if="attachments.length" class="attach-preview">
      <view v-for="(att, i) in attachments" :key="i" class="attach-thumb" @tap="att.mimeType?.startsWith('image/') && previewImage(i)">
        <image v-if="att.mimeType?.startsWith('image/')" :src="att.previewUrl || att.url" class="thumb-img" mode="aspectFill" />
        <text v-else class="thumb-file">📄</text>
        <view class="thumb-remove" @tap.stop="removeAttachment(i)">
          <text class="thumb-remove-icon">✕</text>
        </view>
      </view>
    </view>

    <!-- 识别中状态条 -->
    <view v-if="isTranscribing" class="transcribing-bar">
      <view class="trans-spinner" />
      <text class="trans-hint">正在识别语音...</text>
    </view>

    <!-- 录音条（录音时替换输入区域） -->
    <view v-else-if="isRecording" class="recording-bar">
      <view class="rec-indicator">
        <view class="rec-dot-wrap">
          <view class="rec-dot-ring" />
          <view class="rec-dot" />
        </view>
        <text class="rec-time">{{ recFormattedTime }}</text>
      </view>
      <text class="rec-hint">正在录音中</text>
      <view class="rec-actions">
        <view class="rec-cancel-btn" @tap="onVoiceCancel">
          <text class="rec-cancel-text">取消</text>
        </view>
        <view class="rec-send-btn" @tap="onVoiceFinish">
          <text class="rec-send-text">发送</text>
        </view>
      </view>
    </view>

    <!-- Input row（录音/识别时隐藏） -->
    <template v-else>
      <!-- 快捷语 tag 展示 -->
      <view v-if="selectedAction" class="action-tag-row">
        <view class="action-tag">
          <text class="action-tag-text">{{ selectedAction.title }}</text>
          <text class="action-tag-close" @tap="selectedAction = null; inputText = ''">×</text>
        </view>
      </view>
      <view class="input-row">
        <textarea
          v-model="inputText"
          class="input-field"
          :auto-height="true"
          :max-height="200"
          placeholder="请输入消息"
          placeholder-class="input-placeholder"
          @confirm="handleSend" />
      </view>

      <!-- Bottom toolbar -->
      <view class="icon-row">
        <view class="icon-btn" @tap="chooseImage">
          <image src="/static/icon-camera.svg" class="icon" mode="aspectFit" />
        </view>
        <!-- #ifdef H5 -->
        <view class="icon-btn" @click="chooseFile">
          <image src="/static/icon-attach.svg" class="icon" mode="aspectFit" />
        </view>
        <!-- #endif -->
        <!-- #ifndef H5 -->
        <view class="icon-btn" @tap="chooseFile">
          <image src="/static/icon-attach.svg" class="icon" mode="aspectFit" />
        </view>
        <!-- #endif -->
        <view class="icon-row-spacer" />
        <view class="icon-btn" @tap="onVoiceStart">
          <image src="/static/icon-mic.svg" class="icon" mode="aspectFit" />
        </view>
        <view class="send-btn" :class="canSend ? 'send-btn--active' : 'send-btn--disabled'" @tap="handleSend">
          <image src="/static/icon-send.svg" class="send-icon" mode="aspectFit" />
        </view>
      </view>
    </template>
    <VoiceRecorder ref="voiceRef" />
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import VoiceRecorder from './VoiceRecorder.vue'
import QuickActions from './QuickActions.vue'
import { uploadImage, uploadAttachment, uploadAudio } from '@/utils/upload.js'
import { getAliyunToken } from '@/api/agent.js'
import { transcribeAudio } from '@/utils/voice.js'

const emit = defineEmits(['send'])
const inputText = ref('')
const selectedAction = ref(null)
watch(selectedAction, (action) => {
  inputText.value = action?.words ?? ''
})
watch(inputText, (val) => {
  if (!val && selectedAction.value) selectedAction.value = null
})
const attachments = ref([])
const voiceRef = ref(null)
const isRecording = ref(false)
const isTranscribing = ref(false)
const recSeconds = ref(0)
let _recTimer = null
// #ifdef H5
let _h5FileInput = null
// #endif

const canSend = computed(() => inputText.value.trim() || attachments.value.length > 0)

const recFormattedTime = computed(() => {
  const m = Math.floor(recSeconds.value / 60)
    .toString()
    .padStart(2, '0')
  const s = (recSeconds.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

async function onVoiceStart() {
  try {
    await voiceRef.value.start()
    isRecording.value = true
    recSeconds.value = 0
    _recTimer = setInterval(() => {
      recSeconds.value += 1
    }, 1000)
  } catch {}
}

function _stopRecTimer() {
  if (_recTimer) {
    clearInterval(_recTimer)
    _recTimer = null
  }
}

function onVoiceCancel() {
  voiceRef.value.cancel()
  isRecording.value = false
  _stopRecTimer()
}

async function onVoiceFinish() {
  if (isTranscribing.value) return
  isRecording.value = false
  _stopRecTimer()
  isTranscribing.value = true

  try {
    const audio = await voiceRef.value.finish()
    if (!audio) return

    // 最小有效录音校验
    // #ifdef H5
    if (audio.blob.size < 1024) {
      uni.showToast({ title: '录音时间太短，请重试', icon: 'none' })
      return
    }
    // #endif

    // 并行：上传音频 + 获取 Token 后 ASR 识别
    const [audioUrl, asrText] = await Promise.all([_uploadAudio(audio), _transcribe(audio)])

    if (!asrText.trim()) {
      uni.showToast({ title: '未能识别语音内容，请重试', icon: 'none' })
      return
    }

    const ext = audio.mimeType?.split('/')[1] || 'aac'
    emit('send', {
      text: asrText,
      attachments: [{ name: `voice.${ext}`, mimeType: audio.mimeType, url: audioUrl }],
    })
  } catch (e) {
    uni.showToast({ title: e?.message || '语音识别失败，请重试', icon: 'none' })
  } finally {
    isTranscribing.value = false
  }
}

// ── 音频上传 + ASR ────────────────────────────────────────────────

/** 上传音频，返回 CDN URL */
async function _uploadAudio(audio) {
  // #ifdef H5
  const blobUrl = URL.createObjectURL(audio.blob)
  try {
    return await uploadAudio({ path: blobUrl })
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
  // #endif
  // #ifndef H5
  return uploadAudio({ path: audio.path })
  // #endif
}

/** 读取 ArrayBuffer 后调用 ASR */
async function _transcribe(audio) {
  const tokenRes = await getAliyunToken()
  const tokenData = tokenRes.data || tokenRes
  const token = tokenData.token || tokenData.aliyunToken || ''
  const appKey = tokenData.appKey || ''

  let arrayBuffer
  // #ifdef H5
  arrayBuffer = await audio.blob.arrayBuffer()
  // #endif
  // #ifndef H5
  arrayBuffer = await new Promise((ok, fail) => {
    const fs = uni.getFileSystemManager?.()
    if (fs) {
      fs.readFile({ filePath: audio.path, success: (r) => ok(r.data), fail })
    } else {
      // 回退：5+App 使用 plus.io
      plus.io.resolveLocalFileSystemURL(audio.path, (entry) => {
        entry.file((file) => {
          const reader = new plus.io.FileReader()
          reader.onloadend = (e) => ok(e.target.result)
          reader.readAsArrayBuffer(file)
        }, fail)
      }, fail)
    }
  })
  if (arrayBuffer.byteLength < 1024) throw new Error('录音时间太短，请重试')
  // #endif

  return transcribeAudio(arrayBuffer, audio.mimeType, token, appKey)
}

// ── 图片上传 ──────────────────────────────────────────────────────

function removeAttachment(index) {
  attachments.value.splice(index, 1)
}

function previewImage(index) {
  const urls = attachments.value.filter((a) => a.mimeType?.startsWith('image/')).map((a) => a.previewUrl || a.url)
  const current = attachments.value[index].previewUrl || attachments.value[index].url
  uni.previewImage({ urls, current })
}

async function chooseImage() {
  uni.chooseImage({
    count: 9,
    sizeType: ['compressed'],
    success: async ({ tempFilePaths }) => {
      for (const path of tempFilePaths) {
        try {
          uni.showLoading({ title: '上传中...' })
          const url = await uploadImage({ path })
          attachments.value.push({
            name: path.split('/').pop() || 'image.jpg',
            mimeType: 'image/jpeg',
            url,
            previewUrl: path, // 本地临时路径用作预览
          })
        } catch (e) {
          uni.showToast({ title: e?.message || '图片上传失败', icon: 'none' })
        } finally {
          uni.hideLoading()
        }
      }
    },
  })
}

// ── 文件上传 ──────────────────────────────────────────────────────

async function chooseFile() {
  // #ifdef H5
  if (!_h5FileInput) {
    _h5FileInput = document.createElement('input')
    _h5FileInput.type = 'file'
    _h5FileInput.accept = '.pdf,.txt,.doc,.docx,.xls,.xlsx'
    _h5FileInput.multiple = true
    _h5FileInput.style.position = 'fixed'
    _h5FileInput.style.left = '-9999px'
    _h5FileInput.style.top = '0'
    _h5FileInput.style.width = '1px'
    _h5FileInput.style.height = '1px'
    _h5FileInput.style.opacity = '0'
    _h5FileInput.style.pointerEvents = 'none'
    _h5FileInput.addEventListener('change', async (e) => {
      const files = e.target?.files
      if (!files?.length) return
      for (const file of files) {
        await _processFile(file, file.name)
      }
      e.target.value = ''
    })
    document.body.appendChild(_h5FileInput)
  }
  _h5FileInput.value = ''
  _h5FileInput.click()
  // #endif
  // #ifndef H5
  uni.chooseMessageFile({
    count: 9,
    success: async ({ tempFilePaths, tempFiles }) => {
      for (let i = 0; i < tempFilePaths.length; i++) {
        const path = tempFilePaths[i]
        const name = tempFiles?.[i]?.name || path.split('/').pop() || 'file'
        await _processFile({ path }, name)
      }
    },
  })
  // #endif
}

/** 统一文件处理（校验 + 上传 + 推入附件列表） */
async function _processFile(file, name) {
  try {
    uni.showLoading({ title: '上传中...' })

    // #ifdef H5
    const mimeType = file instanceof File && file.type ? file.type : _inferMimeType(name)
    const url = await uploadAttachment(file instanceof File ? file : { path: file.path || file })
    // #endif
    // #ifndef H5
    const mimeType = _inferMimeType(name)
    const url = await uploadAttachment({ path: file.path || file })
    // #endif

    // 图片文件额外生成预览 URL
    let previewUrl
    if (mimeType.startsWith('image/')) {
      // #ifdef H5
      previewUrl = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(file instanceof File ? file : new Blob())
      })
      // #endif
      // #ifndef H5
      previewUrl = file.path || file
      // #endif
    }

    attachments.value.push({ name, mimeType, url, previewUrl })
  } catch (e) {
    uni.showToast({ title: e?.message || '文件上传失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function _inferMimeType(name = '') {
  if (/\.(png|jpg|jpeg|gif|webp)$/i.test(name)) return 'image/jpeg'
  if (/\.pdf$/i.test(name)) return 'application/pdf'
  if (/\.doc$/i.test(name)) return 'application/msword'
  if (/\.docx$/i.test(name)) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (/\.xls$/i.test(name)) return 'application/vnd.ms-excel'
  if (/\.xlsx$/i.test(name)) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (/\.txt$/i.test(name)) return 'text/plain'
  return 'application/octet-stream'
}

function onQuickAction(action) {
  selectedAction.value = action
}

function handleSend() {
  if (!canSend.value) return
  emit('send', { text: inputText.value.trim(), attachments: [...attachments.value] })
  inputText.value = ''
  selectedAction.value = null
  attachments.value = []
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.input-bar-wrapper {
  padding-top: 16rpx;
  padding-left: 24rpx;
  padding-right: 24rpx;
  padding-bottom: 20rpx;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: $surface;
}

/* Attachment preview */
.attach-preview {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 12rpx 0;
}

.attach-thumb {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  border-radius: $radius-lg;
  overflow: visible;
}

.thumb-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: $radius-lg;
}

.thumb-file {
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  background: $surface-container;
  border-radius: $radius-lg;
}

.thumb-remove {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 36rpx;
  height: 36rpx;
  background: $error;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.thumb-remove-icon {
  font-size: 20rpx;
  color: white;
}

/* Transcribing bar */
.transcribing-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
  background-color: rgba(255, 255, 255, 0.85);
  border: 2rpx solid rgba($outline-variant, 0.3);
  border-radius: 32rpx;
  padding: 28rpx 28rpx;
}

.trans-spinner {
  width: 36rpx;
  height: 36rpx;
  border: 4rpx solid rgba($primary, 0.2);
  border-top-color: $primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.trans-hint {
  font-size: 28rpx;
  color: $on-surface-variant;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Recording bar */
.recording-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.85);
  border: 2rpx solid rgba($outline-variant, 0.3);
  border-radius: 32rpx;
  padding: 20rpx 20rpx 20rpx 24rpx;
  gap: 0;
}

.rec-indicator {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 14rpx;
  flex-shrink: 0;
}

.rec-dot-wrap {
  position: relative;
  width: 20rpx;
  height: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rec-dot-ring {
  position: absolute;
  width: 20rpx;
  height: 20rpx;
  background-color: rgba(#ef4444, 0.35);
  border-radius: 50%;
  animation: rec-ping 1.4s ease-out infinite;
}

.rec-dot {
  position: relative;
  width: 12rpx;
  height: 12rpx;
  background-color: #ef4444;
  border-radius: 50%;
}

.rec-time {
  font-size: 34rpx;
  font-weight: 700;
  color: $on-surface;
  letter-spacing: 2rpx;
  font-variant-numeric: tabular-nums;
}

.rec-hint {
  flex: 1;
  font-size: 22rpx;
  color: $on-surface-variant;
  padding-left: 16rpx;
  opacity: 0.6;
}

.rec-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
}

.rec-cancel-btn {
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 32rpx;
  border: 2rpx solid rgba($outline-variant, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rec-cancel-text {
  font-size: 26rpx;
  color: $on-surface-variant;
  font-weight: 500;
}

.rec-send-btn {
  height: 64rpx;
  padding: 0 32rpx;
  border-radius: 32rpx;
  background-color: $primary;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rec-send-text {
  font-size: 26rpx;
  font-weight: 600;
  color: $on-primary;
}

@keyframes rec-ping {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

/* Action tag */
.action-tag-row {
  padding: 16rpx 0 0;
}

.action-tag {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border: 2rpx solid rgba(#ef4444, 0.3);
  border-radius: $radius-full;
  background-color: rgba(#ef4444, 0.06);
}

.action-tag-text {
  font-size: 22rpx;
  color: #ef4444;
}

.action-tag-close {
  font-size: 28rpx;
  color: #ef4444;
  line-height: 1;
  padding-left: 4rpx;
}

/* Input row */
.input-row {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  background-color: rgba(255, 255, 255, 0.85);
  border: 2rpx solid rgba($outline-variant, 0.3);
  border-bottom: 1rpx solid rgba($outline-variant, 0.12);
  border-radius: 32rpx 32rpx 0 0;
  padding: 8rpx 16rpx 12rpx 16rpx;
}

/* Bottom toolbar */
.icon-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 8rpx 8rpx 8rpx;
  background-color: rgba(255, 255, 255, 0.85);
  border: 2rpx solid rgba($outline-variant, 0.3);
  border-top: none;
  border-radius: 0 0 32rpx 32rpx;
}

.icon-row-spacer {
  flex: 1;
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon {
  width: 40rpx;
  height: 40rpx;
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

.input-placeholder {
  color: rgba($on-surface-variant, 0.5);
}

.send-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: $radius-xl;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &--active {
    background-color: $primary;
  }
  &--disabled {
    background-color: $surface-container-high;
    opacity: 0.6;
  }
}

.send-icon {
  width: 40rpx;
  height: 40rpx;
  filter: brightness(0) invert(1);
}
</style>
