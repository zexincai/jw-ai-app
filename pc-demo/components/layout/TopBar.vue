<template>
  <div class="flex items-center h-10 bg-white border-b border-gray-200 px-3 gap-2 shrink-0">
    <div class="flex items-center gap-1.5 mr-2 shrink-0">
      <div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
        <span class="text-white text-xs font-bold">J</span>
      </div>
      <span class="text-sm font-semibold text-gray-700">JClaw</span>
    </div>

    <div class="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
      <button
        v-for="project in store.projects"
        :key="project.id"
        @click="handleSwitch(project.id)"
        :class="[
          'shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors',
          store.activeProjectId === project.id
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        ]"
      >{{ project.name }}</button>
    </div>

    <!-- WS 状态指示 -->
    <div
      :class="[
        'w-2 h-2 rounded-full shrink-0 transition-colors',
        store.wsStatus === 'connected' ? 'bg-green-500' :
        store.wsStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-gray-300'
      ]"
      :title="store.wsStatus === 'connected' ? '已连接' : store.wsStatus === 'connecting' ? '连接中' : '未连接'"
    />
  </div>
</template>

<script setup lang="ts">
import { useChatStore } from '../../stores/chat'
import { useProjects } from '../../composables/useProjects'
import { useChat } from '../../composables/useChat'

const store = useChatStore()
const { setActive } = useProjects()
const chat = useChat()

async function handleSwitch(projectId: string) {
  setActive(projectId)
  await chat.loadSessions()
  if (store.activeSessionId) {
    await chat.loadSession(store.activeSessionId)
  }
}
</script>
