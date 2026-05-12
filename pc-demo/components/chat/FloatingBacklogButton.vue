<template>
  <!-- 悬浮容器，可拖动 -->
  <div
    ref="containerRef"
    class="absolute z-30 select-none"
    style="width: 64px; height: 64px"
    :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
  >
    <!-- 扇形气泡（展开时） -->
    <transition name="fade">
      <div v-if="expanded" class="absolute" style="bottom: 60px; left: 50%; transform: translateX(-50%); width: 1px; height: 1px">
        <!-- 待办事项：左上 -->
        <button
          @click="openPanel(0)"
          class="bubble-btn"
          :style="{ '--tx': '-58px', '--ty': '-44px', backgroundColor: '#4fa3e3' }"
        >
          <span class="relative">
            待办<br/>事项
            <span v-if="roleRelatedTypeTotals[0]" class="badge">{{ roleRelatedTypeTotals[0] }}</span>
          </span>
        </button>

        <!-- 确认消息：正上 -->
        <button
          @click="openPanel(1)"
          class="bubble-btn"
          :style="{ '--tx': '0px', '--ty': '-62px', backgroundColor: '#5cb85c' }"
        >
          <span class="relative">
            确认<br/>消息
            <span v-if="roleRelatedTypeTotals[1]" class="badge">{{ roleRelatedTypeTotals[1] }}</span>
          </span>
        </button>

        <!-- 提醒消息：右上 -->
        <button
          @click="openPanel(2)"
          class="bubble-btn"
          :style="{ '--tx': '58px', '--ty': '-44px', backgroundColor: '#9b59b6' }"
        >
          <span class="relative">
            提醒<br/>消息
            <span v-if="roleRelatedTypeTotals[2]" class="badge">{{ roleRelatedTypeTotals[2] }}</span>
          </span>
        </button>
      </div>
    </transition>

    <!-- 主按钮 + 角标（角标在按钮外避免被 overflow-hidden 裁剪） -->
    <div class="relative w-16 h-16">
      <button
        @mousedown="onMousedown"
        class="w-full h-full flex items-center justify-center overflow-hidden transition-colors duration-200 bg-white border-2 rounded-full shadow-xl"
        :class="[
          isDragging ? 'cursor-grabbing border-blue-300' : 'cursor-grab',
          expanded && !isDragging ? 'border-blue-300 shadow-blue-200' : !isDragging ? 'border-gray-100 hover:border-blue-200' : ''
        ]"
        title="查看消息（可拖动）"
      >
        <img :src="logoUrl" class="object-cover w-full h-full" />
      </button>
      <!-- 总数角标：在 overflow-hidden 的 button 外部 -->
      <span
        v-if="totalCount > 0"
        class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none border-2 border-white pointer-events-none"
      >{{ totalCount > 99 ? '99+' : totalCount }}</span>
    </div>
  </div>

  <!-- 列表面板 -->
  <Teleport to="body">
    <BacklogListPanel
      v-if="selectedType !== null"
      :message-type="selectedType"
      @close="selectedType = null"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import logoUrl from '../../assets/info.png'
import { useBacklog } from '../../composables/useBacklog'
import { useAuth } from '../../composables/useAuth'
import BacklogListPanel from './BacklogListPanel.vue'

const { typeItemsMap, revealedPrivateIds, isVisible } = useBacklog()
const { roles } = useAuth()
const expanded = ref(false)
const selectedType = ref<number | null>(null)
const isDragging = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const STORAGE_KEY = 'backlog_float_pos'
const BTN_SIZE = 64

const pos = ref({ x: 0, y: 0 })

function getParentSize() {
  const parent = containerRef.value?.parentElement
  return parent
    ? { w: parent.clientWidth, h: parent.clientHeight }
    : { w: window.innerWidth, h: window.innerHeight }
}

function clamp(x: number, y: number) {
  const { w, h } = getParentSize()
  return {
    x: Math.max(0, Math.min(w - BTN_SIZE, x)),
    y: Math.max(0, Math.min(h - BTN_SIZE, y)),
  }
}

