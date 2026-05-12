<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/20 backdrop-blur-[2px]" @click="emit('close')" />
      <div class="relative w-[700px] max-w-[92vw] h-[460px] bg-white rounded-2xl shadow-2xl flex overflow-hidden">

        <!-- 左侧导航 -->
        <div class="flex flex-col p-5 border-r border-gray-100 w-44 shrink-0">
          <h2 class="mb-5 text-base font-semibold text-gray-800">设置</h2>
          <nav class="flex flex-col gap-0.5">
            <button v-for="tab in tabs" :key="tab.id" @click="active = tab.id" :class="[
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left',
              active === tab.id
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            ]">
              <component :is="tab.icon" :size="14" />
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <!-- 右侧内容 -->
        <div class="flex flex-col flex-1 min-w-0 min-h-0">

          <!-- 通用设置 -->
          <div v-if="active === 'general'" class="flex-1 p-6 overflow-y-auto">
            <h3 class="mb-5 text-sm font-semibold text-gray-700">通用设置</h3>
            <div class="space-y-3">
              <!-- 用户信息卡片 -->
              <div class="overflow-hidden border border-gray-100 rounded-xl">
                <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <span class="text-sm text-gray-700">头像</span>
                  <div class="w-10 h-10 overflow-hidden bg-gray-100 rounded-full shrink-0">
                    <img v-if="userInfo?.portraitUrl" :src="userInfo.portraitUrl" class="object-cover w-full h-full" />
                    <div v-else class="flex items-center justify-center w-full h-full text-xs text-gray-400">
                      <UserCircle :size="28" />
                    </div>
                  </div>
                </div>
                <div class="flex items-center justify-between px-5 py-4">
                  <span class="text-sm text-gray-700">姓名</span>
                  <span class="text-sm text-gray-500">{{ userInfo?.realName || '—' }}</span>
                </div>
              </div>

              <!-- 退出登录 -->
              <div class="px-5 py-4 border border-gray-100 rounded-xl">
                <button @click="handleLogout"
                  class="w-full px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors">
                  退出登录
                </button>
              </div>
            </div>
          </div>

          <!-- 用量统计 -->
          <div v-else-if="active === 'usage'" class="flex-1 p-6 overflow-y-auto">
            <h3 class="mb-5 text-sm font-semibold text-gray-700">用量统计</h3>
            <div v-if="store.usage" class="grid grid-cols-2 gap-3">
              <div class="p-4 bg-gray-50 rounded-xl">
                <div class="text-xs text-gray-400 mb-1.5">输入 Token</div>
                <div class="text-2xl font-semibold tracking-tight text-gray-800">{{ fmtNum(store.usage.inputTokens) }}
                </div>
              </div>
              <div class="p-4 bg-gray-50 rounded-xl">
                <div class="text-xs text-gray-400 mb-1.5">输出 Token</div>
                <div class="text-2xl font-semibold tracking-tight text-gray-800">{{ fmtNum(store.usage.outputTokens) }}
                </div>
              </div>
              <div class="p-4 bg-gray-50 rounded-xl">
                <div class="text-xs text-gray-400 mb-1.5">累计费用</div>
                <div class="text-2xl font-semibold tracking-tight text-gray-800">${{ (store.usage.totalCostUsd ??
                  0).toFixed(4) }}</div>
              </div>
              <div class="p-4 bg-gray-50 rounded-xl">
                <div class="text-xs text-gray-400 mb-1.5">消息总数</div>
                <div class="text-2xl font-semibold tracking-tight text-gray-800">{{ fmtNum(store.usage.totalMessages) }}
                </div>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center h-48 gap-2 text-gray-300">
              <BarChart2 :size="32" />
              <p class="text-sm">暂无用量数据，连接后自动刷新</p>
            </div>
            <p v-if="store.usage" class="mt-4 text-xs text-gray-300">
              最后更新：{{ new Date(store.usage.lastUpdated).toLocaleString() }}
            </p>
          </div>

          <!-- 定时任务 -->
          <div v-else-if="active === 'timing'" class="flex-1 p-6 overflow-y-auto">
            <h3 class="mb-5 text-sm font-semibold text-gray-700">定时任务</h3>
            <div v-if="timingLoading" class="flex items-center justify-center h-24 text-sm text-gray-400">加载中…</div>
            <div v-else-if="userTasks.length === 0" class="flex items-center justify-center h-24 text-sm text-gray-400">暂无定时任务</div>
            <div v-else class="space-y-3">
              <div v-for="task in userTasks" :key="task.code" class="p-4 border border-gray-100 rounded-xl">
                <!-- 任务标题 + 开关 -->
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-700">{{ task.name }}</span>
                  <!-- Toggle switch -->
                  <button
                    @click="handleToggle(task)"
                    :class="[
                      'relative inline-flex w-10 h-5.5 rounded-full transition-colors shrink-0',
                      task.enabled ? 'bg-blue-500' : 'bg-gray-200'
                    ]"
                    style="height:22px;width:40px;"
                  >
                    <span
                      :class="[
                        'absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform',
                        task.enabled ? 'translate-x-[18px]' : 'translate-x-0'
                      ]"
                      style="width:18px;height:18px;"
                    />
                  </button>
                </div>
                <!-- 未启用提示 -->
                <div v-if="!task.enabled" class="py-4 mt-3 text-sm text-center text-gray-300 rounded-lg bg-gray-50">
                  未启用
                </div>
                <!-- 已启用时展示已配置的时间 -->
                <div v-else class="mt-3 space-y-1">
                  <div
                    v-for="(rule, ri) in task.rules"
                    :key="ri"
                    class="flex items-center gap-2 text-xs text-gray-500"
                  >
                    <span class="text-gray-400">{{ ri + 1 }}.</span>
                    <span>{{ ruleLabel(rule) }}</span>
                    <span v-if="rule.workType === 0">{{ rule.taskDate }}</span>
                    <span>{{ padTime(rule.hour) }}:{{ padTime(rule.minute) }}</span>
                  </div>
                  <button
                    @click="openTimingModal(task)"
                    class="mt-1 text-xs text-blue-500 transition-colors hover:text-blue-600"
                  >编辑触发时间</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 关于我们 -->
          <div v-else-if="active === 'about'" class="flex flex-col flex-1">
            <div class="flex-1 px-6 py-6 overflow-y-auto">
              <div class="flex flex-col items-center gap-3 mb-6">
                <img :src="logoUrl" class="object-cover w-16 h-16 shadow-md rounded-2xl" alt="JClaw Logo" />
                <div class="text-base font-semibold text-gray-800">JClaw</div>
                <div class="flex items-center w-full max-w-sm gap-3 px-4 py-3 mt-1 bg-gray-50 rounded-xl">
                  <span class="text-xs text-gray-500">当前版本</span>
                  <span class="text-xs font-medium text-gray-700">{{ currentVersion || 'v1.0.0' }}</span>
                  <span class="flex-1" />
                  <button
                    :disabled="loadingVersions"
                    class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    @click="loadVersionInfo">{{ loadingVersions ? '加载中...' : '版本日志' }}</button>
                </div>
              </div>

              <!-- 版本日志列表 -->
              <div v-if="versionList.length > 0" class="max-w-sm mx-auto overflow-hidden border border-gray-100 rounded-xl">
                <div class="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <h4 class="text-sm font-medium text-gray-700">版本更新日志</h4>
                </div>
                <div class="max-h-[240px] overflow-y-auto">
                  <div v-for="(version, index) in versionList" :key="index"
                    class="px-4 py-3 transition-colors border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <div class="flex items-start justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-gray-800">{{ version.versionCode }}</span>
                        <span v-if="version.forceStatus === '1'"
                          class="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded">强制</span>
                        <span v-if="version.enableStatus === 1"
                          class="px-2 py-0.5 bg-yellow-50 text-yellow-600 text-xs rounded">待更新</span>
                        <span v-else-if="version.enableStatus === 2"
                          class="px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded">已更新</span>
                      </div>
                    </div>
                    <p v-if="version.updateContent" class="mb-2 text-xs text-gray-600 whitespace-pre-wrap">{{
                      version.updateContent }}</p>
                    <div class="flex flex-col gap-1 text-xs text-gray-400">
                      <span v-if="version.updateBeginTime">开始: {{ formatDate(version.updateBeginTime) }}</span>
                      <span v-if="version.updateEndTime">结束: {{ formatDate(version.updateEndTime) }}</span>
                    </div>
                    <p v-if="version.remark" class="mt-2 text-xs text-gray-400">{{ version.remark }}</p>
                  </div>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-else-if="!loadingVersions && hasLoadedVersions"
                class="max-w-sm px-4 py-8 mx-auto text-center border border-gray-100 rounded-xl">
                <p class="text-sm text-gray-400">暂无版本更新记录</p>
              </div>
            </div>
            <div class="py-4 text-center border-t border-gray-100">
              <button class="text-xs text-gray-400 transition-colors hover:text-gray-600">服务协议</button>
              <span class="mx-2 text-xs text-gray-200">｜</span>
              <button class="text-xs text-gray-400 transition-colors hover:text-gray-600">隐私保护协议</button>
            </div>
          </div>

        </div>
      </div>

      <!-- 设置触发时间 弹窗（叠在设置弹窗之上） -->
      <div v-if="timingModalVisible" class="absolute inset-0 z-10 flex items-center justify-center bg-black/20 rounded-2xl">
        <div class="bg-white rounded-xl shadow-xl w-[480px] p-5">
          <h4 class="mb-4 text-sm font-semibold text-gray-800">设置触发时间</h4>
          <div class="mb-5 space-y-2">
            <div v-for="(row, idx) in modalRows" :key="idx" class="flex flex-wrap items-center gap-1.5 border border-gray-100 rounded-lg p-2">
              <span class="text-xs text-gray-400 shrink-0">{{ idx + 1 }}.</span>
              <!-- 工作类型：单次 / 重复 -->
              <select
                v-model.number="row.workType"
                class="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-200 rounded outline-none focus:border-blue-400 shrink-0"
              >
                <option :value="0">单次</option>
                <option :value="1">重复</option>
              </select>
              <!-- 重复子类型 -->
              <select
                v-if="row.workType === 1"
                v-model.number="row.circulateType"
                class="px-2 py-1 text-xs text-gray-700 bg-white border border-gray-200 rounded outline-none focus:border-blue-400 shrink-0"
              >
                <option :value="0">每日</option>
                <option :value="1">每周</option>
                <option :value="2">每月</option>
                <option :value="3">每年</option>
              </select>
              <!-- 日期：仅单次 -->
              <DatePicker v-if="row.workType === 0" v-model="row.taskDate" />
              <!-- 每周 / 每月 / 每年：input-like 触发器 -->
              <div
                v-if="row.workType === 1 && (row.circulateType === 1 || row.circulateType === 2 || row.circulateType === 3)"
                @click="openPicker(idx, $event)"
                :class="[
                  'flex items-center gap-1.5 px-2 py-1 border rounded text-xs cursor-pointer select-none shrink-0 min-w-[120px] transition-colors',
                  activePickerIdx === idx
                    ? 'border-blue-400 ring-1 ring-blue-100'
                    : 'border-gray-200 hover:border-blue-400'
                ]"
              >
                <span class="text-gray-400 shrink-0 text-[10px]">📅</span>
                <span class="text-gray-500 truncate pointer-events-none">
                  {{ row.circulateType === 1
                    ? (weekDaysDisplay(row.weekDays) || '请选择')
                    : row.circulateType === 2
                      ? (monthDaysDisplay(row.monthDays) || '请选择')
                      : (yearDatesDisplay(row.yearDates) || '请选择') }}
                </span>
              </div>
              <!-- 时间 -->
              <TimePicker v-model="row.timeStr" />
              <!-- 删除 -->
              <button
                @click="removeRow(idx)"
                :disabled="modalRows.length === 1"
                class="flex items-center justify-center w-6 h-6 text-sm font-bold text-red-400 border border-red-300 rounded shrink-0 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >-</button>
              <!-- 新增（仅最后一行） -->
              <button
                v-if="idx === modalRows.length - 1"
                @click="addRow"
                class="flex items-center justify-center w-6 h-6 text-sm font-bold text-green-500 border border-green-400 rounded shrink-0 hover:bg-green-50"
              >+</button>
              <span v-else class="w-6 shrink-0" />
            </div>
          </div>
          <!-- 周/月选择浮层（fixed 逃出 overflow:hidden） -->
          <template v-if="activePickerIdx !== null && modalRows[activePickerIdx]">
            <div class="fixed inset-0 z-[200]" @click="activePickerIdx = null" />
            <div
              class="fixed z-[201] bg-white border border-gray-200 rounded-lg shadow-xl p-3"
              :style="{ top: pickerPos.top + 'px', left: pickerPos.left + 'px' }"
            >
              <!-- 每周 -->
              <div v-if="modalRows[activePickerIdx].circulateType === 1" class="flex gap-1">
                <button
                  v-for="(label, wi) in ['周一','周二','周三','周四','周五','周六','周日']"
                  :key="wi"
                  @click.stop="toggleWeekDay(modalRows[activePickerIdx], wi + 1)"
                  :class="[
                    'text-xs px-2 py-1 rounded border transition-colors',
                    modalRows[activePickerIdx].weekDays.includes(wi + 1)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-200 text-gray-600 hover:border-blue-400'
                  ]"
                >{{ label }}</button>
              </div>
              <!-- 每月 -->
              <div v-else-if="modalRows[activePickerIdx].circulateType === 2" class="flex flex-wrap gap-1" style="width:198px">
                <button
                  v-for="d in 31"
                  :key="d"
                  @click.stop="toggleMonthDay(modalRows[activePickerIdx], d)"
                  :class="[
                    'text-[11px] flex items-center justify-center rounded border transition-colors',
                    modalRows[activePickerIdx].monthDays.includes(d)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-200 text-gray-600 hover:border-blue-400'
                  ]"
                  style="width:24px;height:24px;"
                >{{ d }}</button>
              </div>
              <!-- 每年 -->
              <div v-else class="w-56">
                <div class="flex items-center gap-1.5 mb-2">
                  <select
                    v-model.number="pickerYearMonth"
                    @click.stop
                    class="text-xs border border-gray-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 bg-white"
                  >
                    <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
                  </select>
                  <input
                    type="number"
                    v-model.number="pickerYearDay"
                    min="1" max="31"
                    @click.stop
                    placeholder="日"
                    class="text-xs border border-gray-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 w-14"
                  />
                  <button
                    @click.stop="addYearDate"
                    class="px-2 py-1 text-xs text-white transition-colors bg-blue-500 rounded hover:bg-blue-600 shrink-0"
                  >添加</button>
                </div>
                <div class="flex flex-wrap gap-1 min-h-[24px]">
                  <template v-if="modalRows[activePickerIdx].yearDates.length">
                    <span
                      v-for="md in [...modalRows[activePickerIdx].yearDates].sort()"
                      :key="md"
                      class="flex items-center gap-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5"
                    >
                      {{ formatYearDate(md) }}
                      <button @click.stop="removeYearDate(md)" class="text-blue-400 hover:text-red-500 leading-none ml-0.5">×</button>
                    </span>
                  </template>
                  <span v-else class="text-xs text-gray-400">暂未添加</span>
                </div>
              </div>
            </div>
          </template>

          <div class="flex justify-end gap-2">
            <button
              @click="timingModalVisible = false; activePickerIdx = null"
              class="px-4 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >取消</button>
            <button
              @click="confirmTimingModal"
              :disabled="timingSaving"
              class="px-4 py-1.5 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >{{ timingSaving ? '保存中…' : '确定' }}</button>
          </div>
        </div>
      </div>

    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Settings, BarChart2, Info, UserCircle, Clock } from 'lucide-vue-next'
