<template>
  <view
    class="action-btn"
    :class="{ 'action-btn--disabled': disabled }"
    @tap="!disabled && handleClick()"
  >
    <text class="action-btn-label">{{ action.label || '操作' }}</text>
  </view>
</template>

<script setup>
defineProps({
  action: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
})

function handleClick() {
  uni.showToast({ title: '操作已触发', icon: 'none', duration: 2000 })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.action-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 16rpx 24rpx;
  background-color: rgba($primary, 0.06);
  border: 2rpx solid rgba($primary, 0.2);
  border-radius: $radius-lg;
  margin-top: 12rpx;
  width: fit-content;

  &--disabled {
    background-color: $surface-container-lowest;
    border-color: $outline-variant;
    .action-btn-label { color: $outline; }
  }
}

.action-btn-label {
  font-size: 24rpx;
  color: $primary;
  font-weight: 500;
}
</style>
