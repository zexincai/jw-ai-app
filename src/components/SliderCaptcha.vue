<template>
  <view class="slider-captcha" @tap.stop>
    <view class="captcha-header">
      <text class="captcha-title">拖动滑块完成验证</text>
      <text class="captcha-close" @tap="emit('cancel')">✕</text>
    </view>

    <!-- Background image -->
    <view class="img-wrap" ref="imgWrapRef">
      <image :src="bgSrc" class="bg-img" mode="aspectFill" @load="onBgLoad" />
      <!-- Slider piece -->
      <image
        :src="pieceSrc"
        class="piece-img"
        :style="{ left: offsetX + 'px' }"
        mode="aspectFit"
      />
    </view>

    <!-- Slider track -->
    <view class="track-wrap">
      <view class="track">
        <text class="track-hint" :style="{ opacity: dragging || offsetX > 0 ? 0 : 1 }">向右拖动滑块</text>
        <view
          class="handle"
          :style="{ left: offsetX + 'px' }"
          @touchstart.prevent="onTouchStart"
          @touchmove.prevent="onTouchMove"
          @touchend.prevent="onTouchEnd"
        >
          <text class="handle-arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  bgImg: { type: String, default: '' },
  pieceImg: { type: String, default: '' },
  oriImageWidth: { type: Number, default: 320 },
})

const emit = defineEmits(['success', 'cancel'])

const HANDLE_SIZE = 44    // px

const offsetX = ref(0)
const dragging = ref(false)
let startX = 0
let containerWidth = 0

// Convert base64 or URL to src
const bgSrc = computed(() => props.bgImg ? `data:image/png;base64,${props.bgImg}` : '')
const pieceSrc = computed(() => props.pieceImg ? `data:image/png;base64,${props.pieceImg}` : '')

function onBgLoad(e) {
  // Get actual rendered container width for scaling
  const query = uni.createSelectorQuery()
  query.select('.img-wrap').boundingClientRect(rect => {
    if (rect) containerWidth = rect.width
  }).exec()
}

function onTouchStart(e) {
  dragging.value = true
  startX = e.touches[0].clientX - offsetX.value
  // Measure container width
  const query = uni.createSelectorQuery()
  query.select('.img-wrap').boundingClientRect(rect => {
    if (rect) containerWidth = rect.width
  }).exec()
}

function onTouchMove(e) {
  if (!dragging.value) return
  const query = uni.createSelectorQuery()
  query.select('.track').boundingClientRect(rect => {
    if (!rect) return
    const maxOffset = rect.width - HANDLE_SIZE
    let x = e.touches[0].clientX - startX
    if (x < 0) x = 0
    if (x > maxOffset) x = maxOffset
    offsetX.value = x
  }).exec()
}

function onTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  if (offsetX.value < 10) return

  // Scale the drag distance to backend's image coordinate space
  const scale = props.oriImageWidth / (containerWidth || props.oriImageWidth)
  const scaledDistance = Math.round(offsetX.value * scale)
  emit('success', scaledDistance)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.slider-captcha {
  background: $surface;
  border-radius: $radius-xl;
  padding: 32rpx;
  width: 100%;
}

.captcha-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.captcha-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $on-surface;
}

.captcha-close {
  font-size: 32rpx;
  color: $on-surface-variant;
  padding: 8rpx 16rpx;
}

.img-wrap {
  position: relative;
  width: 100%;
  height: 200rpx;
  border-radius: $radius-lg;
  overflow: hidden;
  background: $surface-container;
  margin-bottom: 24rpx;
}

.bg-img {
  width: 100%;
  height: 100%;
}

.piece-img {
  position: absolute;
  top: 0;
  height: 100%;
  width: 60rpx;
}

.track-wrap {
  padding: 0 4rpx;
}

.track {
  position: relative;
  height: 72rpx;
  background: $surface-container-low;
  border-radius: 36rpx;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.track-hint {
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 24rpx;
  color: $on-surface-variant;
  pointer-events: none;
}

.handle {
  position: absolute;
  top: 4rpx;
  width: 64rpx;
  height: 64rpx;
  background: $primary;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba($primary, 0.4);
}

.handle-arrow {
  color: $on-primary;
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1;
}
</style>