import DatePicker from './DatePicker.vue'
import TimePicker from './TimePicker.vue'
import { useChatStore } from '../../stores/chat'
import { useAuth } from '../../composables/useAuth'
import {
  getPersonalUserInfo, getMobileVersionInfo,
  findDictByType, searchTimingTaskByUserId, saveOrUpdateTimingTask,
  type EngAgentUserVo, type EngVersionVo, type AgentTimingTaskVo,
} from '../../api/agent'
import logoUrl from '../../assets/logo.png'

const emit = defineEmits<{ close: [] }>()
const store = useChatStore()
const { logout } = useAuth()

const tabs = [
  { id: 'general', label: '通用设置', icon: Settings },
  { id: 'timing', label: '定时任务', icon: Clock },
  // { id: 'usage', label: '用量统计', icon: BarChart2 },
  { id: 'about', label: '关于我们', icon: Info },
]

const active = ref('general')
const userInfo = ref<EngAgentUserVo | null>(null)
const versionList = ref<EngVersionVo[]>([])
const loadingVersions = ref(false)
const hasLoadedVersions = ref(false)
const currentVersion = ref('')

// ── 定时任务 ──────────────────────────────────────────────────

interface TimeRow {
  workType: number       // 0=单次, 1=重复
  circulateType: number  // 重复子类型: 0=每日, 1=每周, 2=每月, 3=每年
  taskDate: string       // 单次: yyyy-MM-dd
  timeStr: string        // 'HH:mm'
  weekDays: number[]     // 每周多选: 1=周一 … 7=周日
  monthDays: number[]    // 每月多选: 1-31
  yearDates: string[]    // 每年多选: 'MM-DD'
}

