<template>
  <Transition name="fade">
    <div v-if="visible" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
      <div class="bg-white/95 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-5 border border-white/50 transform scale-100 animate-in fade-in zoom-in duration-300">
        <div class="relative w-12 h-12">
          <!-- Outer Ring -->
          <div class="absolute inset-0 border-4 border-red-50/50 rounded-full"></div>
          <!-- Spinning Ring -->
          <div class="absolute inset-0 border-4 border-red-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <div class="flex flex-col items-center gap-1.5">
          <span class="text-xs font-mono font-bold text-red-600 tracking-[0.2em] uppercase">{{ message || 'Processing' }}</span>
          <div class="flex gap-1 justify-center">
            <div class="w-1 h-1 bg-red-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div class="w-1 h-1 bg-red-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div class="w-1 h-1 bg-red-400 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  message?: string
}>()
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
.animate-bounce {
  animation: bounce 0.6s infinite ease-in-out;
}
</style>
