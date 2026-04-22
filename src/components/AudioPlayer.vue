<template>
  <view class="audio-bubble" @tap="toggle">
    <!-- Play / Pause button -->
    <view class="play-btn">
      <view v-if="!playing" class="icon-play" />
      <view v-else class="icon-pause">
        <view class="pause-bar" />
        <view class="pause-bar" />
      </view>
    </view>

    <!-- Waveform bars -->
    <view class="waveform">
      <view
        v-for="(h, i) in BAR_HEIGHTS"
        :key="i"
        class="bar"
        :class="playing ? 'bar--playing' : ''"
        :style="{ height: h + 'rpx', animationDelay: (i * 0.07) + 's' }"
      />
    </view>

    <!-- Duration -->
    <text class="duration">{{ durationText }}</text>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'

const props = defineProps({
  src:  { type: String, required: true },
})

// Fixed waveform shape — varying heights give a natural look
const BAR_HEIGHTS = [14, 22, 30, 20, 36, 24, 40, 28, 18, 34, 22, 28, 16, 32, 20]

const playing      = ref(false)
const durationText = ref('...')

let ctx = null

function ensureCtx() {
  if (ctx) return
  ctx = uni.createInnerAudioContext()
  ctx.src = props.src
  ctx.onCanplay(() => {
    if (ctx.duration && ctx.duration !== Infinity) {
      durationText.value = fmt(ctx.duration)
    }
  })
  ctx.onTimeUpdate(() => {
    if (ctx.duration && ctx.duration !== Infinity) {
      durationText.value = fmt(ctx.duration - ctx.currentTime)
    }
  })
  ctx.onEnded(() => {
    playing.value = false
    durationText.value = fmt(ctx.duration || 0)
  })
  ctx.onError(() => {
    playing.value = false
    durationText.value = '—'
  })
}

function fmt(s) {
  const t = Math.max(0, Math.round(s))
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

function toggle() {
  ensureCtx()
  if (playing.value) {
    ctx.pause()
    playing.value = false
  } else {
    ctx.play()
    playing.value = true
  }
}

onUnmounted(() => {
  if (ctx) { ctx.stop(); ctx.destroy() }
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.audio-bubble {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  background-color: #fff;
  border-radius: 48rpx;
  padding: 18rpx 28rpx 18rpx 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
  min-width: 280rpx;
  max-width: 480rpx;
}

// ── Play / Pause button ───────────────────────────────

.play-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #5b9bf8, #3b7de8);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4rpx 12rpx rgba(59, 125, 232, 0.35);
}

.icon-play {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 10rpx 0 10rpx 18rpx;
  border-color: transparent transparent transparent #fff;
  margin-left: 4rpx;
}

.icon-pause {
  display: flex;
  flex-direction: row;
  gap: 6rpx;
  align-items: center;
}

.pause-bar {
  width: 6rpx;
  height: 22rpx;
  background: #fff;
  border-radius: 3rpx;
}

// ── Waveform bars ─────────────────────────────────────

.waveform {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 5rpx;
  flex: 1;
}

.bar {
  width: 5rpx;
  border-radius: 3rpx;
  background-color: #a0bcf0;
  transition: height 0.2s ease;

  &--playing {
    background-color: #3b7de8;
    animation: wave 0.8s ease-in-out infinite alternate;
  }
}

@keyframes wave {
  0%   { transform: scaleY(0.4); }
  100% { transform: scaleY(1.2); }
}

// ── Duration ─────────────────────────────────────────

.duration {
  font-size: 22rpx;
  color: #888;
  flex-shrink: 0;
  min-width: 56rpx;
  text-align: right;
}
</style>
