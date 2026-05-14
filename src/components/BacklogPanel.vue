<template>
  <view class="blp-overlay" @tap="$emit('close')">
    <view class="blp-panel" @tap.stop>
      <!-- 头部 -->
      <view class="blp-header">
        <view
          class="blp-header-dot"
          :style="{ backgroundColor: activeTabColor }"
        >{{ activeTabLabel.charAt(0) }}</view>
        <text class="blp-header-title">{{ activeTabLabel }}</text>
        <text class="blp-header-total">({{ headerTotal }})</text>
        <view class="blp-header-spacer" />
        <view class="blp-header-close" @tap="$emit('close')">
          <text class="blp-header-close-x">✕</text>
        </view>
      </view>

      <!-- 主体 -->
      <view class="blp-body">
        <!-- 左侧角色列表 -->
        <scroll-view scroll-y class="blp-roles">
          <view
            v-for="(role, idx) in rolesWithCount"
            :key="role.userId"
            class="blp-role-item"
            :class="{ 'blp-role-item--active': selectedUserId === role.userId }"
            @tap="!store.aiReplying && (selectedUserId = role.userId)"
          >
            <view v-if="selectedUserId === role.userId" class="blp-role-bar" />
            <view class="blp-role-avatar-wrap">
              <view
                class="blp-role-avatar"
                :style="!role.avatarUrl ? { backgroundColor: BG_COLORS[idx % BG_COLORS.length] } : {}"
              >
                <image v-if="role.avatarUrl" :src="role.avatarUrl" class="blp-role-avatar-img" mode="aspectFill" />
                <text v-else class="blp-role-avatar-text">{{ role.avatar || role.name?.slice(0, 2)?.toUpperCase() }}</text>
              </view>
              <text v-if="role.count > 0" class="blp-role-badge">{{ role.count }}</text>
            </view>
          </view>
        </scroll-view>

        <!-- 右侧：标签页 + 列表 -->
        <view class="blp-content">
          <!-- 标签页 -->
          <view class="blp-tabs">
            <view
              v-for="tab in TABS"
              :key="tab.type"
              class="blp-tab"
              :class="{ 'blp-tab--active': activeTab === tab.type }"
              @tap="selectTab(tab.type)"
            >
              <text class="blp-tab-label">{{ tab.label }}</text>
              <text
                v-if="tabCount(tab.type) > 0"
                class="blp-tab-badge"
              >{{ tabCount(tab.type) }}</text>
            </view>
          </view>

          <!-- 列表 -->
          <scroll-view scroll-y class="blp-list">
            <view v-if="isLoading" class="blp-loading">
              <text class="blp-loading-text">加载中…</text>
            </view>

            <template v-else>
              <view
                v-for="item in visibleItems"
                :key="item.pkId"
                class="blp-item"
                @tap="!store.aiReplying && handleAction(item)"
              >
                <view
                  class="blp-item-type"
                  :style="typeBlockStyle(item)"
                >{{ item.businessTypeName || '?' }}</view>

                <view class="blp-item-info">
                  <text class="blp-item-title">{{ item.title || '（无标题）' }}</text>
                  <text class="blp-item-meta">
                    {{ item.fkUserName || '' }}
                    {{ item.createTime ? formatDate(item.createTime) : '' }}
                  </text>
                </view>

                <view class="blp-item-action" :class="actionLabel(item) === '确认' ? 'blp-item-action--confirm' : ''">
                  {{ actionLabel(item) }}
                </view>
              </view>

              <view v-if="visibleItems.length === 0" class="blp-empty">
                <image src="/static/icon-empty.svg" class="blp-empty-icon" mode="aspectFit" />
                <text class="blp-empty-text">暂无{{ activeTabLabel }}</text>
              </view>
            </template>
          </scroll-view>
        </view>
      </view>

      <!-- 切换账号确认弹窗 -->
      <view v-if="confirmVisible" class="blp-confirm-mask" @tap="cancelSwitch">
        <view class="blp-confirm-box" @tap.stop>
          <text class="blp-confirm-title">提醒</text>
          <text class="blp-confirm-msg">确定切换到该账号下处理此待办？</text>
          <view class="blp-confirm-btns">
            <view class="blp-confirm-cancel" @tap="cancelSwitch">取消</view>
            <view class="blp-confirm-ok" @tap="confirmSwitch">
              {{ switchLoading ? '切换中…' : '确认' }}
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useBacklog } from '@/composables/useBacklog.js'
import { useAuth } from '@/composables/useAuth.js'
import { useChat } from '@/composables/useChat.js'
import { useChatStore } from '@/stores/chat.js'

