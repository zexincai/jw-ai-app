<template>
  <div
    class="prose prose-sm prose-gray max-w-none text-gray-800
           prose-p:my-1 prose-p:leading-relaxed
           prose-headings:font-semibold prose-headings:text-gray-800
           prose-table:text-xs prose-td:py-1 prose-th:py-1
           prose-ul:my-1 prose-ol:my-1 prose-li:my-0
           prose-code:text-pink-600 prose-code:bg-pink-50 prose-code:px-1 prose-code:rounded
           prose-pre:bg-gray-900 prose-pre:text-gray-100"
    :class="{ 'streaming-cursor': streaming, 'action-disabled': disabled }"
    v-html="rendered"
    @click="disabled ? null : handleContainerClick($event)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import { useIframeBridge } from '../../composables/useIframeBridge'

marked.setOptions({ breaks: true })

const props = defineProps<{
  content: string
  streaming?: boolean
  disabled?: boolean
}>()

const bridge = useIframeBridge()

function detectPlatformTag(): string {
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__ELECTRON__) return 'deskAction'
  if (typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)) return 'appAction'
  return 'pcAction'
}

/** 修正 Markdown 表格中分隔行的列数，使其与表头列数一致，否则 marked 不会将其识别为表格 */
function fixTableSeparators(content: string): string {
  const lines = content.split('\n')
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim()
    const next = lines[i + 1].trim()
    if (!line.startsWith('|') || !next.startsWith('|')) continue
    // 判断下一行是否为分隔行（每个单元格只含 -、:、空格）
    const cells = next.split('|').slice(1, -1)
    if (!cells.length || !cells.every(c => /^[\s\-:]+$/.test(c))) continue
    const headerCols = line.split('|').slice(1, -1).length
    const sepCols = cells.length
    if (headerCols !== sepCols && headerCols > 0) {
      lines[i + 1] = '|' + ' --- |'.repeat(headerCols)
    }
  }
  return lines.join('\n')
}

function preprocessActions(content: string): string {
  const tag = detectPlatformTag()
  const patterns = [
    new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'gi'),
    new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'gi'),
  ]

  // 第一步：用占位符替换 action 标签，避免 marked 解析表格时破坏结构
  const buttonMap = new Map<string, string>()
  let counter = 0
  let result = content
  for (const re of patterns) {
    result = result.replace(re, (_, json) => {
      try {
        const data = JSON.parse(json.trim())
        const escaped = JSON.stringify(data).replace(/"/g, '&quot;')
        const key = `PCACTION_PLACEHOLDER_${counter++}_END`
        buttonMap.set(key, `<button class="pc-action-inline-btn" data-action="${escaped}">${data.label || '操作'}</button>`)
        return key
      } catch {
        return ''
      }
    })
  }

  // 第二步：修正表格分隔行列数（AI 生成的表格分隔行列数可能与表头不匹配，导致 marked 无法识别）
  result = fixTableSeparators(result)

  // 第三步：marked 解析（占位符是普通文本，不会被干扰）
  let html = marked.parse(result) as string

  // 第四步：还原占位符为按钮 HTML
  for (const [key, btn] of buttonMap) {
    html = html.replaceAll(key, btn)
  }
  return html
}

const rendered = computed(() => preprocessActions(props.content || ''))

function handleContainerClick(e: MouseEvent) {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('.pc-action-inline-btn')
  if (!btn) return
  try {
    const payload = JSON.parse(btn.dataset.action || '')
    bridge.dispatchAction(payload)
  } catch { /* ignore */ }
}
</script>

<style scoped>
:deep(.pc-action-inline-btn) {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  font-size: 12px;
  color: #3b82f6;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  white-space: nowrap;
}
:deep(.pc-action-inline-btn:hover) {
  background: #dbeafe;
}
.action-disabled :deep(.pc-action-inline-btn) {
  cursor: not-allowed;
  color: #9ca3af;
  background: #f3f4f6;
  border-color: #d1d5db;
}
</style>
