<template>
  <!-- 遮罩 -->
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/20" @click="$emit('close')">
    <!-- 面板（阻止点击冒泡到遮罩） -->
    <div class="relative z-50 flex flex-col overflow-hidden bg-white shadow-2xl rounded-xl" style="width: 800px; height: 70vh" @click.stop>

    <!-- ── 头部 ── -->
    <div class="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 shrink-0">
      <div
        class="flex items-center justify-center w-6 h-6 text-xs font-bold text-white rounded-full shrink-0"
        :style="{ backgroundColor: activeTabColor }"
      >{{ activeTabLabel.charAt(0) }}</div>
      <span class="text-sm font-semibold text-gray-800">{{ activeTabLabel }}</span>
      <span class="text-xs text-gray-400">({{ headerTotal }})</span>
      <div class="flex-1" />
      <button
        @click="$emit('close')"
        class="flex items-center justify-center text-gray-400 transition-colors rounded-full w-7 h-7 hover:bg-gray-100 hover:text-gray-600"
      >
        <X :size="16" />
      </button>
    </div>

    <!-- ── 主体：左侧角色 + 右侧（标签页 + 列表） ── -->
    <div class="flex flex-1 min-h-0">

      <!-- 左侧角色列表 -->
      <div class="w-14 py-1 overflow-y-auto scrollbar-hover-thin border-r border-gray-100 shrink-0 bg-gray-50">
        <button
          v-for="(role, idx) in rolesWithCount"
          :key="role.userId"
          @click="!store.aiReplying && (selectedUserId = role.userId)"
          class="relative flex justify-center w-full py-2 transition-colors"
          :class="selectedUserId === role.userId ? 'bg-white' : store.aiReplying ? '' : 'hover:bg-gray-100'"
        >
          <!-- 选中竖线 -->
          <span
            v-if="selectedUserId === role.userId"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-500 rounded-r"
          />
          <!-- 头像（与切换角色列表逻辑相同） -->
          <div class="relative">
            <div
              :class="[
                'w-9 h-9 rounded-[9px] flex items-center justify-center text-sm font-bold text-white overflow-hidden shrink-0 border border-gray-100',
                !getAvatarByOrgType(role.orgType) && !role.avatar
                  ? BG_COLORS[idx % BG_COLORS.length]
                  : 'bg-white',
              ]"
            >
              <img v-if="getAvatarByOrgType(role.orgType)" :src="getAvatarByOrgType(role.orgType)!" class="object-cover w-full h-full" />
              <img v-else-if="role.avatar" :src="role.avatar" class="object-cover w-full h-full" />
              <span v-else>{{ role.loginName.slice(0, 1).toUpperCase() }}</span>
            </div>
            <span
              v-if="role.count > 0"
              class="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none border border-white"
            >{{ role.count }}</span>
          </div>
        </button>
      </div>

      <!-- 右侧：标签页 + 列表 -->
      <div class="flex flex-col flex-1 min-h-0">
        <!-- 标签页 -->
        <div class="flex items-center gap-1 px-3 pt-2 pb-0 border-b border-gray-100 shrink-0">
          <button
            v-for="tab in TABS"
            :key="tab.type"
            @click="selectTab(tab.type)"
            class="relative whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors"
            :class="activeTab === tab.type
              ? 'bg-white text-blue-600 border border-b-white border-gray-200 -mb-px z-10'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
          >
            {{ tab.label }}
            <span
              v-if="tabCount(tab.type) > 0"
              class="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center leading-none border border-white"
              :class="activeTab === tab.type ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'"
            >{{ tabCount(tab.type) }}</span>
          </button>
        </div>

        <!-- 列表 -->
        <div class="flex-1 overflow-y-auto scrollbar-hover-thin">
        <!-- 加载中 -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
          <Loader2 :size="18" class="animate-spin" />
          <span class="text-xs">加载中…</span>
        </div>

        <template v-else>
          <div
            v-for="item in visibleItems"
            :key="item.pkId"
            class="flex items-center gap-3 px-4 py-3 transition-colors border-b border-gray-50 hover:bg-gray-50"
          >
            <!-- 类型方块 -->
            <div
              class="flex items-center justify-center w-16 h-10 px-1 text-xs font-medium leading-tight text-center rounded-md shrink-0"
              :style="typeBlockStyle(item)"
            >{{ item.businessTypeName || '?' }}</div>

            <!-- 内容 -->
            <div class="flex-1 min-w-0">
              <p class="text-sm leading-snug text-gray-800 truncate">{{ item.title || '（无标题）' }}</p>
              <p class="text-xs text-gray-400 mt-0.5 flex gap-1.5">
                <span>{{ item.fkUserName || '' }}</span>
                <span v-if="item.createTime">{{ formatDate(item.createTime) }}</span>
              </p>
            </div>

            <!-- 操作按钮 -->
            <button
              @click="!store.aiReplying && handleAction(item)"
              :disabled="store.aiReplying"
              class="shrink-0 text-xs px-2.5 py-1 rounded border transition-colors"
              :class="store.aiReplying
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : actionLabel(item) === '确认'
                  ? 'border-orange-400 text-orange-500 hover:bg-orange-50'
                  : 'border-blue-400 text-blue-500 hover:bg-blue-50'"
            >{{ actionLabel(item) }}</button>
          </div>

          <div v-if="visibleItems.length === 0" class="py-10 text-sm text-center text-gray-400">
            暂无{{ activeTabLabel }}
          </div>
        </template>
        </div>
      </div>
    </div>
  </div>

    <!-- ── 切换账号确认弹窗 ── -->
    <Teleport to="body">
      <div v-if="confirmVisible" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30" @click.self="cancelSwitch">
        <div class="bg-white rounded-xl shadow-2xl w-80 p-5 flex flex-col gap-4">
          <p class="text-sm font-semibold text-gray-800">提醒</p>
          <p class="text-sm text-gray-600">
            确定切换到该账号下处理此待办事项？？
          </p>
          <div class="flex justify-end gap-2">
            <button
              @click="cancelSwitch"
              class="px-4 py-1.5 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >取消</button>
            <button
              @click="confirmSwitch"
              :disabled="switchLoading"
              class="px-4 py-1.5 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-60 flex items-center gap-1"
            >
              <Loader2 v-if="switchLoading" :size="12" class="animate-spin" />
              确认
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { X, Loader2 } from 'lucide-vue-next'
import { useBacklog } from '../../composables/useBacklog'
import { useAuth } from '../../composables/useAuth'
import { useChat } from '../../composables/useChat'
import { useChatStore } from '../../stores/chat'
import { useProjects } from '../../composables/useProjects'
import { getAvatarByOrgType } from '../../utils/avatar'
import type { BacklogItemVo } from '../../api/agent'