const props = defineProps({
  messageType: { type: Number, required: true },
})
const emit = defineEmits(['close'])

const { typeItemsMap, typeItemsLoadingSet, revealedPrivateIds, isVisible, fetchTypeItems, fetchAllTypeItems } = useBacklog()
const { roles, currentRole, switchRole } = useAuth()
const chat = useChat()
const store = useChatStore()

const ALL_TAB = -1
const TABS = [
  { type: 0,       label: '待办', color: '#4fa3e3' },
  { type: 1,       label: '确认', color: '#f97316' },
  { type: 2,       label: '提醒', color: '#9b59b6' },
  { type: ALL_TAB, label: '全部', color: '#6b7280' },
]

const activeTab = ref(props.messageType)
const selectedUserId = ref('')

function tabCount(type) {
  const filterByRole = (arr) =>
    selectedUserId.value
      ? arr.filter(item => String(item.fkUserId) === String(selectedUserId.value))
      : arr
  if (type === ALL_TAB) {
    return [0, 1, 2].reduce((sum, t) =>
      sum + filterByRole((typeItemsMap.value[t] ?? []).filter(isVisible)).length, 0)
  }
  return filterByRole((typeItemsMap.value[type] ?? []).filter(isVisible)).length
}

const activeTabLabel = computed(() => TABS.find(t => t.type === activeTab.value)?.label ?? '')
const activeTabColor  = computed(() => TABS.find(t => t.type === activeTab.value)?.color ?? '#4fa3e3')

const currentItems = computed(() => {
  void revealedPrivateIds.value
  if (activeTab.value === ALL_TAB) {
    return [
      ...(typeItemsMap.value[0] ?? []),
      ...(typeItemsMap.value[1] ?? []).filter(isVisible),
      ...(typeItemsMap.value[2] ?? []),
    ]
  }
  return (typeItemsMap.value[activeTab.value] ?? []).filter(isVisible)
})

const roleIdSet = computed(() => new Set(roles.value.map(role => String(role.userId))))
const allRoleRelatedItems = computed(() => {
  void revealedPrivateIds.value
  return [0, 1, 2].flatMap(type =>
    (typeItemsMap.value[type] ?? []).filter(item =>
      isVisible(item) && roleIdSet.value.has(String(item.fkUserId)),
    ),
  )
})
const headerTotal = computed(() => allRoleRelatedItems.value.length)

const isLoading = computed(() => {
  if (activeTab.value === ALL_TAB) {
    return [0, 1, 2].some(t => typeItemsLoadingSet.value.has(t))
  }
  return typeItemsLoadingSet.value.has(activeTab.value)
})

const rolesWithCount = computed(() => {
  void revealedPrivateIds.value
  const allItems = [
    ...(typeItemsMap.value[0] ?? []),
    ...(typeItemsMap.value[1] ?? []).filter(isVisible),
    ...(typeItemsMap.value[2] ?? []),
  ]
  const currentUserId = String(currentRole.value?.userId ?? '')
  return roles.value
    .map(role => ({
      ...role,
      initial: (role.name || '').slice(0, 2).toUpperCase(),
      count: allItems.filter(item => String(item.fkUserId) === String(role.userId)).length,
    }))
    .sort((a, b) => {
      const aIsCurrent = String(a.userId) === currentUserId
      const bIsCurrent = String(b.userId) === currentUserId
      if (aIsCurrent !== bIsCurrent) return aIsCurrent ? -1 : 1
      return roles.value.findIndex(r => r.userId === a.userId) - roles.value.findIndex(r => r.userId === b.userId)
    })
})