interface UserTask {
  code: number
  name: string
  enabled: boolean
  rules: Array<{ workType: number; circulateType: number; taskDate: string; weekDays: number[]; monthDays: number[]; yearDates: string[]; hour: number; minute: number }>
}

const timingLoading = ref(false)
const userTasks = ref<UserTask[]>([])
const timingLoaded = ref(false)

// 弹窗状态
const timingModalVisible = ref(false)
const timingSaving = ref(false)
const modalTask = ref<UserTask | null>(null)
const modalRows = ref<TimeRow[]>([])

// 周/月选择器弹层
const activePickerIdx = ref<number | null>(null)
const pickerPos = ref({ top: 0, left: 0 })

function openPicker(idx: number, event: MouseEvent) {
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  pickerPos.value = { top: rect.bottom + 4, left: rect.left }
  activePickerIdx.value = activePickerIdx.value === idx ? null : idx
}

const WEEK_LABELS: Record<number, string> = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日' }

function formatYearDate(md: string) {
  const [m, d] = md.split('-').map(Number)
  return `${m}月${d}日`
}

function weekDaysDisplay(days: number[]) {
  return [...days].sort((a, b) => a - b).map(d => WEEK_LABELS[d]).join('、')
}
function monthDaysDisplay(days: number[]) {
  return [...days].sort((a, b) => a - b).map(d => `${d}日`).join('、')
}
function yearDatesDisplay(dates: string[]) {
  return [...dates].sort().map(formatYearDate).join('、')
}

