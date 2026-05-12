<template>
  <Teleport to="body">
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium pointer-events-auto max-w-sm"
          :class="{
            'bg-red-50 border border-red-200 text-red-700': t.type === 'error',
            'bg-yellow-50 border border-yellow-200 text-yellow-700': t.type === 'warning',
            'bg-green-50 border border-green-200 text-green-700': t.type === 'success',
          }"
        >
          <AlertCircle v-if="t.type === 'error'" :size="16" class="shrink-0" />
          <AlertTriangle v-else-if="t.type === 'warning'" :size="16" class="shrink-0" />
          <CheckCircle v-else :size="16" class="shrink-0" />
          <span>{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-vue-next'
import { useToasts } from '../../utils/toast'

const toasts = useToasts()
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