watch(rolesWithCount, (list) => {
  if (list.length && !list.find(r => r.userId === selectedUserId.value)) {
    selectedUserId.value = list[0].userId
  }
}, { immediate: true })

const visibleItems = computed(() =>
  selectedUserId.value
    ? currentItems.value.filter(item => String(item.fkUserId) === String(selectedUserId.value))
    : currentItems.value
)

function hasPrivateItems(types) {
  return types.some(t => (typeItemsMap.value[t] ?? []).some(item => item.messageType === 1))
}

async function selectTab(type) {
  activeTab.value = type
  if (type === ALL_TAB) {
    await fetchAllTypeItems(true)
    if (hasPrivateItems([0, 1, 2])) chat.autoSendPrivateItems()
  } else {
    await fetchTypeItems(type, true)
    if (hasPrivateItems([type])) chat.autoSendPrivateItems()
  }
}

onMounted(async () => {
  if (props.messageType === ALL_TAB) {
    await fetchAllTypeItems(true)
    if (hasPrivateItems([0, 1, 2])) chat.autoSendPrivateItems()
  } else {
    await fetchTypeItems(props.messageType, true)
    if (hasPrivateItems([props.messageType])) chat.autoSendPrivateItems()
  }
})

// ── 样式工具 ──
const BG_COLORS = [
  '#14b8a6', '#64748b', '#6366f1', '#f59e0b',
  '#f43f5e', '#10b981', '#8b5cf6', '#0891b2',
]

const TYPE_BLOCK_COLORS = [
  { bg: '#fde8e8', text: '#c0392b' },
  { bg: '#e8f4fd', text: '#2471a3' },
  { bg: '#e8fdf0', text: '#1e8449' },
  { bg: '#fef9e7', text: '#b7770d' },
  { bg: '#f0ebff', text: '#7d3c98' },
  { bg: '#fdebd0', text: '#d35400' },
  { bg: '#eaf2ff', text: '#1a5276' },
  { bg: '#fdf2f8', text: '#c0392b' },
]
function typeBlockStyle(item) {
  const key = (item.matterType ?? item.businessType ?? 0) % TYPE_BLOCK_COLORS.length
  const c = TYPE_BLOCK_COLORS[key]
  return { backgroundColor: c.bg, color: c.text }
}

function formatDate(dateStr) {
  return (dateStr || '').replace('T', ' ').slice(0, 16)
}

function actionLabel(item) {
  return item.quickButtonName || (item.matterStatus === 1 ? '确认' : '处理')
}

// ── 切换账号确认弹窗 ──
const confirmVisible = ref(false)
const switchLoading = ref(false)
const pendingItem = ref(null)

async function handleAction(item) {
  const itemUserId = String(item.fkUserId ?? '')
  const curUserId  = String(currentRole.value?.userId ?? '')
  if (itemUserId && itemUserId !== curUserId) {
    pendingItem.value = item
    confirmVisible.value = true
    return
  }
  await doSend(item)
}

async function doSend(item) {
  await chat.sendBacklogItem(item)
  emit('close')
}

async function confirmSwitch() {
  const item = pendingItem.value
  if (!item) return
  switchLoading.value = true
  try {
    store.switchingRole = true
    await switchRole(String(item.fkUserId))
    store.messages = []
    store.sessions = []
    store.activeSessionId = ''
    await chat.loadSessions()
    if (!store.activeSessionId) store.newLocalSession()
    confirmVisible.value = false
    pendingItem.value = null
    await doSend(item)
  } finally {
    store.switchingRole = false
    switchLoading.value = false
  }
}

