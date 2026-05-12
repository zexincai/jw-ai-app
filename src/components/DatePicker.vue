<template>
  <view v-if="visible" class="dp-overlay" @tap="$emit('close')">
    <view class="dp-box" @tap.stop>
      <!-- 头部 -->
      <view class="dp-header">
        <view class="dp-nav-btn" @tap="prevMonth"><text class="dp-nav-arrow">‹</text></view>
        <text class="dp-month-year">{{ year }}年{{ String(month + 1).padStart(2, '0') }}月</text>
        <view class="dp-nav-btn" @tap="nextMonth"><text class="dp-nav-arrow">›</text></view>
      </view>

      <!-- 星期 -->
      <view class="dp-weekdays">
        <text v-for="d in weekDays" :key="d" class="dp-weekday">{{ d }}</text>
      </view>

      <!-- 日期网格 -->
      <view class="dp-grid">
        <view
          v-for="(cell, idx) in cells"
          :key="idx"
          class="dp-cell"
          :class="{
            'dp-cell--other': !cell.isCurrentMonth,
            'dp-cell--today': cell.isToday,
            'dp-cell--selected': cell.isSelected,
          }"
          @tap="cell.isCurrentMonth && selectDate(cell.day)"
        >
          <text class="dp-cell-text">{{ cell.text }}</text>
        </view>
      </view>

      <!-- 底部 -->
      <view class="dp-footer">
        <view class="dp-btn dp-btn--cancel" @tap="$emit('close')"><text>取消</text></view>
        <view class="dp-btn dp-btn--confirm" @tap="confirm"><text>确定</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  modelValue: { type: String, default: '' }, // yyyy-MM-dd
})
const emit = defineEmits(['close', 'confirm'])

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth())
const selectedDate = ref(props.modelValue || '')

// 初始解析
if (props.modelValue) {
  const parts = props.modelValue.split('-')
  if (parts.length === 3) {
    year.value = parseInt(parts[0])
    month.value = parseInt(parts[1]) - 1
    selectedDate.value = props.modelValue
  }
}

const today = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const cells = computed(() => {
  const firstDay = new Date(year.value, month.value, 1)
  const startDayOfWeek = firstDay.getDay() || 7 // 周一=1 ... 周日=7
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate()
  const daysInPrevMonth = new Date(year.value, month.value, 0).getDate()

  const result = []

  // 上月填充
  for (let i = startDayOfWeek - 2; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const dateStr = `${year.value}-${String(month.value || 12).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    result.push({ text: String(day), day: dateStr, isCurrentMonth: false, isToday: false, isSelected: false })
  }

  // 当月
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year.value}-${String(month.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    result.push({
      text: String(d),
      day: dateStr,
      isCurrentMonth: true,
      isToday: dateStr === today.value,
      isSelected: dateStr === selectedDate.value,
    })
  }

  // 下月填充
  const remaining = 42 - result.length
  for (let d = 1; d <= remaining; d++) {
    const dateStr = `${year.value}-${String(month.value + 2 > 12 ? 1 : month.value + 2).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    result.push({ text: String(d), day: dateStr, isCurrentMonth: false, isToday: false, isSelected: false })
  }

  return result
})

function selectDate(dateStr) {
  selectedDate.value = dateStr
}

function confirm() {
  if (selectedDate.value) {
    emit('confirm', selectedDate.value)
  }
}

function prevMonth() {
  if (month.value === 0) { year.value--; month.value = 11 }
  else month.value--
}

function nextMonth() {
  if (month.value === 11) { year.value++; month.value = 0 }
  else month.value++
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.dp-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dp-box {
  width: 620rpx;
  background: $surface;
  border-radius: 32rpx;
  padding: 32rpx 24rpx 24rpx;
}

.dp-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.dp-nav-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: $surface-container-lowest;
}

.dp-nav-arrow {
  font-size: 40rpx;
  color: $on-surface-variant;
}

.dp-month-year {
  font-size: 32rpx;
  font-weight: 600;
  color: $on-surface;
}

.dp-weekdays {
  display: flex;
  flex-direction: row;
  margin-bottom: 8rpx;
}

.dp-weekday {
  flex: 1;
  text-align: center;
  font-size: 24rpx;
  color: $outline;
  padding: 12rpx 0;
}

.dp-grid {
  display: flex;
  flex-wrap: wrap;
}

.dp-cell {
  width: calc(100% / 7);
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  &--today { background: rgba($primary, 0.08); }
  &--selected { background: $primary; }
  &--other .dp-cell-text { color: $outline; }
  &--selected .dp-cell-text { color: #fff; font-weight: 700; }
}

.dp-cell-text {
  font-size: 28rpx;
  color: $on-surface;
}

.dp-footer {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: 20rpx;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid $surface-container-lowest;
}

.dp-btn {
  padding: 16rpx 40rpx;
  border-radius: $radius-lg;
  font-size: 28rpx;

  &--cancel {
    color: $on-surface-variant;
    background: $surface-container-lowest;
  }

  &--confirm {
    color: #fff;
    background: $primary;
    font-weight: 600;
  }
}
</style>
