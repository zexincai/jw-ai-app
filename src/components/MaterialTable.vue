<template>
  <view class="table-wrap">
    <scroll-view scroll-x class="table-scroll">
      <view class="table">
        <!-- Header -->
        <view class="row header-row">
          <text class="cell cell--material header-cell">Material Component</text>
          <text class="cell cell--spec header-cell">Specifications</text>
          <text class="cell cell--qty header-cell">Quantity</text>
          <text class="cell cell--priority header-cell">Priority</text>
        </view>
        <!-- Data rows -->
        <view
          v-for="(row, i) in rows"
          :key="i"
          class="row"
          :class="i % 2 === 1 ? 'row--alt' : ''"
        >
          <view class="cell cell--material">
            <text class="material-name">{{ row.material }}</text>
            <text class="material-sub">{{ row.subtext }}</text>
          </view>
          <text class="cell cell--spec">{{ row.spec }}</text>
          <text class="cell cell--qty mono">{{ row.quantity }}</text>
          <view class="cell cell--priority">
            <text
              class="badge"
              :class="row.priority === 'Critical' ? 'badge--critical' : 'badge--normal'"
            >{{ row.priority }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
defineProps({
  rows: {
    type: Array,
    required: true,
  },
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.table-wrap {
  border-radius: $radius-xl;
  overflow: hidden;
  border: 2rpx solid rgba($outline-variant, 0.3);
  margin-top: 16rpx;
}

.table-scroll {
  width: 100%;
}

.table {
  min-width: 900rpx;
}

.row {
  display: flex;
  flex-direction: row;
  border-bottom: 2rpx solid $surface-container;
  &:last-child { border-bottom: none; }
  &--alt { background-color: rgba($surface-container-low, 0.4); }
}

.header-row {
  background-color: $surface-container-highest;
}

.cell {
  padding: 20rpx 24rpx;
  font-size: 24rpx;
  color: $on-surface;
  display: flex;
  align-items: center;
  &--material { flex: 3; flex-direction: column; align-items: flex-start; }
  &--spec     { flex: 3; }
  &--qty      { flex: 2; }
  &--priority { flex: 2; }
}

.header-cell {
  font-weight: 600;
  color: $on-surface-variant;
  font-size: 22rpx;
}

.material-name {
  font-weight: 600;
  color: $primary;
  font-size: 26rpx;
}

.material-sub {
  font-size: 20rpx;
  color: $on-surface-variant;
  margin-top: 4rpx;
}

.mono {
  font-family: monospace;
  font-weight: 500;
}

.badge {
  font-size: 18rpx;
  font-weight: 700;
  padding: 4rpx 12rpx;
  border-radius: $radius-sm;
  text-transform: uppercase;
  letter-spacing: 1rpx;

  &--critical {
    background-color: $error-container;
    color: $on-error-container;
  }
  &--normal {
    background-color: $secondary-container;
    color: $on-secondary-container;
  }
}
</style>
