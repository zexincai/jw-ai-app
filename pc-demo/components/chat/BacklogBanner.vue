<template>
  <div v-if="backlogTotal > 0" class="relative shrink-0">
    <!-- 折叠头部 -->
    <button
      @click="expanded = !expanded"
      class="flex items-center gap-1.5 w-full px-4 py-2 text-sm bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors text-gray-700 font-medium"
    >
      <span>待办事项 ({{ backlogTotal }})</span>
      <ChevronDown
        :size="14"
        class="text-gray-400 transition-transform"
        :class="expanded ? 'rotate-180' : ''"
      />
    </button>

    <!-- 展开面板：左右两栏 -->
    <div
      v-if="expanded"
      class="absolute top-full left-0 z-20 bg-white border border-gray-200 rounded-b-lg shadow-lg w-[500px] flex"
      style="max-height: 320px"
    >
      <!-- 左侧角色列表：只显示头像 + 右上角数量角标 -->
      <div class="py-1 overflow-y-auto border-r border-gray-100 w-14 shrink-0 bg-gray-50">
        <button
          v-for="role in roleList"
          :key="role.name"
          @click="selectedRole = role.name"
          class="w-full flex justify-center py-2.5 transition-colors relative"
          :class="selectedRole === role.name ? 'bg-white' : 'hover:bg-gray-100'"
        >
          <!-- 选中时左边蓝色竖线 -->
          <span
            v-if="selectedRole === role.name"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-500 rounded-r"
          />
          <!-- 头像 -->
          <div class="relative">
            <div
              class="flex items-center justify-center w-8 h-8 text-sm font-semibold text-white rounded-full"
              :style="{ backgroundColor: roleColor(role.name) }"
            >
              {{ role.name.charAt(0) }}
            </div>
            <!-- 数量角标 -->
            <span
              class="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none"
            >{{ role.count }}</span>
          </div>
        </button>
      </div>

      <!-- 右侧待办列表 -->
      <div class="flex-1 overflow-y-auto">
        <div
          v-for="item in filteredItems"
          :key="item.pkId"
          class="flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors"
        >
          <!-- 类型方块 -->
          <div
            class="flex items-center justify-center h-10 px-2 text-xs font-medium rounded-md shrink-0 whitespace-nowrap"
            :style="typeBlockStyle(item)"
          >
            {{ item.businessTypeName || '?' }}
          </div>

          <!-- 内容 -->
          <div class="flex-1 min-w-0">
            <p class="text-sm leading-snug text-gray-800 truncate">{{ item.title || '（无标题）' }}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ item.fkUserName || '' }}
              <span v-if="item.createTime" class="ml-1">{{ formatDate(item.createTime) }}</span>
            </p>
          </div>

          <!-- 操作按钮 -->
          <button
            class="shrink-0 text-xs px-2.5 py-1 rounded border transition-colors"
            :class="actionLabel(item) === '确认'
              ? 'border-orange-400 text-orange-500 hover:bg-orange-50'
              : 'border-blue-400 text-blue-500 hover:bg-blue-50'"
          >
            {{ actionLabel(item) }}
          </button>
        </div>

        <div v-if="filteredItems.length === 0" class="py-6 text-sm text-center text-gray-400">
          暂无待办
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { useBacklog } from '../../composables/useBacklog'
import type { BacklogItemVo } from '../../api/agent'

const { backlogItems, backlogTotal } = useBacklog()
const expanded = ref(false)

// 角色列表（去重 + 统计数量）
const roleList = computed(() => {
  const map = new Map<string, number>()
  for (const item of backlogItems.value) {
    const role = item.roleName || '未分配'
    map.set(role, (map.get(role) ?? 0) + 1)
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
})

const selectedRole = ref('')
watch(roleList, (list) => {
  if (list.length && !selectedRole.value) {
    selectedRole.value = list[0].name
  }
}, { immediate: true })

const filteredItems = computed(() =>
  backlogItems.value.filter(item => (item.roleName || '未分配') === selectedRole.value)
)

// 颜色池
const COLORS = ['#4f9cf9', '#f97316', '#a78bfa', '#34d399', '#fb7185', '#fbbf24', '#60a5fa', '#f472b6']

function roleColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

// 类型方块：柔和背景色 + 深色文字
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

// function isNew(item: BacklogItemVo): boolean {
//   if (!item.createTime) return false
//   return Date.now() - new Date(item.createTime).getTime() < 86400_000
// }

function formatDate(dateStr: string): string {
  return dateStr.replace('T', ' ').slice(0, 16)
}

function actionLabel(item: BacklogItemVo): string {
  return item.matterStatus === 1 ? '确认' : '处理'
}
</script>
