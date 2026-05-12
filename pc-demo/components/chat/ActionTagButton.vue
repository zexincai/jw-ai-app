<template>
  <button
    @click="disabled ? null : handleClick()"
    :disabled="disabled"
    class="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors"
    :class="disabled
      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
      : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 active:bg-blue-200'"
  >
    <ExternalLink :size="12" />
    {{ action.label }}
  </button>
</template>

<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next'
import type { PlatformAction } from '../../stores/chat'
import { useIframeBridge } from '../../composables/useIframeBridge'

const props = defineProps<{ action: PlatformAction; disabled?: boolean }>()
const bridge = useIframeBridge()

function handleClick() {
  bridge.dispatchAction(props.action.payload)
}
</script>