const props = defineProps<{ messageType: number }>()
const emit = defineEmits<{ close: [] }>()

const { typeItemsMap, typeItemsLoadingSet, revealedPrivateIds, isVisible, fetchTypeItems, fetchAllTypeItems } = useBacklog()
const { roles, currentRole, switchRole } = useAuth()
const chat = useChat()
const store = useChatStore()
const { setActive } = useProjects()

// ── 标签页配置 ────────────────────────────────────────
const ALL_TAB = -1
const TABS = [
  { type: 0,       label: '待办事项', color: '#4fa3e3' },
  { type: 1,       label: '确认事项', color: '#f97316' },
  { type: 2,       label: '提醒事项', color: '#9b59b6' },
  { type: ALL_TAB, label: '全部',     color: '#6b7280' },
]

const activeTab = ref(props.messageType)
const selectedUserId = ref<string>('')

function tabCount(type: number) {
  const filterByRole = (arr: BacklogItemVo[]) =>
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

// ── 当前 tab 的原始列表（messageType===1 仅展示已被 AI 回复揭示的项） ──────
const currentItems = computed<BacklogItemVo[]>(() => {
  // 依赖 revealedPrivateIds 使 computed 在揭示时自动更新
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
      isVisible(item) &&
      roleIdSet.value.has(String(item.fkUserId)),
    ),
  )
})
const headerTotal = computed(() => allRoleRelatedItems.value.length)

// ── 加载状态 ──────────────────────────────────────────
const isLoading = computed(() => {
  if (activeTab.value === ALL_TAB) {
    return [0, 1, 2].some(t => typeItemsLoadingSet.value.has(t))
  }
  return typeItemsLoadingSet.value.has(activeTab.value)
})

// ── 左侧角色列表（全部角色 + 全类型数量汇总） ──────
const rolesWithCount = computed(() => {
  void revealedPrivateIds.value
  const allItems = [
    ...(typeItemsMap.value[0] ?? []),
    ...(typeItemsMap.value[1] ?? []).filter(isVisible),
    ...(typeItemsMap.value[2] ?? []),
  ]
  const projectOrder = new Map(store.projects.map((project, index) => [String(project.id), index]))
  const currentUserId = String(currentRole.value?.userId ?? store.activeProjectId ?? '')
  return roles.value
    .map(role => ({
      ...role,
      count: allItems.filter(item => String(item.fkUserId) === String(role.userId)).length,
    }))
    .sort((a, b) => {
      const aIsCurrent = String(a.userId) === currentUserId
      const bIsCurrent = String(b.userId) === currentUserId
      if (aIsCurrent !== bIsCurrent) return aIsCurrent ? -1 : 1
      const aOrder = projectOrder.get(String(a.userId)) ?? Number.MAX_SAFE_INTEGER
      const bOrder = projectOrder.get(String(b.userId)) ?? Number.MAX_SAFE_INTEGER
      if (aOrder !== bOrder) return aOrder - bOrder
      return roles.value.findIndex(role => role.userId === a.userId) - roles.value.findIndex(role => role.userId === b.userId)
    })
})

