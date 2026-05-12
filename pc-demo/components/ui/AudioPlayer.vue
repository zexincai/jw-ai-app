<template>
  <div class="flex items-center gap-2 px-3 py-2 bg-blue-100/50 rounded-xl rounded-tr-sm border border-blue-50 text-blue-700 cursor-pointer hover:bg-blue-100 transition-colors shadow-sm select-none" @click="togglePlay" :style="{ minWidth: '100px', width: playerWidth }">
    <div class="shrink-0 flex items-center justify-center p-1.5 bg-blue-500 text-white rounded-full">
      <Play v-if="!isPlaying" :size="12" fill="currentColor" />
      <Square v-else :size="12" fill="currentColor" />
    </div>
    <div class="flex-1 flex gap-[3px] items-end h-3 overflow-hidden px-1 opacity-70">
      <span v-for="i in 12" :key="i" class="w-1 bg-blue-500 rounded-full transition-all duration-75" :style="{ height: getBarHeight(i) }"></span>
    </div>
    <!-- <span class="text-xs font-semibold">{{ formattedDuration }}</span> -->
    <audio ref="audioRef" :src="src" @ended="onEnded" @timeupdate="onTimeUpdate" @loadedmetadata="onLoadedMetadata" class="hidden"></audio>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { Play, Square } from 'lucide-vue-next'

defineProps<{ src: string }>()

const audioRef = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const duration = ref(0)
const currentTime = ref(0)

const togglePlay = () => {
  if (!audioRef.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
    isPlaying.value = false
  } else {
    audioRef.value.play()
    // 防止多个音频同时播放
    document.querySelectorAll('audio').forEach(el => {
      if (el !== audioRef.value && !el.paused) {
        el.pause()
      }
    })
    isPlaying.value = true
  }
}

const onEnded = () => {
  isPlaying.value = false
  currentTime.value = 0
  if (audioRef.value) {
    audioRef.value.currentTime = 0
  }
}

const onTimeUpdate = () => {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime
  }
}

const onLoadedMetadata = () => {
  if (audioRef.value) {
    duration.value = audioRef.value.duration === Infinity ? 0 : audioRef.value.duration
  }
}

// 解决部分录音格式持续时间 Infinity 的痛点（若后端/浏览器无法推算）
// 如果需要可以展示预估秒数，这里暂时先动态计算宽度。
const playerWidth = computed(() => {
  const d = duration.value || 5 // 默认一个基础宽度
  const width = Math.min(Math.max(120 + d * 4, 120), 220)
  return `${width}px`
})

const getBarHeight = (index: number) => {
  if (!isPlaying.value) {
    // 静态波形，通过 index 生成一定的参差感
    const staticVal = (index % 3 + 1) * 25
    return `${staticVal}%`
  }
  // 动态波形
  const time = currentTime.value * 8
  const val = Math.sin(time + index) * 0.5 + 0.5
  return `${20 + val * 80}%`
}

onBeforeUnmount(() => {
  if (audioRef.value) {
    audioRef.value.pause()
  }
})
</script>
