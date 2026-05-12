<template>
  <div class="mb-2">
    <!-- 思考中：自动展开，显示动画标题 -->
    <template v-if="streaming">
      <div class="flex items-center gap-1.5 text-xs text-violet-400 mb-1.5">
        <span class="flex gap-0.5">
          <span class="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style="animation-delay:0ms" />
          <span class="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style="animation-delay:150ms" />
          <span class="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style="animation-delay:300ms" />
        </span>
        思考中
      </div>
      <div
        v-if="content.trim()"
        class="pl-3 border-l-2 border-violet-200 text-xs text-gray-400 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto"
      >{{ content }}</div>
    </template>

    <!-- 已完成：可折叠 -->
    <template v-else>
      <button
        @click="open = !open"
        class="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ChevronDown
          :size="12"
          :class="{ 'rotate-180': open }"
          class="transition-transform duration-150"
        />
        已完成思考
      </button>
      <div
        v-if="open"
        class="mt-1.5 pl-3 border-l-2 border-gray-200 text-xs text-gray-500 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto"
      >{{ content }}</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps<{ content: string; streaming?: boolean }>()
const open = ref(false)

// 流式结束后自动保持折叠（用户可手动展开）
watch(() => props.streaming, (val, old) => {
  if (old && !val) open.value = false
})
</script>
