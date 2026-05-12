<template>
  <div class="slider-captcha-overlay" v-if="visible" @click.self="$emit('close')">
    <div class="slider-captcha-card">
      <div class="slider-header">
        <span class="text-sm font-medium">请完成安全验证</span>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>

      <div class="slider-body" v-if="captchaData">
        <div class="captcha-container" :style="{ width: containerWidth + 'px', height: containerHeight + 'px' }">
          <!-- 背景图 -->
          <img :src="captchaData.img" class="bg-img" />
          <!-- 滑块碎片 -->
          <img
            :src="captchaData.smallImage"
            class="slider-piece"
            :style="{
              left: sliderX + 'px',
              top: (captchaData.yHeight / scale) + 'px',
              width: (captchaData.slidingWidth / scale) + 'px',
              height: (captchaData.slidingHeight / scale) + 'px'
            }"
          />
        </div>

        <div class="slider-track-container" ref="trackRef">
          <div class="slider-track-bg">向右滑动完成验证</div>
          <div class="slider-track-progress" :style="{ width: sliderX + 'px' }"></div>
          <div
            class="slider-handle"
            :class="{ active: dragging }"
            :style="{ left: sliderX + 'px' }"
            @mousedown="startDrag"
            @touchstart="startDrag"
          >
            <div class="handle-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div class="slider-footer" v-if="captchaData">
        <button @click="refresh" class="refresh-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          刷新验证码
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  captchaData: any // From getCaptchaApi
}>()

const emit = defineEmits(['close', 'success', 'refresh'])

// Original image dimensions from API
const ORI_WIDTH = 320

// UI display dimensions (scaled up)
const containerWidth = 380
const containerHeight = 190

// Scale factor for coordinates (API / UI)
const scale = ORI_WIDTH / containerWidth

const sliderX = ref(0)
const dragging = ref(false)
const startX = ref(0)
const trackRef = ref<HTMLElement | null>(null)

function startDrag(e: MouseEvent | TouchEvent) {
  if (dragging.value) return
  dragging.value = true
  startX.value = 'touches' in e ? e.touches[0].clientX : e.clientX
  
  window.addEventListener('mousemove', handleMove)
  window.addEventListener('touchmove', handleMove)
  window.addEventListener('mouseup', endDrag)
  window.addEventListener('touchend', endDrag)
}

function handleMove(e: MouseEvent | TouchEvent) {
  if (!dragging.value) return
  const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX
  let deltaX = currentX - startX.value
  
  // Constrain sliderX based on UI width and UI piece width
  const uiPieceWidth = (props.captchaData?.slidingWidth || 40) / scale
  const maxMove = containerWidth - uiPieceWidth
  if (deltaX < 0) deltaX = 0
  if (deltaX > maxMove) deltaX = maxMove
  
  sliderX.value = deltaX
}

function endDrag() {
  if (!dragging.value) return
  dragging.value = false
  
  window.removeEventListener('mousemove', handleMove)
  window.removeEventListener('touchmove', handleMove)
  window.removeEventListener('mouseup', endDrag)
  window.removeEventListener('touchend', endDrag)

  // Send result scaled back to original image coordinates
  emit('success', Math.round(sliderX.value * scale))
}

function refresh() {
  sliderX.value = 0
  emit('refresh')
}

function reset() {
  sliderX.value = 0
}

watch(() => props.visible, (val) => {
  if (val) reset()
})

defineExpose({ reset })
</script>

<style scoped>
.slider-captcha-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slider-captcha-card {
  background: white;
  width: 420px;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  color: #374151;
}

.close-btn {
  font-size: 24px;
  line-height: 1;
  color: #9ca3af;
  cursor: pointer;
  border: none;
  background: none;
}

.close-btn:hover {
  color: #374151;
}

.captcha-container {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  background: #f3f4f6;
}

.bg-img {
  width: 100%;
  height: 100%;
  display: block;
}

.slider-piece {
  position: absolute;
  z-index: 10;
  filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));
  /* Ensure original image scale is handled */
  object-fit: contain;
}

.slider-track-container {
  position: relative;
  height: 40px;
  background: #f3f4f6;
  border-radius: 20px;
  margin-top: 20px;
  overflow: hidden;
}

.slider-track-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #9ca3af;
  pointer-events: none;
}

.slider-track-progress {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: rgba(185, 28, 28, 0.1);
  border-radius: 20px 0 0 20px;
}

.slider-handle {
  position: absolute;
  top: 0;
  width: 40px;
  height: 40px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border: 1px solid #ccc;
  border-radius: 50%;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  transition: box-shadow 0.2s;
}

.slider-handle.active {
  cursor: grabbing;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  background: #b91c1c;
}

.slider-handle.active stroke {
  color: white;
}

.handle-icon {
  width: 20px;
  height: 20px;
  color: #4b5563;
}

.slider-handle.active .handle-icon {
  color: white;
}

.slider-footer {
  margin-top: 16px;
  border-top: 1px solid #f3f4f6;
  padding-top: 12px;
}

.refresh-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
}

.refresh-link:hover {
  color: #374151;
}
</style>
