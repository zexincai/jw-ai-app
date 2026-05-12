<template>
  <view class="page">
    <view class="status-bar-spacer" />

    <!-- Topbar -->
    <view class="topbar">
      <view class="topbar-btn" @tap="uni.navigateBack()">
        <text class="topbar-back">‹</text>
      </view>
      <text class="topbar-title">设置</text>
      <view class="topbar-placeholder" />
    </view>

    <!-- Body -->
    <view class="body">
      <!-- Left tab sidebar -->
      <view class="sidebar">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="activeTab === tab.key ? 'tab-item--active' : ''"
          @tap="activeTab = tab.key"
        >
          <text class="tab-label">{{ tab.label }}</text>
        </view>
      </view>

      <!-- Right content panel -->
      <scroll-view scroll-y class="panel">

        <!-- 通用设置 -->
        <template v-if="activeTab === 'general'">
          <text class="panel-title">通用设置</text>
          <view class="card">
            <view class="row">
              <text class="row-label">头像</text>
              <view class="avatar">
                <text class="avatar-text">{{ auth.currentRole.value?.avatar || 'AI' }}</text>
              </view>
            </view>
            <view class="row-divider" />
            <view class="row">
              <text class="row-label">姓名</text>
              <text class="row-value">{{ auth.currentRole.value?.name || '—' }}</text>
            </view>
          </view>

          <view class="logout-card" @tap="onLogout">
            <text class="logout-text">退出登录</text>
          </view>
        </template>


        <!-- 定时任务 -->
        <template v-else-if="activeTab === 'timing'">
          <text class="panel-title">定时任务</text>
          <view v-if="timingLoading" class="empty-state">
            <text class="empty-text">加载中…</text>
          </view>
          <view v-else-if="userTasks.length === 0" class="empty-state">
            <text class="empty-text">暂无定时任务</text>
          </view>
          <view v-else class="timing-list">
            <view v-for="task in userTasks" :key="task.code" class="timing-card">
              <view class="timing-header">
                <text class="timing-name">{{ task.name }}</text>
                <switch
                  :checked="task.enabled"
                  :disabled="timingSaving"
                  color="#005fae"
                  @change="handleToggle(task)"
                />
              </view>
              <view v-if="!task.enabled" class="timing-disabled">
                <text class="timing-disabled-text">未启用</text>
              </view>
              <view v-else class="timing-rules">
                <view v-for="(rule, ri) in task.rules" :key="ri" class="timing-rule">
                  <text class="timing-rule-label">{{ ri + 1 }}. {{ ruleLabel(rule) }}</text>
                  <text class="timing-rule-time">{{ padTime(rule.hour) }}:{{ padTime(rule.minute) }}</text>
                </view>
              </view>
            </view>
          </view>
        </template>

        <!-- 关于我们 -->
        <template v-else-if="activeTab === 'about'">
          <text class="panel-title">关于我们</text>
          <view class="card">
            <view class="row">
              <text class="row-label">应用名称</text>
              <text class="row-value">JClaw</text>
            </view>
            <view class="row-divider" />
            <view class="row">
              <text class="row-label">版本</text>
              <text class="row-value">{{ currentVersion }}</text>
            </view>
            <view class="row-divider" />
            <view class="row row--action" @tap="loadVersionInfo">
              <text class="row-label">版本日志</text>
              <text class="row-value row-value--link">{{ versionLoading ? '加载中…' : '查看' }}</text>
            </view>
          </view>

          <!-- 版本日志列表 -->
          <view v-if="versionList.length > 0" class="version-list">
            <text class="version-list-title">版本更新日志</text>
            <view v-for="(v, idx) in versionList" :key="idx" class="version-item">
              <view class="version-item-header">
                <text class="version-code">{{ v.versionCode }}</text>
                <text v-if="v.forceStatus === '1'" class="version-tag version-tag--force">强制</text>
                <text v-if="v.enableStatus === 1" class="version-tag version-tag--pending">待更新</text>
                <text v-else-if="v.enableStatus === 2" class="version-tag version-tag--done">已更新</text>
              </view>
              <text v-if="v.updateContent" class="version-content">{{ v.updateContent }}</text>
              <view class="version-meta">
                <text v-if="v.updateBeginTime">开始: {{ formatDate(v.updateBeginTime) }}</text>
                <text v-if="v.updateEndTime"> 结束: {{ formatDate(v.updateEndTime) }}</text>
              </view>
            </view>
          </view>
        </template>

      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth.js'