function ruleLabel(rule: { workType: number; circulateType: number; weekDays: number[]; monthDays: number[]; yearDates: string[] }) {
  if (rule.workType === 0) return '单次'
  const ct = rule.circulateType
  if (ct === 0) return '每日'
  if (ct === 1) {
    const days = [...rule.weekDays].sort((a, b) => a - b).map(d => WEEK_LABELS[d]).join('、')
    return `每周 ${days || '-'}`
  }
  if (ct === 2) {
    const days = [...rule.monthDays].sort((a, b) => a - b).join('、')
    return `每月 ${days || '-'}日`
  }
  // 每年
  const dates = [...rule.yearDates].sort().map(formatYearDate).join('、')
  return `每年 ${dates || '-'}`
}
function padTime(n?: number) { return String(n ?? 0).padStart(2, '0') }

function today() {
  return new Date().toISOString().slice(0, 10)
}

function defaultRow(): TimeRow {
  return { workType: 0, circulateType: 0, taskDate: today(), timeStr: '08:00', weekDays: [], monthDays: [], yearDates: [] }
}

async function loadTimingTasks() {
  if (timingLoaded.value || timingLoading.value) return
  timingLoading.value = true
  try {
    const [userRes, dictRes, taskRes] = await Promise.all([
      getPersonalUserInfo(),
      findDictByType(82),
      searchTimingTaskByUserId(),
    ])
    const info: EngAgentUserVo = (userRes as any).data ?? {}
    const dictItems: any[] = (dictRes as any).data ?? []
    const taskConfigs: AgentTimingTaskVo[] = (taskRes as any).data ?? []

    userInfo.value = info

    const codes: number[] = info.timingTaskCodeList ?? []
    userTasks.value = codes.map(code => {
      const dictItem = dictItems.find(d => String(d.keyName) === String(code))
      const config = taskConfigs.find(t => t.taskCode === code)
      const rules = (config?.timingTaskRuleList ?? []).map(rule => {
        const details = rule.timingTaskRuleDetailsList ?? []
        const first = details[0] ?? {}
        const [h, m] = ((first.taskStartTime as string) ?? '08:00').split(':').map(Number)
        const ct = rule.circulateType ?? 0
        return {
          workType: rule.workType ?? 0,
          circulateType: ct,
          taskDate: first.taskDate ?? today(),
          weekDays: ct === 1 ? details.map(d => d.dayNum ?? 0).filter(Boolean) : [],
          monthDays: ct === 2 ? details.map(d => d.dayNum ?? 0).filter(Boolean) : [],
          yearDates: ct === 3 ? details.map(d => d.taskDate ?? '').filter(Boolean).map(dt => dt.length > 5 ? dt.slice(5) : dt) : [],
          hour: isNaN(h) ? 8 : h,
          minute: isNaN(m) ? 0 : m,
        }
      })
      return {
        code,
        name: dictItem?.keyVal ?? `任务${code}`,
        enabled: config?.enableStatus === 0,
        rules,
      }
    })
  } catch { /* 静默失败 */ } finally {
    timingLoading.value = false
    timingLoaded.value = true
  }
}

