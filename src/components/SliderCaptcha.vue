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
import { ref, computed, nextTick, getCurrentInstance } from 'vue'

const props = defineProps({
  bgImg: { type: String, default: '' },
  pieceImg: { type: String, default: '' },
  oriImageWidth: { type: Number, default: 320 },
  oriImageHeight: { type: Number, default: 0 },
  pieceY: { type: Number, default: 0 },
})

const emit = defineEmits(['success', 'cancel'])
const instance = getCurrentInstance()

const HANDLE_SIZE = 44

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

const bgNaturalW = ref(0)
const bgNaturalH = ref(0)

const pieceNaturalW = ref(0)
const pieceNaturalH = ref(0)

// Piece rendered size
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

/** 小程序兼容：用组件实例限定选择器作用域 */
function _in(selector) {
  // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO
  return uni.createSelectorQuery().in(instance)
  // #endif
  // #ifndef MP-WEIXIN && !MP-ALIPAY && !MP-BAIDU && !MP-TOUTIAO
  return uni.createSelectorQuery()
  // #endif
}

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
    _in().select('.img-wrap').boundingClientRect(rect => {
      if (rect) containerWidth.value = rect.width
    }).exec()
  })
}

function onTouchStart(e) {
  dragging.value = true
  startX = e.touches[0].clientX - offsetX.value
  const query = _in()
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
  const maxOffset = (trackWidth || containerWidth.value || 300) - (handleSize || HANDLE_SIZE)
  let x = e.touches[0].clientX - startX
  if (x < 0) x = 0
  if (x > maxOffset) x = maxOffset
  offsetX.value = x
}

function onTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  if (offsetX.value < 10) return

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
  box-sizing: border-box;
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
  background: $surface-container-high;
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
