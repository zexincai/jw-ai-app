<template>
  <div class="flex-1 flex flex-col items-center justify-center min-h-0 bg-white px-4">
    <!-- 问候标题 -->
    <div class="mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div class="mb-6 flex justify-center">
        <div
          class="w-20 h-20 rounded-3xl bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center p-1 border border-slate-100 rotate-3 hover:rotate-0 transition-transform duration-300">
          <img :src="logoUrl" class="w-full h-full rounded-2xl object-cover" />
        </div>
      </div>
      <h1 class="text-4xl font-bold text-slate-800 tracking-tight">
        Hi，我是<span class="text-slate-900">JClaw</span>
      </h1>
    </div>

    <!-- 欢迎卡片容器 -->
    <div
      class="w-full max-w-2xl bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-slate-200/50 overflow-hidden animate-in fade-in zoom-in duration-500 delay-200">
      <!-- 快捷操作栏 -->
      <div class="flex items-center gap-3 px-6 pt-6 pb-2 overflow-x-auto scrollbar-none">
        <div v-for="tab in tabs" :key="tab.type" class="relative shrink-0" :ref="el => setTabRef(tab.type, el)">
          <button @click="togglePopup(tab.type)"
            class="flex items-center gap-2 px-4 py-2 border rounded-full text-sm font-medium transition-all group"
            :class="openType === tab.type
              ? 'bg-blue-50 border-blue-200 text-blue-600'
              : 'bg-gray-50 hover:bg-white hover:shadow-md border-gray-100 text-gray-600'">
            <span>{{ tab.label }}</span>
            <ChevronRight :size="14"
              :class="openType === tab.type ? 'text-blue-300' : 'text-gray-300 group-hover:text-blue-300'" />
          </button>
        </div>
      </div>

      <!-- 输入框 -->
      <div class="px-2 pb-2">
        <InputBar is-welcome />
      </div>
    </div>

    <!-- 底部免责声明 -->
    <p class="mt-8 text-xs text-gray-400 font-light tracking-wide animate-in fade-in duration-1000 delay-500">
      内容由 AI 生成，请注意甄别！
    </p>
  </div>

  <!-- Popup -->
  <Teleport to="body">
    <div v-if="openType && popupPos"
      :style="{ position: 'fixed', bottom: popupPos.bottom + 'px', left: popupPos.left + 'px', zIndex: 9999 }"
      class="bg-white border border-gray-200 rounded-2xl shadow-xl py-2 min-w-[160px]">
      <div v-if="loading" class="px-4 py-3 text-xs text-gray-400 text-center">加载中...</div>
      <template v-else>
        <div v-for="item in items" :key="item.pkId"
          class="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors group cursor-pointer"
          @click="selectItem(item)">
          <span class="flex-1 text-xs text-blue-500 truncate">{{ item.quickTitle }}</span>
          <button @click.stop="deleteItem(item.pkId!)"
            class="text-red-400 hover:text-red-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 :size="13" />
          </button>
        </div>
        <div v-if="items.length === 0" class="px-4 py-2 text-xs text-gray-300 text-center">暂无数据</div>
        <button @click="openAdd"
          class="flex items-center gap-1 px-4 py-2 text-xs text-gray-400 hover:text-blue-500 hover:bg-gray-50 transition-colors w-full">
          <Plus :size="12" />
          自定义
        </button>
      </template>
    </div>

    <!-- 点击遮罩关闭 -->
    <div v-if="openType" class="fixed inset-0" style="z-index: 9998" @click="closePopup" />
  </Teleport>

  <!-- Add Dialog -->
  <Teleport to="body">
    <div v-if="showDialog" class="fixed inset-0 bg-black/20 flex items-center justify-center z-[9999]"
      @click="closeDialog">
      <div class="bg-white rounded-xl shadow-xl w-96 p-6" @click.stop>
        <div class="mb-4 text-sm text-gray-400 text-center">
          {{tabs.find(t => t.type === openType)?.label}}
        </div>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-600 w-20 shrink-0 whitespace-nowrap">提示词标签</span>
            <input placeholder="请输入" v-model="form.quickTitle"
              class="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-300" />
          </div>
          <div class="flex items-start gap-3">
            <span class="text-sm text-gray-600 w-20 shrink-0 whitespace-nowrap pt-1.5">提示词内容</span>
            <textarea placeholder="请输入" v-model="form.quickWords" rows="4"
              class="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-300 resize-none" />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <button @click="closeDialog"
            class="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors">取消</button>
          <button @click="saveItem" :disabled="saving || !form.quickTitle.trim() || !form.quickWords.trim()"
            class="px-4 py-1.5 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50 transition-colors">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ChevronRight, Plus, Trash2 } from 'lucide-vue-next'
import logoUrl from '../../assets/logo.png'
import InputBar from './InputBar.vue'
import { useChat } from '../../composables/useChat'
import { useQuickTypes } from '../../composables/useQuickTypes'
import {
  getUserAccountChatQuickList,
  addChatQuick,
  deleteChatQuick,
  type EngAgentChatQuickVO,
} from '../../api/chatQuick'

const chat = useChat()
const { tabs, fetchTabs } = useQuickTypes()

onMounted(fetchTabs)

const openType = ref<string | null>(null)
const popupPos = ref<{ bottom: number; left: number } | null>(null)
const items = ref<EngAgentChatQuickVO[]>([])
const loading = ref(false)
const showDialog = ref(false)
const saving = ref(false)
const form = ref({ quickTitle: '', quickWords: '' })

const tabRefs = new Map<string, HTMLElement>()
function setTabRef(type: string, el: unknown) {
  if (el) tabRefs.set(type, el as HTMLElement)
  else tabRefs.delete(type)
}

async function togglePopup(type: string) {
  if (openType.value === type) {
    closePopup()
    return
  }
  openType.value = type

  const tabEl = tabRefs.get(type)
  if (tabEl) {
    const rect = tabEl.getBoundingClientRect()
    popupPos.value = {
      bottom: window.innerHeight - rect.top + 6,
      left: rect.left,
    }
  }

  loading.value = true
  items.value = []
  try {
    const res = await getUserAccountChatQuickList(type)
    const data = (res as any).data
    items.value = Array.isArray(data) ? data : (data?.data ?? [])
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

function closePopup() {
  openType.value = null
  popupPos.value = null
}

function selectItem(item: EngAgentChatQuickVO) {
  chat.send(item.quickWords || '')
  closePopup()
}

async function deleteItem(pkId: string) {
  try {
    await deleteChatQuick(pkId)
    if (openType.value) {
      const res = await getUserAccountChatQuickList(openType.value)
      const data = (res as any).data
      items.value = Array.isArray(data) ? data : (data?.data ?? [])
    }
  } catch { /* ignore */ }
}

function openAdd() {
  showDialog.value = true
}

async function saveItem() {
  if (!form.value.quickTitle.trim() || !form.value.quickWords.trim() || saving.value) return
  saving.value = true
  try {
    await addChatQuick({
      quickType: openType.value ?? '0',
      quickTitle: form.value.quickTitle,
      quickWords: form.value.quickWords,
    })
    closeDialog()
    if (openType.value) {
      const res = await getUserAccountChatQuickList(openType.value)
      const data = (res as any).data
      items.value = Array.isArray(data) ? data : (data?.data ?? [])
    }
  } finally {
    saving.value = false
  }
}

function closeDialog() {
  showDialog.value = false
  form.value = { quickTitle: '', quickWords: '' }
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
