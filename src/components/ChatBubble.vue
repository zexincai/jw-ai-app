<template>
  <!-- User bubble -->
  <view v-if="message.type === 'user'" class="bubble-row bubble-row--right">
    <view class="bubble bubble--user">
      <text class="bubble-text">{{ message.text }}</text>
    </view>
  </view>

  <!-- Reasoning bubble -->
  <view v-else-if="message.type === 'reasoning'" class="bubble-row bubble-row--left">
    <view class="bubble bubble--reasoning">
      <text class="reasoning-label">推理引擎</text>
      <text class="bubble-text reasoning-text">{{ message.text }}</text>
    </view>
  </view>

  <!-- AI bubble -->
  <view v-else-if="message.type === 'ai'" class="bubble-row bubble-row--left">
    <view class="ai-icon">
      <text class="ai-icon-text">AI</text>
    </view>
    <view class="bubble bubble--ai">
      <text class="bubble-text">{{ message.text }}</text>
      <MaterialTable v-if="message.table" :rows="message.table.rows" />
    </view>
  </view>
</template>

<script setup>
import MaterialTable from './MaterialTable.vue'

defineProps({
  message: {
    type: Object,
    required: true,
  },
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.bubble-row {
  display: flex;
  flex-direction: row;
  margin-bottom: 24rpx;
  &--right { justify-content: flex-end; }
  &--left  { justify-content: flex-start; align-items: flex-start; }
}

.bubble {
  padding: 24rpx 28rpx;

  &--user {
    background-color: $primary-container;
    border-radius: $radius-xl;
    max-width: 80%;
  }

  &--reasoning {
    background-color: transparent;
    border-left: 6rpx solid rgba($primary, 0.4);
    padding-left: 24rpx;
    padding-right: 0;
    max-width: 100%;
  }

  &--ai {
    background-color: $surface-container-lowest;
    border-radius: $radius-xl;
    max-width: 95%;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
    padding: 24rpx;
  }
}

.bubble-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: $on-surface;
}

.bubble--user .bubble-text {
  color: $on-primary-container;
}

.reasoning-label {
  display: block;
  font-size: 20rpx;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2rpx;
  color: $primary;
  margin-bottom: 8rpx;
}

.reasoning-text {
  font-style: italic;
  color: $on-surface-variant;
}

.ai-icon {
  width: 56rpx;
  height: 56rpx;
  background-color: $primary;
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 16rpx;
  margin-top: 4rpx;
}

.ai-icon-text {
  color: $on-primary;
  font-size: 20rpx;
  font-weight: 700;
}
</style>
