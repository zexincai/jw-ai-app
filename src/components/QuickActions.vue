<template>
  <!-- 芯片横滚行 -->
  <view class="chips-row">
    <view
      v-for="tab in TABS"
      :key="tab.type"
      class="chip"
      :class="openType === tab.type ? 'chip--active' : ''"
      @tap="toggleTab(tab.type)"
    >
      <text class="chip-text">{{ tab.label }}</text>
      <text class="chip-arrow">›</text>
    </view>
  </view>

  <!-- 遮罩 -->
  <view v-if="openType" class="overlay" @tap="closePanel" />

  <!-- 底部面板 -->
  <view v-if="openType" class="panel">
    <view class="panel-header">
      <text class="panel-title">{{ currentTabLabel }}</text>
    </view>
    <view class="panel-divider" />

    <scroll-view scroll-y class="panel-list">
      <view v-if="loading" class="panel-empty">
        <text class="panel-empty-text">加载中...</text>
      </view>
      <template v-else>
        <view
          v-for="item in items"
          :key="item.pkId"
          class="panel-item"
          @tap="selectItem(item)"
        >
          <text class="item-title">{{ item.quickTitle }}</text>
          <view class="item-delete" @tap.stop="deleteItem(item.pkId)">
            <text class="item-delete-text">删除</text>
          </view>
        </view>
        <view v-if="items.length === 0" class="panel-empty">
          <text class="panel-empty-text">暂无数据</text>
        </view>
      </template>
    </scroll-view>

    <view class="panel-add" @tap="openDialog">
      <text class="panel-add-text">＋ 自定义</text>
    </view>
  </view>

  <!-- 新增对话框 -->
  <view v-if="showDialog" class="dialog-mask" @tap="closeDialog">
    <view class="dialog-card" @tap.stop>
      <text class="dialog-tab-label">{{ currentTabLabel }}</text>
      <view class="dialog-field">
        <text class="dialog-label">提示词标签</text>
        <input
          maxlength="10"
          v-model="form.quickTitle"
          class="dialog-input"
          placeholder="请输入标签"
          placeholder-class="dialog-ph"
        />
      </view>
      <view class="dialog-field dialog-field--top">
        <text class="dialog-label">提示词内容</text>
        <textarea
          maxlength="50"
          v-model="form.quickWords"
          class="dialog-textarea"
          placeholder="请输入内容"
          placeholder-class="dialog-ph"
          :auto-height="false"
        />
      </view>
      <view class="dialog-actions">
        <view class="dialog-btn dialog-btn--cancel" @tap="closeDialog">
          <text class="dialog-btn-text dialog-btn-text--cancel">取消</text>
        </view>
        <view
          class="dialog-btn dialog-btn--confirm"
          :class="canSave ? '' : 'dialog-btn--disabled'"
          @tap="saveItem"
        >
          <text class="dialog-btn-text dialog-btn-text--confirm">
            {{ saving ? '保存中...' : '保存' }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getChatQuickList, addChatQuick, deleteChatQuick } from '@/api/chatQuick.js'

const emit = defineEmits(['action'])

const TABS = [
  { type: '0', label: '待办事项' },
  { type: '1', label: '录入资料' },
  { type: '2', label: '查询记录' },
  { type: '3', label: '汇总数据' },
]

const openType   = ref(null)
const items      = ref([])
const loading    = ref(false)
const showDialog = ref(false)
const saving     = ref(false)
const form       = ref({ quickTitle: '', quickWords: '' })

const currentTabLabel = computed(() => TABS.find(t => t.type === openType.value)?.label || '')
const canSave = computed(() => form.value.quickTitle.trim() && form.value.quickWords.trim() && !saving.value)