function initPos() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const p = JSON.parse(saved)
      pos.value = clamp(p.x, p.y)
      if (!p._parentW) {
        const parent = containerRef.value?.parentElement
        const w = parent ? parent.clientWidth : window.innerWidth
        p._parentW = w
        localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
      }
      return
    } catch { /* ignore */ }
  }
  // 默认右下角
  const { w, h } = getParentSize()
  pos.value = { x: w - BTN_SIZE - 16, y: h - BTN_SIZE - 80 }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...pos.value, _parentW: window.innerWidth }))
}

onMounted(() => {
  initPos()
  // 等 template ref 解析后再初始化 ResizeObserver
  const parent = containerRef.value?.parentElement
  if (!parent) return
  const ro = new ResizeObserver(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const p = JSON.parse(saved)
      const prevW = p._parentW
      if (!prevW) return
      const newW = parent.clientWidth
      if (newW === prevW) return
      pos.value = clamp(
        Math.round((pos.value.x / prevW) * newW),
        pos.value.y,
      )
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...p, x: pos.value.x, _parentW: newW }))
    } catch { /* ignore */ }
  })
  ro.observe(parent)
})

const roleIdSet = computed(() => new Set(roles.value.map(role => String(role.userId))))
const roleRelatedTypeTotals = computed<Record<number, number>>(() => {
  void revealedPrivateIds.value // 依赖揭示状态，AI 回复后自动更新
  const totals: Record<number, number> = { 0: 0, 1: 0, 2: 0 }
  ;[0, 1, 2].forEach(type => {
    totals[type] = (typeItemsMap.value[type] ?? []).filter(item =>
      isVisible(item) &&
      roleIdSet.value.has(String(item.fkUserId)),
    ).length
  })
  return totals
})
const totalCount = computed(() =>
  Object.values(roleRelatedTypeTotals.value).reduce((a, b) => a + b, 0)
)

function onMousedown(e: MouseEvent) {
  e.preventDefault()
  const startX = e.clientX
  const startY = e.clientY
  const startPosX = pos.value.x
  const startPosY = pos.value.y
  let moved = false

  function onMousemove(ev: MouseEvent) {
    const dx = ev.clientX - startX
    const dy = ev.clientY - startY
    if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return
    if (!moved) {
      moved = true
      isDragging.value = true
      expanded.value = false
    }
    pos.value = clamp(startPosX + dx, startPosY + dy)
  }

  function onMouseup() {
    window.removeEventListener('mousemove', onMousemove)
    window.removeEventListener('mouseup', onMouseup)
    if (isDragging.value) {
      isDragging.value = false
      const parent = containerRef.value?.parentElement
      const parentW = parent ? parent.clientWidth : window.innerWidth
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...pos.value, _parentW: parentW }))
    } else {
      // 没有拖动，视为点击
      toggle()
    }
  }

  window.addEventListener('mousemove', onMousemove)
  window.addEventListener('mouseup', onMouseup)
}

function toggle() {
  expanded.value = !expanded.value
}

function openPanel(type: number) {
  expanded.value = false
  selectedType.value = type
}
</script>

<style scoped>
.bubble-btn {
  position: absolute;
  width: 56px;
  height: 56px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transform: translate(calc(var(--tx) - 28px), calc(var(--ty) - 28px));
  transition: box-shadow 0.15s ease, filter 0.15s ease;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.6);
}

.bubble-btn:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  filter: brightness(1.08);
}

.badge {
  position: absolute;
  top: -6px;
  right: -12px;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  background: #ef4444;
  color: white;
  font-size: 9px;
  font-weight: 700;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border: 1.5px solid white;
  white-space: nowrap;
}

.fade-enter-active {
  animation: fan-in 0.22s ease forwards;
}
.fade-leave-active {
  animation: fan-in 0.15s ease reverse forwards;
}

@keyframes fan-in {
  from { opacity: 0; transform: translateX(-50%) scale(0.6); }
  to   { opacity: 1; transform: translateX(-50%) scale(1); }
}
</style>
