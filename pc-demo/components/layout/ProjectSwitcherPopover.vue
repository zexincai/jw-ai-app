<template>
  <!-- 合并底部栏：项目头像触发 + 用户名 + 设置 -->
  <div class="flex items-center min-w-0 gap-2">
    <!-- 左侧可点击区域：项目头像 + 双行文字 + 展开图标 -->
    <button
      @click="open = true"
      class="flex items-center flex-1 min-w-0 gap-2 px-1 py-1 text-left transition-colors rounded-lg hover:bg-gray-50"
      :title="activeProject?.name"
    >
      <!-- 项目头像 -->
      <div
        :class="[
          'w-8 h-8 rounded-[10px] flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0 border border-gray-100',
          !getAvatarByOrgType(activeProject?.orgType) && !activeProject?.avatar
            ? BG_COLORS[activeIndex % BG_COLORS.length]
            : 'bg-white',
        ]"
      >
        <img v-if="getAvatarByOrgType(activeProject?.orgType)" :src="getAvatarByOrgType(activeProject?.orgType)!" class="object-cover w-full h-full" />
        <img v-else-if="activeProject?.avatar" :src="activeProject.avatar" class="object-cover w-full h-full" />
        <span v-else>{{ initial(activeProject?.name || '') }}</span>
      </div>
      <!-- 双行文字 -->
      <div class="flex-1 min-w-0">
        <div class="text-xs font-medium leading-tight text-gray-700 truncate">{{ activeProject?.name || '选择账号' }}</div>
        <div class="flex items-center gap-1 leading-tight">
          <span class="text-xs text-gray-400 truncate">{{ roleName }}</span>
          <span v-if="activeProject?.isMaster === 1" class="shrink-0 text-[9px] font-semibold px-1 py-px rounded bg-amber-100 text-amber-700">管理员</span>
        </div>
      </div>
      <ChevronsUpDown :size="13" class="text-gray-400 shrink-0" />
    </button>

    <!-- 设置按钮 -->
    <button
      @click="showSettings = true"
      class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
      title="设置"
    >
      <Settings :size="16" />
    </button>
    <SettingsModal v-if="showSettings" @close="showSettings = false" />
  </div>

  <!-- 左下角弹出 popover -->
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50" @click.self="open = false">
      <div class="absolute inset-0" @click="open = false" />
      <div class="absolute left-0 flex flex-col overflow-hidden bg-white shadow-2xl bottom-16 rounded-2xl" style="width: 320px; height: 70vh;">
        <!-- 弹窗头部 -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <span class="text-sm font-semibold text-gray-800">切换账号</span>
          <button @click="open = false" class="p-1 text-gray-400 transition-colors rounded-lg hover:text-gray-600 hover:bg-gray-100">
            <X :size="16" />
          </button>
        </div>
        <!-- 可滚动项目列表 -->
        <div class="scrollbar-hover-thin overflow-y-auto flex-1 py-1.5">
          <div
            v-for="(project, idx) in orderedProjects"
            :key="project.id"
            @click="handleSwitch(project.id)"
            class="relative flex items-center gap-3 px-4 py-2.5 transition-colors"
            :class="[
              store.activeProjectId === project.id ? 'bg-red-50' : 'hover:bg-gray-50',
              store.aiReplying && store.activeProjectId !== project.id
                ? 'opacity-40 cursor-not-allowed'
                : 'cursor-pointer',
            ]"
          >
            <!-- 激活指示条 -->
            <div v-if="store.activeProjectId === project.id" class="absolute left-0 top-3 bottom-3 w-0.5 bg-red-500 rounded-r-full" />
            <!-- 头像 -->
            <div
              :class="[
                'w-9 h-9 rounded-[12px] flex items-center justify-center text-sm font-bold text-white overflow-hidden shrink-0 border border-gray-100',
                !getAvatarByOrgType(project.orgType) && !project.avatar
                  ? BG_COLORS[idx % BG_COLORS.length]
                  : 'bg-white',
              ]"
            >
              <img v-if="getAvatarByOrgType(project.orgType)" :src="getAvatarByOrgType(project.orgType)!" class="object-cover w-full h-full" />
              <img v-else-if="project.avatar" :src="project.avatar" class="object-cover w-full h-full" />
              <span v-else>{{ initial(project.name) }}</span>
            </div>
            <div class="flex items-center gap-1.5 flex-1 min-w-0">
              <span class="text-sm text-gray-700 truncate">{{ project.name }}</span>
              <span v-if="project.isMaster === 1" class="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">管理员</span>
            </div>
            <Check v-if="store.activeProjectId === project.id" :size="15" class="text-red-500 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronsUpDown, Check, X, Settings } from 'lucide-vue-next'
import { useChatStore } from '../../stores/chat'
import { useProjects } from '../../composables/useProjects'
import { useChat } from '../../composables/useChat'
import { useAuth } from '../../composables/useAuth'
import { useIframeBridge } from '../../composables/useIframeBridge'
import { getAvatarByOrgType } from '../../utils/avatar'
import SettingsModal from '../ui/SettingsModal.vue'

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

const store = useChatStore()
const { setActive } = useProjects()
const chat = useChat()
const auth = useAuth()
const { closePanel } = useIframeBridge()

const open = ref(false)
const showSettings = ref(false)

const activeProject = computed(() => store.projects.find(p => p.id === store.activeProjectId))
const activeIndex = computed(() => store.projects.findIndex(p => p.id === store.activeProjectId))
const roleName = computed(() => auth.currentRole.value?.loginName ?? '')
const orderedProjects = computed(() => {
  const activeId = store.activeProjectId
  if (!activeId) return store.projects
  return [...store.projects].sort((a, b) => {
    if (a.id === activeId) return -1
    if (b.id === activeId) return 1
    return store.projects.findIndex(project => project.id === a.id) - store.projects.findIndex(project => project.id === b.id)
  })
})

function initial(name: string) {
  return name.slice(0, 1).toUpperCase()
}

async function handleSwitch(projectId: string) {
  if (store.activeProjectId === projectId) {
    open.value = false
    return
  }
  if (store.aiReplying) {
    alert('AI 正在回复中，请等待回复完成后再切换角色')
    return
  }

  open.value = false
  store.switchingRole = true
  closePanel()
  try {
    // 先切换 token，再清空 UI 状态，避免 WelcomeState 等组件在 onMounted 中用旧 token 发请求
    await auth.switchRole(projectId)
    store.messages = []
    store.sessions = []
    store.activeSessionId = ''
    setActive(projectId)
    await chat.loadSessions()
    if (!store.activeSessionId) {
      chat.newSession()
    } else {
      await chat.loadSession(store.activeSessionId)
    }
  } finally {
    store.switchingRole = false
  }
}
</script>
