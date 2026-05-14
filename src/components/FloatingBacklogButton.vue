<template>
  <view
    class="fbb-container"
    :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
    @touchstart.prevent="onDragStart"
    @touchmove.prevent="onDragMove"
    @touchend.prevent="onDragEnd"
  >
    <!-- 扇形气泡 — 向左展开 -->
    <view v-if="expanded" class="fbb-fan">
      <!-- 待办事项 -->
      <view
        class="fbb-bubble fbb-bubble--todo"
        @tap.stop="openPanel(0)"
      >
        <text class="fbb-bubble-text">待办\n事项</text>
        <text v-if="roleTypeTotals[0]" class="fbb-bubble-badge">{{ roleTypeTotals[0] }}</text>
      </view>
      <!-- 确认消息 -->
      <view
        class="fbb-bubble fbb-bubble--confirm"
        @tap.stop="openPanel(1)"
      >
        <text class="fbb-bubble-text">确认\n消息</text>
        <text v-if="roleTypeTotals[1]" class="fbb-bubble-badge">{{ roleTypeTotals[1] }}</text>
      </view>
      <!-- 提醒消息 -->
      <view
        class="fbb-bubble fbb-bubble--remind"
        @tap.stop="openPanel(2)"
      >
        <text class="fbb-bubble-text">提醒\n消息</text>
        <text v-if="roleTypeTotals[2]" class="fbb-bubble-badge">{{ roleTypeTotals[2] }}</text>
      </view>
    </view>

    <!-- 主按钮 -->
    <view class="fbb-main-wrap">
      <view
        class="fbb-main"
        :class="{ 'fbb-main--expanded': expanded }"
      >
        <image src="/static/logo.png" class="fbb-main-img" mode="aspectFill" />
      </view>
      <text v-if="totalCount > 0" class="fbb-total-badge">
        {{ totalCount > 99 ? '99+' : totalCount }}
      </text>
    </view>

    <!-- 遮罩（展开时） -->
    <view v-if="expanded" class="fbb-overlay" @tap.stop="onOverlayTap" />
  </view>

  <!-- 列表面板 -->
  <BacklogPanel
    v-if="selectedType !== null"
    :message-type="selectedType"
    @close="selectedType = null"
  />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBacklog } from '@/composables/useBacklog.js'
import { useAuth } from '@/composables/useAuth.js'
import BacklogPanel from './BacklogPanel.vue'

const { typeItemsMap, revealedPrivateIds, isVisible } = useBacklog()
const { roles } = useAuth()

const expanded = ref(false)
const selectedType = ref(null)
const pos = ref({ x: 0, y: 0 })

const BTN_SIZE = 56
const EDGE_MARGIN = 8
const TAP_THRESHOLD = 6
let screenW = 0
let screenH = 0
let dragStartX = 0
let dragStartY = 0
let dragOffsetX = 0
let dragOffsetY = 0
let moved = false

onMounted(() => {
  const sys = uni.getSystemInfoSync()
  screenW = sys.windowWidth
  screenH = sys.windowHeight
  pos.value = {
    x: screenW - BTN_SIZE - 16,
    y: screenH - BTN_SIZE - 120,
  }
})

function onDragStart(e) {
  const touch = e.touches[0]
  dragStartX = touch.clientX
  dragStartY = touch.clientY
  dragOffsetX = touch.clientX - pos.value.x
  dragOffsetY = touch.clientY - pos.value.y
  moved = false
}

function onDragMove(e) {
  if (expanded.value) return
  const touch = e.touches[0]
  if (!moved) {
    const dx = touch.clientX - dragStartX
    const dy = touch.clientY - dragStartY
    if (Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD) return
    moved = true
  }
  let x = touch.clientX - dragOffsetX
  let y = touch.clientY - dragOffsetY
  x = Math.max(EDGE_MARGIN, Math.min(screenW - BTN_SIZE - EDGE_MARGIN, x))
  y = Math.max(EDGE_MARGIN, Math.min(screenH - BTN_SIZE - EDGE_MARGIN, y))
  pos.value = { x, y }
}

function onDragEnd(e) {
  if (moved) return
  const touch = e.changedTouches[0]
  const inMain = touch.clientX >= pos.value.x
    && touch.clientX <= pos.value.x + BTN_SIZE
    && touch.clientY >= pos.value.y
    && touch.clientY <= pos.value.y + BTN_SIZE
  if (inMain) {
    expanded.value = !expanded.value
  }
}

function onOverlayTap() {
  expanded.value = false
}

const roleIdSet = computed(() => new Set(roles.value.map(role => String(role.userId))))
const roleTypeTotals = computed(() => {
  void revealedPrivateIds.value
  const totals = { 0: 0, 1: 0, 2: 0 }
  ;[0, 1, 2].forEach(type => {
    totals[type] = (typeItemsMap.value[type] ?? []).filter(item =>
      isVisible(item) && roleIdSet.value.has(String(item.fkUserId)),
    ).length
  })
  return totals
})
const totalCount = computed(() =>
  Object.values(roleTypeTotals.value).reduce((a, b) => a + b, 0)
)

function openPanel(type) {
  expanded.value = false
  selectedType.value = type
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.fbb-container {
  position: fixed;
  z-index: 600;
  width: 56px;
  height: 56px;
}

.fbb-overlay {
  position: fixed;
  inset: 0;
  z-index: 599;
}

.fbb-fan {
  position: absolute;
  top: 50%;
  right: 60px;
  transform: translateY(-50%);
  width: 1px;
  height: 1px;
}

.fbb-bubble {
  position: absolute;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.fbb-bubble--todo {
  background-color: #4fa3e3;
  transform: translate(-52px, -56px);
}

.fbb-bubble--confirm {
  background-color: #5cb85c;
  transform: translate(-68px, -2px);
}

.fbb-bubble--remind {
  background-color: #9b59b6;
  transform: translate(-52px, 52px);
}

.fbb-bubble-text {
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
}

.fbb-bubble-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  background: #ef4444;
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  border-radius: 9999px;
  line-height: 14px;
  text-align: center;
  border: 1.5px solid #fff;
  white-space: nowrap;
}

.fbb-main-wrap {
  position: relative;
  z-index: 601;
  width: 56px;
  height: 56px;
}

.fbb-main {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid $outline-variant;
  background-color: $surface;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  transition: box-shadow 0.2s;

  &--expanded {
    border-color: $primary;
    box-shadow: 0 4px 16px rgba($primary, 0.25);
  }
}

.fbb-main-img {
  width: 100%;
  height: 100%;
}

.fbb-total-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 9999px;
  line-height: 18px;
  text-align: center;
  border: 2px solid #fff;
  pointer-events: none;
}
</style>
