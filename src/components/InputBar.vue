<template>
  <view class="input-bar-wrapper">
    <!-- Attachment preview -->
    <view v-if="attachments.length" class="attach-preview">
      <view v-for="(att, i) in attachments" :key="i" class="attach-thumb">
        <image v-if="att.mimeType?.startsWith('image/')" :src="att.previewUrl || att.url" class="thumb-img" mode="aspectFill" />
        <text v-else class="thumb-file">📄</text>
        <view class="thumb-remove" @tap="removeAttachment(i)">
          <text class="thumb-remove-icon">✕</text>
        </view>
      </view>
    </view>

    <!-- Icon row -->
    <view class="icon-row">
      <view class="icon-btn" @tap="chooseImage">
        <image src="/static/icon-camera.svg" class="icon" mode="aspectFit" />
      </view>
      <view class="icon-btn" @tap="chooseFile">
        <image src="/static/icon-attach.svg" class="icon" mode="aspectFit" />
      </view>
      <!-- H5 hidden file input for file picking -->
      <!-- #ifdef H5 -->
      <input
        ref="fileInputRef"
        type="file"
        accept=".pdf,.txt,.doc,.docx,.xls,.xlsx"
        class="hidden-file-input"
        @change="onFileInputChange"
      />
      <!-- #endif -->
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
const attachments = ref([])
const fileInputRef = ref(null)

const canSend = computed(() => inputText.value.trim() || attachments.value.length > 0)

function removeAttachment(index) {
  attachments.value.splice(index, 1)
}

async function chooseImage() {
  uni.chooseImage({
    count: 9,
    sizeType: ['compressed'],
    success: async (res) => {
      for (const path of res.tempFilePaths) {
        try {
          uni.showLoading({ title: '上传中...' })
          const url = await uploadFile({ path })
          attachments.value.push({
            name: path.split('/').pop() || 'image.jpg',
            mimeType: 'image/jpeg',
            url,
            previewUrl: path,
          })
        } catch {
          uni.showToast({ title: '图片上传失败', icon: 'none' })
        } finally {
          uni.hideLoading()
        }
      }
    },
  })
}

async function chooseFile() {
  // #ifdef H5
  fileInputRef.value?.click()
  // #endif
  // #ifndef H5
  uni.chooseFile({
    count: 5,
    success: async (res) => {
      for (const path of res.tempFilePaths) {
        await uploadLocalFile(path, path.split('/').pop() || 'file')
      }
    },
  })
  // #endif
}

// #ifdef H5
async function onFileInputChange(e) {
  const files = e.target.files
  if (!files?.length) return
  for (const file of files) {
    await uploadLocalFile(file, file.name)
  }
  e.target.value = ''
}
// #endif

async function uploadLocalFile(file, name) {
  try {
    uni.showLoading({ title: '上传中...' })
    const url = await uploadFile(typeof file === 'string' ? { path: file } : file)
    const mimeType = name.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? 'image/jpeg' : 'application/octet-stream'
    attachments.value.push({ name, mimeType, url })
  } catch {
    uni.showToast({ title: '文件上传失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function onVoiceText(text) {
  inputText.value += text
}

async function onVoiceFile({ path, mimeType }) {
  await uploadLocalFile(path, 'voice.' + (mimeType?.split('/')[1] || 'aac'))
  if (attachments.value.length) {
    attachments.value[attachments.value.length - 1].mimeType = mimeType || 'audio/aac'
  }
}

function handleSend() {
  if (!canSend.value) return
  emit('send', { text: inputText.value.trim(), attachments: [...attachments.value] })
  inputText.value = ''
  attachments.value = []
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

/* Icon row */
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
}

.icon {
  width: 40rpx;
  height: 40rpx;
}

.hidden-file-input {
  display: none;
}

/* Input row */
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

  &--active { background-color: $primary; }
  &--disabled { background-color: $surface-container-high; opacity: 0.6; }
}

.send-icon {
  width: 40rpx;
  height: 40rpx;
  filter: brightness(0) invert(1);
}
</style>
