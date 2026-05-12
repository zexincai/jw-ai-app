<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Clock } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
}>(), { placeholder: '请选择时间' })

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const hourListRef = ref<HTMLElement | null>(null)
const minListRef = ref<HTMLElement | null>(null)
const popupStyle = ref<Record<string, string>>({})

const selHour = ref(8)
const selMin = ref(0)

function pad(n: number) { return String(n).padStart(2, '0') }

watch(open, async (val) => {
  if (!val) return
  if (props.modelValue) {
    const [h, m] = props.modelValue.split(':').map(Number)
    selHour.value = isNaN(h) ? 8 : h
    selMin.value = isNaN(m) ? 0 : m
  }
  await nextTick()
  const rect = containerRef.value?.getBoundingClientRect()
  if (rect) {
    popupStyle.value = { top: rect.bottom + 4 + 'px', left: rect.left + 'px' }
  }
  await nextTick()
  scrollToSelected()
})

function scrollToSelected() {
  const ITEM_H = 32
  if (hourListRef.value) hourListRef.value.scrollTop = selHour.value * ITEM_H - 64
  if (minListRef.value) minListRef.value.scrollTop = selMin.value * ITEM_H - 64
}

function pickHour(h: number) {
  selHour.value = h
  emit('update:modelValue', `${pad(h)}:${pad(selMin.value)}`)
}
function pickMin(m: number) {
  selMin.value = m
  emit('update:modelValue', `${pad(selHour.value)}:${pad(m)}`)
}
function confirm() {
  emit('update:modelValue', `${pad(selHour.value)}:${pad(selMin.value)}`)
  open.value = false
}
</script>

<template>
  <div class="relative shrink-0" ref="containerRef">
    <div
      @click="open = !open"
      :class="['flex items-center gap-1.5 px-2 py-1 border rounded text-xs cursor-pointer select-none transition-colors',
        open ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200 hover:border-blue-400']"
    >
      <Clock :size="12" class="text-gray-400 shrink-0" />
      <span :class="modelValue ? 'text-gray-700' : 'text-gray-400'">{{ modelValue || placeholder }}</span>
    </div>

    <Teleport to="body">
      <template v-if="open">
        <div class="fixed inset-0 z-[200]" @click="confirm" />
        <div class="fixed z-[201] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden" :style="popupStyle">
          <div class="flex" style="height:176px">
            <!-- 小时列 -->
            <div ref="hourListRef" class="w-16 overflow-y-auto py-2 border-r border-gray-100 no-scrollbar">
              <div
                v-for="h in 24" :key="h - 1"
                @click.stop="pickHour(h - 1)"
                :class="['h-8 flex items-center justify-center mx-1.5 rounded text-xs cursor-pointer transition-colors',
                  selHour === h - 1 ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100']"
              >{{ pad(h - 1) }}</div>
            </div>
            <!-- 分钟列 -->
            <div ref="minListRef" class="w-16 overflow-y-auto py-2 no-scrollbar">
              <div
                v-for="m in 60" :key="m - 1"
                @click.stop="pickMin(m - 1)"
                :class="['h-8 flex items-center justify-center mx-1.5 rounded text-xs cursor-pointer transition-colors',
                  selMin === m - 1 ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100']"
              >{{ pad(m - 1) }}</div>
            </div>
          </div>
          <!-- 底部确认 -->
          <div class="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50">
            <span class="text-xs font-medium text-gray-700">{{ pad(selHour) }} : {{ pad(selMin) }}</span>
            <button @click.stop="confirm" class="text-xs px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors">确定</button>
          </div>
        </div>
      </template>
    </Teleport>
  </div>
</template>

<style>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