// 切换到定时任务 tab 时加载
watch(active, (val) => {
  if (val === 'timing') loadTimingTasks()
})

function openTimingModal(task: UserTask) {
  modalTask.value = task
  modalRows.value = task.rules.length > 0
    ? task.rules.map(r => ({
        workType: r.workType,
        circulateType: r.circulateType,
        taskDate: r.taskDate,
        timeStr: `${padTime(r.hour)}:${padTime(r.minute)}`,
        weekDays: [...r.weekDays],
        monthDays: [...r.monthDays],
        yearDates: [...r.yearDates],
      }))
    : [defaultRow()]
  timingModalVisible.value = true
}

function handleToggle(task: UserTask) {
  if (task.enabled) {
    // 关闭：直接保存 enableStatus=1（禁用）
    task.enabled = false
    saveOrUpdateTimingTask({ taskCode: task.code, enableStatus: 1 }).catch(() => {
      task.enabled = true
    })
  } else {
    // 开启：弹出时间配置弹窗
    openTimingModal(task)
  }
}

// 每年选择器临时状态
const pickerYearMonth = ref(1)
const pickerYearDay = ref(1)

function addYearDate() {
  if (activePickerIdx.value === null) return
  const row = modalRows.value[activePickerIdx.value]
  if (!row) return
  const md = `${String(pickerYearMonth.value).padStart(2, '0')}-${String(pickerYearDay.value).padStart(2, '0')}`
  if (!row.yearDates.includes(md)) row.yearDates.push(md)
}