import { getMobileVersionInfo, searchTimingTaskByUserId, saveOrUpdateTimingTask } from '@/api/agent.js'

const auth = useAuth()
const activeTab = ref('general')

const tabs = [
  { key: 'general', label: '通用设置' },
  { key: 'timing',  label: '定时任务' },
  { key: 'about',   label: '关于我们' },
]

// ── Version info ──
const currentVersion = ref('1.0.0')
const versionLoading = ref(false)
const hasLoadedVersions = ref(false)
const versionList = ref([])

async function loadVersionInfo() {
  if (versionLoading.value) return
  versionLoading.value = true
  try {
    const res = await getMobileVersionInfo()
    const data = res?.data ?? res
    const list = Array.isArray(data) ? data : (data?.records ?? data?.data ?? [])
    versionList.value = list
    hasLoadedVersions.value = true
    if (list.length > 0) {
      currentVersion.value = list[0].versionCode || '1.0.0'
    }
  } catch {
    versionList.value = []
  } finally {
    versionLoading.value = false
  }
}

function formatDate(dateStr) {
  return (dateStr || '').replace('T', ' ').slice(0, 16)
}

// ── Timing tasks ──
const timingLoading = ref(false)
const timingSaving = ref(false)
const userTasks = ref([])

async function loadTimingTasks() {
  timingLoading.value = true
  try {
    const res = await searchTimingTaskByUserId()
    const data = res?.data ?? res
    const list = Array.isArray(data) ? data : (data?.records ?? data?.data ?? [])
    userTasks.value = list.map(t => ({
      ...t,
      enabled: t.enableStatus === 1,
      rules: t.subVos || t.rules || [],
    }))
  } catch {
    userTasks.value = []
  } finally {
    timingLoading.value = false
  }
}

async function handleToggle(task) {
  if (timingSaving.value) return
  timingSaving.value = true
  try {
    const updated = { ...task, enabled: !task.enabled }
    await saveOrUpdateTimingTask({
      ...updated,
      enableStatus: updated.enabled ? 1 : 0,
    })
    task.enabled = !task.enabled
  } catch {
    // ignore toggle error
  } finally {
    timingSaving.value = false
  }
}

function ruleLabel(rule) {
  const types = { 0: '单次', 1: '每天', 2: '每周', 3: '每月', 4: '每年' }
  return types[rule.workType] || '单次'
}

function padTime(n) {
  return String(n ?? 0).padStart(2, '0')
}

onMounted(() => {
  loadVersionInfo().catch(() => {})
  loadTimingTasks().catch(() => {})
})

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    confirmText: '退出',
    confirmColor: '#ba1a1a',
    success(res) {
      if (res.confirm) {
        auth.logout()
        uni.reLaunch({ url: '/pages/login/login' })
      }
    },
  })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: $surface;
  overflow: hidden;
}

.status-bar-spacer {
  height: var(--status-bar-height, 44px);
  background-color: $surface;
  flex-shrink: 0;
}

.topbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 96rpx;
  background-color: $surface;
  flex-shrink: 0;
  border-bottom: 2rpx solid rgba($outline-variant, 0.2);
}

.topbar-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
}

.topbar-back {
  font-size: 64rpx;
  color: $on-surface;
  line-height: 1;
}

.topbar-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $primary;
  flex: 1;
  text-align: center;
}

.topbar-placeholder {
  width: 72rpx;
}

// ── Body ─────────────────────────────────────────────

