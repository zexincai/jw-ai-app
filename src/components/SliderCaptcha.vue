<template>
  <view class="slider-captcha" @tap.stop>
    <view class="captcha-header">
      <text class="captcha-title">拖动滑块完成验证</text>
      <text class="captcha-close" @tap="emit('cancel')">✕</text>
    </view>

    <!-- Background image -->
    <view class="img-wrap" ref="imgWrapRef">
      <image :src="bgSrc" class="bg-img" mode="widthFix" @load="onBgLoad" />
      <!-- Slider piece -->
      <image
        :src="pieceSrc"
        class="piece-img"
        :style="pieceStyle"
        mode="scaleToFill"
        @load="onPieceLoad"
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
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  bgImg: { type: String, default: '' },
  pieceImg: { type: String, default: '' },
  oriImageWidth: { type: Number, default: 320 },
  oriImageHeight: { type: Number, default: 0 },
  pieceY: { type: Number, default: 0 },
})

const emit = defineEmits(['success', 'cancel'])

const HANDLE_SIZE = 44    // px — fallback, dynamically overridden

const offsetX = ref(0)
const dragging = ref(false)
const containerWidth = ref(0)
let startX = 0
let trackWidth = 0
let handleSize = HANDLE_SIZE

function toSrc(val) {
  if (!val) return ''
  if (val.startsWith('data:') || val.startsWith('http')) return val
  return `data:image/png;base64,${val}`
}

const bgSrc = computed(() => toSrc(props.bgImg))
const pieceSrc = computed(() => toSrc(props.pieceImg))

// Natural dimensions of the background image
const bgNaturalW = ref(0)
const bgNaturalH = ref(0)

// Natural dimensions of the piece image (px)
const pieceNaturalW = ref(0)
const pieceNaturalH = ref(0)

// Piece rendered size: scale by same ratio as background image
const pieceStyle = computed(() => {
  if (!pieceNaturalW.value || !pieceNaturalH.value || !bgNaturalW.value || !containerWidth.value) {
    return { display: 'none' }
  }
  const scale = containerWidth.value / bgNaturalW.value
  const top = Math.round(props.pieceY * scale)
  return {
    left: offsetX.value + 'px',
    top: top + 'px',
    width: Math.round(pieceNaturalW.value * scale) + 'px',
    height: Math.round(pieceNaturalH.value * scale) + 'px',
  }
})

function onPieceLoad(e) {
  const { width, height } = e.detail
  pieceNaturalW.value = width
  pieceNaturalH.value = height
}

function onBgLoad(e) {
  const { width, height } = e.detail
  bgNaturalW.value = width
  bgNaturalH.value = height
  nextTick(() => {
    const query = uni.createSelectorQuery()
    query.select('.img-wrap').boundingClientRect(rect => {
      if (rect) containerWidth.value = rect.width
    }).exec()
  })
}

function onTouchStart(e) {
  dragging.value = true
  startX = e.touches[0].clientX - offsetX.value
  // Measure track width and handle size
  const query = uni.createSelectorQuery()
  query.select('.img-wrap').boundingClientRect(r1 => {
    if (r1) containerWidth.value = r1.width
  })
  query.select('.track').boundingClientRect(r2 => {
    if (r2) trackWidth = r2.width
  })
  query.select('.handle').boundingClientRect(r3 => {
    if (r3) handleSize = r3.width
  })
  query.exec()
}

function onTouchMove(e) {
  if (!dragging.value) return
  const maxOffset = (trackWidth || 300) - (handleSize || HANDLE_SIZE)
  let x = e.touches[0].clientX - startX
  if (x < 0) x = 0
  if (x > maxOffset) x = maxOffset
  offsetX.value = x
}

function onTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  if (offsetX.value < 10) return

  // Scale the drag distance to backend's image coordinate space
  const scale = (bgNaturalW.value || props.oriImageWidth) / (containerWidth.value || props.oriImageWidth)
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
  border-radius: $radius-lg;
  overflow: hidden;
  background: $surface-container;
  margin-bottom: 24rpx;
}

.bg-img {
  width: 100%;
  display: block;
}

.piece-img {
  position: absolute;
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
