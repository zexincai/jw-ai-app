<template>
  <div
    class="flex flex-col items-center w-[76px] bg-white border-r border-gray-100 pt-6 pb-4 shrink-0 h-full overflow-hidden">
    <div class="flex-1 w-full overflow-y-auto scrollbar-none flex flex-col items-center gap-5 py-2">
      <div v-for="(project, idx) in store.projects" :key="project.id"
        class="relative flex items-center justify-center w-full px-3">
        <!-- 活动指示条 -->
        <div v-if="store.activeProjectId === project.id"
          class="absolute left-0 w-1.5 h-8 bg-red-500 rounded-r-full transition-all duration-300" />

        <button @click="handleSwitch(project.id)" :title="store.aiReplying && store.activeProjectId !== project.id ? 'AI 回复中，请稍候' : project.name" :disabled="store.aiReplying && store.activeProjectId !== project.id" :class="[
          'w-12 h-12 rounded-[18px] flex items-center justify-center text-sm font-bold transition-all duration-200 hover:rounded-[14px] overflow-hidden border',
          store.activeProjectId === project.id
            ? 'text-white shadow-lg shadow-black/10 scale-105 ring-2 ring-red-500 ring-offset-2 border-transparent'
            : 'text-white opacity-90 hover:opacity-100 hover:scale-105 border-blue-100',
          store.aiReplying && store.activeProjectId !== project.id ? 'cursor-not-allowed opacity-40' : '',
          !getAvatarByOrgType(project.orgType) && !project.avatar ? BG_COLORS[idx % BG_COLORS.length] : 'bg-white'
        ]">
          <img v-if="getAvatarByOrgType(project.orgType)" :src="getAvatarByOrgType(project.orgType)!"
            class="w-full h-full object-cover" />
          <img v-else-if="project.avatar" :src="project.avatar" class="w-full h-full object-cover" />
          <span v-else>{{ initial(project.name) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChatStore } from '../../stores/chat'
import { useProjects } from '../../composables/useProjects'
import { useChat } from '../../composables/useChat'
import { useAuth } from '../../composables/useAuth'
import { useIframeBridge } from '../../composables/useIframeBridge'
import { getAvatarByOrgType } from '../../utils/avatar'

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

function initial(name: string) {
  return name.slice(0, 1).toUpperCase()
}

async function handleSwitch(projectId: string) {
  if (store.activeProjectId === projectId) return
  if (store.aiReplying) {
    alert('AI 正在回复中，请等待回复完成后再切换角色')
    return
  }

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

<style scoped>
.scrollbar-none::-webkit-scrollbar {
  display: none;
}

.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