.body {
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}

// ── Sidebar ──────────────────────────────────────────

.sidebar {
  width: 200rpx;
  flex-shrink: 0;
  background-color: $surface;
  border-right: 2rpx solid rgba($outline-variant, 0.2);
  padding-top: 16rpx;
}

.tab-item {
  padding: 32rpx 28rpx;
  border-right: 4rpx solid transparent;

  &--active {
    border-right-color: $primary;
    background-color: rgba($primary, 0.06);

    .tab-label {
      color: $primary;
      font-weight: 700;
    }
  }
}

.tab-label {
  font-size: 26rpx;
  color: $on-surface-variant;
}

// ── Panel ─────────────────────────────────────────────

.panel {
  flex: 1;
  padding: 32rpx 28rpx;
}

.panel-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: $on-surface;
  margin-bottom: 24rpx;
}

// ── Card ─────────────────────────────────────────────

.card {
  background-color: $surface-container-lowest;
  border-radius: $radius-xl;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 28rpx 32rpx;
  min-height: 96rpx;
}

.row-label {
  flex: 1;
  font-size: 28rpx;
  color: $on-surface;
}

.row-value {
  font-size: 28rpx;
  color: $on-surface-variant;
}

.row-divider {
  height: 1rpx;
  background-color: rgba($outline-variant, 0.5);
  margin: 0 32rpx;
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: $radius-full;
  background: linear-gradient(135deg, #005fae, #4b9bfa);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba($primary, 0.3);
}

.avatar-text {
  font-size: 22rpx;
  font-weight: 700;
  color: $on-primary;
}

// ── Logout ───────────────────────────────────────────

.logout-card {
  margin-top: 32rpx;
  background-color: $surface-container-lowest;
  border-radius: $radius-xl;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-text {
  font-size: 28rpx;
  font-weight: 600;
  color: $error;
}

// ── Empty state ──────────────────────────────────────

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: $outline;
}

// ── Row action ──────────────────────────────────────

.row--action {
  cursor: pointer;
}

.row-value--link {
  color: $primary;
  font-weight: 500;
}

// ── Timing tasks ─────────────────────────────────────

.timing-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.timing-card {
  background-color: $surface-container-lowest;
  border-radius: $radius-xl;
  padding: 28rpx 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.timing-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.timing-name {
  font-size: 28rpx;
  color: $on-surface;
  font-weight: 600;
}

.timing-disabled {
  margin-top: 20rpx;
  padding: 40rpx 0;
  text-align: center;
  background-color: rgba($outline, 0.06);
  border-radius: $radius-lg;
}

.timing-disabled-text {
  font-size: 26rpx;
  color: $outline;
}

.timing-rules {
  margin-top: 16rpx;
}

.timing-rule {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 8rpx 0;
}

.timing-rule-label {
  font-size: 24rpx;
  color: $outline;
  margin-right: 12rpx;
}

.timing-rule-time {
  font-size: 24rpx;
  color: $on-surface-variant;
  font-weight: 600;
}

// ── Version list ─────────────────────────────────────

.version-list {
  margin-top: 24rpx;
}

.version-list-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: $on-surface-variant;
  margin-bottom: 16rpx;
}

.version-item {
  background-color: $surface-container-lowest;
  border-radius: $radius-xl;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.version-item-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.version-code {
  font-size: 28rpx;
  font-weight: 700;
  color: $on-surface;
}

.version-tag {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: $radius-sm;
  font-weight: 600;

  &--force {
    background-color: #fef2f2;
    color: #ef4444;
  }

  &--pending {
    background-color: #fefce8;
    color: #eab308;
  }

  &--done {
    background-color: #f0fdf4;
    color: #22c55e;
  }
}

.version-content {
  font-size: 24rpx;
  color: $on-surface-variant;
  display: block;
  margin-bottom: 8rpx;
  white-space: pre-wrap;
}

.version-meta {
  font-size: 22rpx;
  color: $outline;
}
</style>