function cancelSwitch() {
  confirmVisible.value = false
  pendingItem.value = null
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.blp-overlay {
  position: fixed;
  inset: 0;
  z-index: 700;
  background-color: rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.blp-panel {
  width: 100%;
  height: 80vh;
  background-color: $surface;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.blp-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 24rpx 28rpx;
  border-bottom: 2rpx solid $outline-variant;
  flex-shrink: 0;
}

.blp-header-dot {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
  margin-right: 16rpx;
}

.blp-header-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $on-surface;
}

.blp-header-total {
  font-size: 24rpx;
  color: $outline;
  margin-left: 8rpx;
}

.blp-header-spacer {
  flex: 1;
}

.blp-header-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.blp-header-close-x {
  font-size: 32rpx;
  color: $outline;
}

.blp-body {
  flex: 1;
  display: flex;
  flex-direction: row;
  min-height: 0;
}

// 左侧角色
.blp-roles {
  width: 100rpx;
  background-color: $surface-container-lowest;
  flex-shrink: 0;
}

.blp-role-item {
  position: relative;
  display: flex;
  justify-content: center;
  padding: 16rpx 0;
}

.blp-role-item--active {
  background-color: $surface;
}

.blp-role-bar {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4rpx;
  height: 48rpx;
  background-color: $primary;
  border-radius: 0 4rpx 4rpx 0;
}

.blp-role-avatar-wrap {
  position: relative;
}

.blp-role-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2rpx solid $outline-variant;
}

.blp-role-avatar-img {
  width: 100%;
  height: 100%;
}

.blp-role-avatar-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
}

.blp-role-badge {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 4rpx;
  background: #ef4444;
  color: #fff;
  font-size: 18rpx;
  font-weight: 700;
  border-radius: 9999rpx;
  line-height: 28rpx;
  text-align: center;
  border: 2rpx solid #fff;
}

// 右侧
.blp-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.blp-tabs {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  flex-shrink: 0;
  padding: 16rpx;
  border-bottom: 2rpx solid $outline-variant;
}

.blp-tab {
  position: relative;
  padding: 12rpx 0;
  border-radius: 16rpx 16rpx 0 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}

.blp-tab--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  background-color: $primary;
  border-radius: 2rpx;
}

.blp-tab-label {
  font-size: 24rpx;
  color: $outline;
}

.blp-tab--active .blp-tab-label {
  color: $primary;
  font-weight: 600;
}

.blp-tab-badge {
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 6rpx;
  background: #ef4444;
  color: #fff;
  font-size: 18rpx;
  font-weight: 700;
  border-radius: 9999rpx;
  line-height: 28rpx;
  text-align: center;
}


// 列表
.blp-list {
  flex: 1;
}

.blp-loading {
  display: flex;
  justify-content: center;
  padding: 80rpx 0;
}

.blp-loading-text {
  font-size: 26rpx;
  color: $outline;
}

.blp-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 2rpx solid $surface-container-lowest;
  gap: 16rpx;
}

.blp-item-type {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 56rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
  font-weight: 600;
  text-align: center;
  flex-shrink: 0;
}

.blp-item-info {
  flex: 1;
  min-width: 0;
}

.blp-item-title {
  font-size: 26rpx;
  color: $on-surface;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blp-item-meta {
  font-size: 22rpx;
  color: $outline;
  margin-top: 4rpx;
  display: block;
}

.blp-item-action {
  flex-shrink: 0;
  font-size: 22rpx;
  padding: 8rpx 20rpx;
  border-radius: 12rpx;
  border: 2rpx solid $primary;
  color: $primary;
}

.blp-item-action--confirm {
  border-color: #f97316;
  color: #f97316;
}

.blp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
}

.blp-empty-icon {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 24rpx;
  opacity: 0.6;
}

.blp-empty-text {
  font-size: 26rpx;
  color: $outline;
}

// 确认弹窗
.blp-confirm-mask {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.blp-confirm-box {
  width: 560rpx;
  background: $surface;
  border-radius: 24rpx;
  padding: 40rpx;
}

.blp-confirm-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $on-surface;
  display: block;
}

.blp-confirm-msg {
  font-size: 28rpx;
  color: $on-surface-variant;
  margin-top: 20rpx;
  display: block;
}

.blp-confirm-btns {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  gap: 20rpx;
  margin-top: 36rpx;
}

.blp-confirm-cancel {
  padding: 16rpx 36rpx;
  border-radius: 16rpx;
  border: 2rpx solid $outline-variant;
  font-size: 26rpx;
  color: $on-surface-variant;
}

.blp-confirm-ok {
  padding: 16rpx 36rpx;
  border-radius: 16rpx;
  background-color: $primary;
  font-size: 26rpx;
  color: #fff;
}
</style>
