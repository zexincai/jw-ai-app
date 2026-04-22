<template>
  <!-- User bubble -->
  <view v-if="message.role === 'user'" class="bubble-row bubble-row--right">
    <!-- Attachments -->
    <view v-if="message.attachments?.length" class="attach-list attach-list--user">
      <view v-for="att in message.attachments" :key="att.url || att.name" class="attach-item">
        <image v-if="att.mimeType?.startsWith('image/')" :src="att.previewUrl || att.url" class="attach-img" mode="aspectFill" @tap="previewImage(message.attachments, att)" />
        <AudioPlayer v-else-if="att.mimeType?.startsWith('audio/')" :src="att.url" />
        <text v-else class="attach-file">📄 {{ att.name }}</text>
      </view>
    </view>
    <view v-if="message.content" class="bubble bubble--user">
      <text class="bubble-text">{{ message.content }}</text>
    </view>
  </view>

  <!-- Assistant bubble -->
  <view v-else class="bubble-row bubble-row--left">
    <view class="ai-icon">
      <image src="/static/logo.png" class="ai-icon-img" mode="aspectFit" />
    </view>
    <view class="bubble-wrap">
      <!-- Thinking block -->
      <view v-if="message.thinking?.trim()" class="thinking-block">
        <view class="thinking-header" @tap="thinkingOpen = !thinkingOpen">
          <text class="thinking-label">推理过程</text>
          <text class="thinking-toggle">{{ thinkingOpen ? '▲' : '▼' }}</text>
        </view>
        <view v-if="thinkingOpen" class="thinking-body">
          <text class="thinking-text">{{ message.thinking }}</text>
        </view>
      </view>

      <!-- Streaming dots when no content yet -->
      <view v-if="message.status === 'streaming' && !message.content" class="typing-bubble">
        <view class="dot" />
        <view class="dot dot--2" />
        <view class="dot dot--3" />
      </view>

      <!-- Content -->
      <view v-if="message.content" class="bubble bubble--ai">
        <MarkdownContent :content="message.content" />
      </view>

      <!-- Attachments -->
      <view v-if="message.attachments?.length" class="attach-list">
        <view v-for="att in message.attachments" :key="att.url || att.name" class="attach-item">
          <image v-if="att.mimeType?.startsWith('image/')" :src="att.previewUrl || att.url" class="attach-img" mode="aspectFill" @tap="previewImage(message.attachments, att)" />
          <AudioPlayer v-else-if="att.mimeType?.startsWith('audio/')" :src="att.url" />
          <text v-else class="attach-file">📄 {{ att.name }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import MarkdownContent from './MarkdownContent.vue'
import AudioPlayer from './AudioPlayer.vue'

defineProps({
  message: { type: Object, required: true },
})

const thinkingOpen = ref(false)

function previewImage(attachments, current) {
  const urls = attachments
    .filter(a => a.mimeType?.startsWith('image/'))
    .map(a => a.previewUrl || a.url)
  uni.previewImage({ urls, current: current.previewUrl || current.url })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.bubble-row {
  display: flex;
  flex-direction: row;
  margin-bottom: 24rpx;

  &--right {
    justify-content: flex-end;
    flex-direction: column;
    align-items: flex-end;
  }

  &--left {
    justify-content: flex-start;
    align-items: flex-start;
  }
}

.bubble {
  padding: 24rpx 28rpx;

  &--user {
    background-color: $primary-container;
    border-radius: $radius-xl;
    max-width: 80%;
  }

  &--ai {
    background-color: $surface-container-lowest;
    border-radius: $radius-xl;
    max-width: 95%;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
    padding: 24rpx;
  }
}

.bubble-wrap {
  flex: 1;
  max-width: 95%;
}

.bubble-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: $on-surface;
}

.bubble--user .bubble-text {
  color: white;
}

.ai-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 16rpx;
  margin-top: 4rpx;
  overflow: hidden;
}

.ai-icon-img {
  width: 100%;
  height: 100%;
}

/* Thinking block */
.thinking-block {
  border-left: 6rpx solid rgba($primary, 0.4);
  margin-bottom: 16rpx;
  padding-left: 20rpx;
}

.thinking-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 0;
}

.thinking-label {
  font-size: 22rpx;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2rpx;
  color: $primary;
}

.thinking-toggle {
  font-size: 20rpx;
  color: $on-surface-variant;
}

.thinking-body {
  padding: 8rpx 0 12rpx;
}

.thinking-text {
  font-size: 24rpx;
  line-height: 1.6;
  color: $on-surface-variant;
  font-style: italic;
}

/* Streaming dots */
.typing-bubble {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
  background-color: $surface-container-lowest;
  padding: 20rpx 28rpx;
  border-radius: $radius-xl;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  width: fit-content;
}

.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: $outline;
  animation: bounce 1.2s infinite;

  &--2 { animation-delay: 0.2s; }
  &--3 { animation-delay: 0.4s; }
}

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30%            { transform: translateY(-10rpx); }
}

/* Attachments */
.attach-list {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.attach-item {
  border-radius: $radius-lg;
  overflow: hidden;
}

.attach-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: $radius-lg;
}

.attach-file {
  font-size: 24rpx;
  color: $primary;
  background: $primary-container;
  padding: 12rpx 20rpx;
  border-radius: $radius-lg;
}
</style>
