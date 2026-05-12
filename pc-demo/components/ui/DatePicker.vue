<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
}>(), { placeholder: '请选择日期' })

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const popupStyle = ref<Record<string, string>>({})

const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

watch(open, async (val) => {
  if (!val) return
  if (props.modelValue) {
    const d = new Date(props.modelValue + 'T00:00:00')
    if (!isNaN(d.getTime())) {
      viewYear.value = d.getFullYear()
      viewMonth.value = d.getMonth()
    }
  }
  await nextTick()
  const rect = containerRef.value?.getBoundingClientRect()
  if (rect) {
    const top = rect.bottom + 4
    const left = Math.min(rect.left, window.innerWidth - 240)
    popupStyle.value = { top: top + 'px', left: left + 'px' }
  }
})

function prevMonth() {
  if (viewMonth.value === 0) { viewYear.value--; viewMonth.value = 11 }
  else viewMonth.value--
}
function nextMonth() {
  if (viewMonth.value === 11) { viewYear.value++; viewMonth.value = 0 }
  else viewMonth.value++
}

const calendarCells = computed(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const firstWeekday = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const todayStr = new Date().toISOString().slice(0, 10)

  const cells: Array<{ day: number | ''; dateStr: string; valid: boolean; isToday: boolean; isSelected: boolean }> = []

  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ day: '', dateStr: '', valid: false, isToday: false, isSelected: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr, valid: true, isToday: dateStr === todayStr, isSelected: dateStr === props.modelValue })
  }
  return cells
})

function select(dateStr: string) {
  emit('update:modelValue', dateStr)
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
      <Calendar :size="12" class="text-gray-400 shrink-0" />
      <span :class="modelValue ? 'text-gray-700' : 'text-gray-400'">{{ modelValue || placeholder }}</span>
    </div>

    <Teleport to="body">
      <template v-if="open">
        <div class="fixed inset-0 z-[200]" @click="open = false" />
        <div class="fixed z-[201] bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-56" :style="popupStyle">
          <!-- 月份导航 -->
          <div class="flex items-center justify-between mb-2">
            <button @click.stop="prevMonth" class="p-1 rounded hover:bg-gray-100 text-gray-500">
              <ChevronLeft :size="13" />
            </button>
            <span class="text-xs font-medium text-gray-700">{{ viewYear }}年{{ viewMonth + 1 }}月</span>
            <button @click.stop="nextMonth" class="p-1 rounded hover:bg-gray-100 text-gray-500">
              <ChevronRight :size="13" />
            </button>
          </div>
          <!-- 星期头 -->
          <div class="grid grid-cols-7 mb-1">
            <span v-for="w in ['日','一','二','三','四','五','六']" :key="w"
              class="text-center text-[10px] text-gray-400 pb-1">{{ w }}</span>
          </div>
          <!-- 日期格子 -->
          <div class="grid grid-cols-7 gap-y-0.5">
            <div v-for="(cell, i) in calendarCells" :key="i" class="flex justify-center">
              <button
                v-if="cell.valid"
                @click.stop="select(cell.dateStr)"
                :class="['w-7 h-7 rounded-full text-[11px] transition-colors',
                  cell.isSelected ? 'bg-blue-500 text-white' :
                  cell.isToday   ? 'border border-blue-400 text-blue-600 hover:bg-blue-50' :
                                   'text-gray-700 hover:bg-gray-100']"
              >{{ cell.day }}</button>
            </div>
          </div>
        </div>
      </template>
    </Teleport>
  </div>
</template>
