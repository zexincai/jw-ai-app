<template>
  <view class="md-table">
    <!-- Header -->
    <view class="md-table__row md-table__row--header">
      <view
        v-for="(h, i) in headers"
        :key="i"
        class="md-table__cell md-table__cell--header"
        :style="cellStyle(i, headers.length, true)"
      >
        <text class="md-table__text md-table__text--header">{{ h }}</text>
      </view>
    </view>
    <!-- Body -->
    <view
      v-for="(row, ri) in rows"
      :key="ri"
      class="md-table__row"
      :style="{ backgroundColor: ri % 2 === 1 ? '#f7f9fb' : '#ffffff' }"
    >
      <view
        v-for="(cell, ci) in row"
        :key="ci"
        class="md-table__cell"
        :style="cellStyle(ci, row.length, false)"
      >
        <text class="md-table__text">{{ cell }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  headers: { type: Array, required: true },
  rows: { type: Array, required: true },
})

const colWidths = computed(() => {
  const widths = props.headers.map(() => 1)
  props.rows.forEach(row => {
    row.forEach((cell, i) => {
      if (cell && cell.length > 10) widths[i] = 2
    })
  })
  return widths
})

function cellStyle(colIndex, totalCols, isHeader) {
  const style = {
    flex: colWidths.value[colIndex] || 1,
    padding: '12rpx 16rpx',
    borderStyle: 'solid',
    borderColor: '#c1c7d4',
    borderWidth: '0',
  }
  // 下边框：每一行都有
  style.borderBottomWidth = '1px'
  // 右边框：非最后一列
  if (colIndex < totalCols - 1) {
    style.borderRightWidth = '1px'
  }
  // 上边框：第一行（表头）
  if (isHeader) {
    style.borderTopWidth = '1px'
  }
  // 左边框：第一列
  if (colIndex === 0) {
    style.borderLeftWidth = '1px'
  }
  return style
}
</script>

<style lang="scss">
.md-table {
  width: 100%;
  margin: 16rpx 0;
}

.md-table__row {
  display: flex;
  flex-direction: row;
}

.md-table__row--header {
  background-color: #f2f4f6;
}

.md-table__cell {
  flex: 1;
  justify-content: center;
}

.md-table__text {
  font-size: 24rpx;
  line-height: 1.5;
  color: #191c1e;
}

.md-table__text--header {
  font-weight: 600;
}
</style>
