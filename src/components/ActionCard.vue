<template>
  <view class="action-card" @tap="handleTrigger">
    <text class="action-card-icon">+</text>
    <text class="action-card-label">新增{{ displayLabel }}</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modal: { type: String, required: true },
})
const emit = defineEmits(['trigger'])

const LABELS = {
  quality_hazard_report: '质量隐患排查',
  construction_diary: '施工日志',
}

const displayLabel = computed(() => LABELS[props.modal] || props.modal)

function handleTrigger() {
  emit('trigger')
  uni.showToast({ title: `触发操作: ${displayLabel.value}`, icon: 'none', duration: 2000 })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.action-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background-color: #f0fdf4;
  border: 2rpx solid #bbf7d0;
  border-radius: $radius-lg;
  margin-top: 16rpx;
  width: fit-content;
}

.action-card-icon {
  font-size: 28rpx;
  font-weight: 700;
  color: #22c55e;
}

.action-card-label {
  font-size: 24rpx;
  color: #16a34a;
  font-weight: 500;
}
</style>