async function loadItems() {
  if (!openType.value) return
  loading.value = true
  items.value = []
  try {
    const res = await getChatQuickList(openType.value)
    const data = res.data ?? res
    items.value = Array.isArray(data) ? data : (data?.data ?? [])
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

async function toggleTab(type) {
  if (openType.value === type) {
    closePanel()
    return
  }
  openType.value = type
  await loadItems()
}

function closePanel() {
  openType.value = null
  items.value = []
}

function selectItem(item) {
  emit('action', item.quickWords || '')
  closePanel()
}

function deleteItem(pkId) {
  uni.showModal({
    title: '确认删除',
    content: '删除后不可恢复，确定删除吗？',
    confirmText: '删除',
    confirmColor: '#D32F2F',
    cancelText: '取消',
    success: async ({ confirm }) => {
      if (!confirm) return
      try {
        await deleteChatQuick(pkId)
        await loadItems()
      } catch {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}

function openDialog() {
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  form.value = { quickTitle: '', quickWords: '' }
}

async function saveItem() {
  if (!canSave.value) return
  saving.value = true
  try {
    await addChatQuick({
      quickType: openType.value,
      quickTitle: form.value.quickTitle.trim(),
      quickWords: form.value.quickWords.trim(),
    })
    closeDialog()
    await loadItems()
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

// ── 芯片行 ─────────────────────────────────────
.chips-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  overflow-x: auto;
  padding: 16rpx 24rpx;
  padding-left: 0rpx;
  gap: 16rpx;
  border-top: 2rpx solid rgba($outline-variant, 0.2);
  white-space: nowrap;

  &::-webkit-scrollbar { display: none; }
}

.chip {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  border: 2rpx solid rgba($outline-variant, 0.4);
  border-radius: $radius-full;
  flex-shrink: 0;

  &--active {
    border-color: $primary;
    background-color: rgba($primary, 0.06);

    .chip-text,
    .chip-arrow {
      color: $primary;
    }
  }
}

.chip-text {
  font-size: 24rpx;
  color: $on-surface;
}

.chip-arrow {
  font-size: 22rpx;
  color: $on-surface-variant;
}

// ── 遮罩 ───────────────────────────────────────
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
}

// ── 底部面板 ───────────────────────────────────
.panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 60vh;
  background-color: $surface-container-lowest;
  border-radius: $radius-xl $radius-xl 0 0;
  box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.12);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.panel-header {
  padding: 32rpx 32rpx 16rpx;
}

.panel-title {
  font-size: 28rpx;
  font-weight: 700;
  color: $on-surface;
}

.panel-divider {
  height: 1rpx;
  background-color: rgba($outline-variant, 0.3);
  margin: 0 32rpx;
}

.panel-list {
  flex: 1;
  overflow: hidden;
}

.panel-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid rgba($outline-variant, 0.15);
}

.item-title {
  flex: 1;
  font-size: 28rpx;
  color: $on-surface;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-delete {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-delete-text {
  font-size: 24rpx;
  color: #D32F2F;
  font-weight: 600;
}

.panel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx 0;
}

.panel-empty-text {
  font-size: 26rpx;
  color: $outline;
}

.panel-add {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  border-top: 2rpx solid rgba($outline-variant, 0.2);
}

.panel-add-text {
  font-size: 26rpx;
  color: $primary;
  font-weight: 600;
}

// ── 对话框 ─────────────────────────────────────
.dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-card {
  width: 600rpx;
  background-color: $surface;
  border-radius: $radius-xl;
  box-shadow: 0 24rpx 64rpx rgba(0, 0, 0, 0.2);
  padding: 40rpx 36rpx 32rpx;
}

.dialog-tab-label {
  display: block;
  font-size: 26rpx;
  color: $outline;
  text-align: center;
  margin-bottom: 32rpx;
}

.dialog-field {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 24rpx;

  &--top {
    align-items: flex-start;
  }
}

.dialog-label {
  font-size: 26rpx;
  color: $on-surface-variant;
  width: 160rpx;
  flex-shrink: 0;
}

.dialog-input {
  flex: 1;
  font-size: 26rpx;
  height: 60rpx;
  color: $on-surface;
  background: $surface-container-lowest;
  border: 2rpx solid rgba($outline-variant, 0.4);
  border-radius: $radius-lg;
  padding: 16rpx 20rpx;
}

.dialog-textarea {
  flex: 1;
  font-size: 26rpx;
  color: $on-surface;
  background: $surface-container-lowest;
  border: 2rpx solid rgba($outline-variant, 0.4);
  border-radius: $radius-lg;
  padding: 16rpx 20rpx;
  height: 160rpx;
}

.dialog-ph {
  color: rgba($outline-variant, 0.8);
}

.dialog-actions {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: 20rpx;
  margin-top: 32rpx;
}

.dialog-btn {
  padding: 18rpx 40rpx;
  border-radius: $radius-lg;

  &--cancel {
    background-color: $surface-container;
  }

  &--confirm {
    background-color: $primary;
  }

  &--disabled {
    opacity: 0.5;
  }
}

.dialog-btn-text {
  font-size: 26rpx;
  font-weight: 600;

  &--cancel { color: $on-surface-variant; }
  &--confirm { color: $on-primary; }
}
</style>