// 默认选中第一个角色
watch(rolesWithCount, (list) => {
  if (list.length && !list.find(r => r.userId === selectedUserId.value)) {
    selectedUserId.value = list[0].userId
  }
}, { immediate: true })

// ── 右侧可见列表（按选中角色过滤） ───────────────────
const visibleItems = computed(() =>
  selectedUserId.value
    ? currentItems.value.filter(item => String(item.fkUserId) === String(selectedUserId.value))
    : currentItems.value
)

// ── 切换 tab ──────────────────────────────────────────
function hasPrivateItems(types: number[]) {
  const result = types.some(t => (typeItemsMap.value[t] ?? []).some(item => item.messageType === 1))
  console.log('[BacklogPanel] hasPrivateItems types:', types, '→', result,
    'typeItemsMap[1]:', typeItemsMap.value[1]?.length ?? 0, '条')
  return result
}

async function selectTab(type: number) {
  activeTab.value = type
  if (type === ALL_TAB) {
    await fetchAllTypeItems(true)
    if (hasPrivateItems([0, 1, 2])) chat.autoSendPrivateItems()
  } else {
    await fetchTypeItems(type, true)
    if (hasPrivateItems([type])) chat.autoSendPrivateItems()
  }
}

// ── 初始加载 ──────────────────────────────────────────
onMounted(async () => {
  console.log('[BacklogPanel] onMounted, props.messageType:', props.messageType)
  if (props.messageType === ALL_TAB) {
    await fetchAllTypeItems(true)
    console.log('[BacklogPanel] 加载完成，typeItemsMap[1]:', typeItemsMap.value[1]?.length ?? 0, '条')
    if (hasPrivateItems([0, 1, 2])) chat.autoSendPrivateItems()
  } else {
    await fetchTypeItems(props.messageType, true)
    console.log('[BacklogPanel] 加载完成，typeItemsMap[' + props.messageType + ']:', typeItemsMap.value[props.messageType]?.length ?? 0, '条')
    if (hasPrivateItems([props.messageType])) chat.autoSendPrivateItems()
  }
})

// ── 样式工具 ──────────────────────────────────────────
const BG_COLORS = [
  'bg-teal-500',
  'bg-slate-500',
  'bg-indigo-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-cyan-600',
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
function typeBlockStyle(item: BacklogItemVo) {
  const key = (item.matterType ?? item.businessType ?? 0) % TYPE_BLOCK_COLORS.length
  const c = TYPE_BLOCK_COLORS[key]
  return { backgroundColor: c.bg, color: c.text }
}

function formatDate(dateStr: string) {
  return dateStr.replace('T', ' ').slice(0, 16)
}

function actionLabel(item: BacklogItemVo) {
  return item.quickButtonName || (item.matterStatus === 1 ? '确认' : '处理')
}

// ── 切换账号确认弹窗 ──────────────────────────────────
const confirmVisible = ref(false)
const switchLoading = ref(false)
const pendingItem = ref<BacklogItemVo | null>(null)

async function handleAction(item: BacklogItemVo) {
  const itemUserId = String(item.fkUserId ?? '')
  const curUserId  = String(currentRole.value?.userId ?? '')
  if (itemUserId && itemUserId !== curUserId) {
    pendingItem.value = item
    confirmVisible.value = true
    return
  }
  await doSend(item)
}

async function doSend(item: BacklogItemVo) {
  await chat.sendBacklogItem(item)
  emit('close')
}

async function confirmSwitch() {
  const item = pendingItem.value
  if (!item) return
  switchLoading.value = true
  try {
    store.switchingRole = true
    // 先切换 token，再清空 UI 状态，避免 WelcomeState 等组件在 onMounted 中用旧 token 发请求
    await switchRole(String(item.fkUserId!))
    store.messages = []
    store.sessions = []
    store.activeSessionId = ''
    setActive(String(item.fkUserId!))
    await chat.loadSessions()
    if (!store.activeSessionId) chat.newSession()
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
