<template>
  <view v-if="visible" class="tp-overlay" @tap="$emit('close')">
    <view class="tp-box" @tap.stop>
      <text class="tp-title">选择时间</text>

      <view class="tp-picker">
        <view class="tp-col">
          <text class="tp-col-label">时</text>
          <scroll-view scroll-y class="tp-scroll" :scroll-into-view="`h-${selectedHour}`">
            <view
              v-for="h in 24"
              :key="h"
              :id="`h-${h - 1}`"
              class="tp-item"
              :class="{ 'tp-item--active': selectedHour === h - 1 }"
              @tap="selectedHour = h - 1"
            >
              <text>{{ String(h - 1).padStart(2, '0') }}</text>
            </view>
          </scroll-view>
        </view>

        <text class="tp-colon">:</text>

        <view class="tp-col">
          <text class="tp-col-label">分</text>
          <scroll-view scroll-y class="tp-scroll" :scroll-into-view="`m-${selectedMinute}`">
            <view
              v-for="m in 60"
              :key="m"
              :id="`m-${m - 1}`"
              class="tp-item"
              :class="{ 'tp-item--active': selectedMinute === m - 1 }"
              @tap="selectedMinute = m - 1"
            >
              <text>{{ String(m - 1).padStart(2, '0') }}</text>
            </view>
          </scroll-view>
        </view>
      </view>

      <view class="tp-footer">
        <view class="tp-btn tp-btn--cancel" @tap="$emit('close')"><text>取消</text></view>
        <view class="tp-btn tp-btn--confirm" @tap="confirm"><text>确定</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  modelValue: { type: String, default: '00:00' }, // HH:mm
})
const emit = defineEmits(['close', 'confirm'])

const parts = (props.modelValue || '00:00').split(':')
const selectedHour = ref(Math.min(parseInt(parts[0]) || 0, 23))
const selectedMinute = ref(Math.min(parseInt(parts[1]) || 0, 59))

function confirm() {
  const time = `${String(selectedHour.value).padStart(2, '0')}:${String(selectedMinute.value).padStart(2, '0')}`
  emit('confirm', time)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.tp-overlay {
  position: fixed;
  inset: 0;
  z-index: 950;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tp-box {
  width: 520rpx;
  background: $surface;
  border-radius: 32rpx;
  padding: 32rpx 24rpx 24rpx;
}

.tp-title {
  display: block;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  color: $on-surface;
  margin-bottom: 24rpx;
}

.tp-picker {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  height: 360rpx;
}

.tp-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tp-col-label {
  font-size: 24rpx;
  color: $outline;
  margin-bottom: 8rpx;
}

.tp-scroll {
  height: 300rpx;
  width: 120rpx;
}

.tp-item {
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-lg;
  font-size: 32rpx;
  color: $on-surface-variant;

  &--active {
    background: rgba($primary, 0.1);
    color: $primary;
    font-weight: 700;
  }
}

.tp-colon {
  font-size: 40rpx;
  font-weight: 700;
  color: $on-surface;
  margin: 0 20rpx;
  padding-bottom: 40rpx;
}

.tp-footer {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: 20rpx;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid $surface-container-lowest;
}

.tp-btn {
  padding: 16rpx 40rpx;
  border-radius: $radius-lg;
  font-size: 28rpx;

  &--cancel {
    color: $on-surface-variant;
    background: $surface-container-lowest;
  }

  &--confirm {
    color: #fff;
    background: $primary;
    font-weight: 600;
  }
}
</style>