function removeYearDate(md: string) {
  if (activePickerIdx.value === null) return
  const row = modalRows.value[activePickerIdx.value]
  if (!row) return
  const i = row.yearDates.indexOf(md)
  if (i >= 0) row.yearDates.splice(i, 1)
}

function toggleWeekDay(row: TimeRow, day: number) {
  const i = row.weekDays.indexOf(day)
  if (i >= 0) row.weekDays.splice(i, 1)
  else row.weekDays.push(day)
}

function toggleMonthDay(row: TimeRow, day: number) {
  const i = row.monthDays.indexOf(day)
  if (i >= 0) row.monthDays.splice(i, 1)
  else row.monthDays.push(day)
}

function addRow() {
  modalRows.value.push(defaultRow())
}

function removeRow(idx: number) {
  if (modalRows.value.length > 1) modalRows.value.splice(idx, 1)
}

async function confirmTimingModal() {
  if (!modalTask.value || timingSaving.value) return
  timingSaving.value = true
  try {
    const ruleList = modalRows.value.map(row => {
      const time = `${row.timeStr}:00`
      if (row.workType === 0) {
        return { workType: 0, timingTaskRuleDetailsList: [{ dayNum: 0, taskDate: row.taskDate, taskStartTime: time }] }
      }
      const ct = row.circulateType
      if (ct === 0) {
        return { workType: 1, circulateType: 0, timingTaskRuleDetailsList: [{ dayNum: 0, taskStartTime: time }] }
      } else if (ct === 1) {
        return { workType: 1, circulateType: 1, timingTaskRuleDetailsList: row.weekDays.map(d => ({ dayNum: d, taskStartTime: time })) }
      } else if (ct === 2) {
        return { workType: 1, circulateType: 2, timingTaskRuleDetailsList: row.monthDays.map(d => ({ dayNum: d, taskStartTime: time })) }
      } else {
        const year = new Date().getFullYear()
        return { workType: 1, circulateType: 3, timingTaskRuleDetailsList: row.yearDates.map(md => ({ dayNum: 0, taskDate: `${year}-${md}`, taskStartTime: time })) }
      }
    })
    await saveOrUpdateTimingTask({
      taskCode: modalTask.value.code,
      enableStatus: 0,
      timingTaskRuleList: ruleList,
    })
    // 更新本地状态
    const task = modalTask.value
    task.enabled = true
    task.rules = modalRows.value.map(row => {
      const [h, m] = row.timeStr.split(':').map(Number)
      return { workType: row.workType, circulateType: row.circulateType, taskDate: row.taskDate, weekDays: [...row.weekDays], monthDays: [...row.monthDays], yearDates: [...row.yearDates], hour: h, minute: m }
    })
    timingModalVisible.value = false
  } catch { /* 静默失败 */ } finally {
    timingSaving.value = false
  }
}

// ──────────────────────────────────────────────────────────────

onMounted(async () => {
  try {
    const res = await getPersonalUserInfo()
    userInfo.value = (res as any).data ?? null
  } catch { /* ignore */ }
})

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

async function loadVersionInfo() {
  if (loadingVersions.value) return

  loadingVersions.value = true
  hasLoadedVersions.value = true

  try {
    // mobileType: PC端(PC端: 2, 智能体-PC端: 6, 智能体-移动端: 7)
    const res = await getMobileVersionInfo('6')
    versionList.value = res.data || []

    // 设置当前版本为最新版本
    if (versionList.value.length > 0) {
      currentVersion.value = versionList.value[0].versionCode || 'v1.0.0'
    }
  } catch (err) {
    console.error('获取版本信息失败:', err)
    versionList.value = []
  } finally {
    loadingVersions.value = false
  }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

function handleLogout() {
  logout()
  emit('close')
}
</script>
