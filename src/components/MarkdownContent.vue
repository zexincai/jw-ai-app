<template>
  <!-- #ifdef H5 -->
  <div class="markdown-body" v-html="rendered" />
  <!-- #endif -->
  <!-- #ifndef H5 -->
  <view class="markdown-body">
    <template v-for="(seg, idx) in segments" :key="idx">
      <MarkdownTable v-if="seg.type === 'table'" :headers="seg.headers" :rows="seg.rows" />
      <rich-text v-else-if="seg.type === 'text' && seg.html" :nodes="seg.html" />
    </template>
  </view>
  <!-- #endif -->
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import MarkdownTable from './MarkdownTable.vue'

marked.setOptions({ breaks: true })

const props = defineProps({
  content: { type: String, default: '' },
})

/** 修正 Markdown 表格中分隔行的列数，使其与表头列数一致，否则 marked 不会将其识别为表格 */
function fixTableSeparators(content) {
  const lines = content.split('\n')
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim()
    const next = lines[i + 1].trim()
    if (!line.startsWith('|') || !next.startsWith('|')) continue
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

function parseTableBlock(block) {
  const lines = block.split('\n').filter(l => l.trim())
  if (lines.length < 2) return null
  const parseCells = line => line.split('|').slice(1, -1).map(c => c.trim())
  const headers = parseCells(lines[0])
  const rows = lines.slice(2).map(parseCells)
  return { headers, rows }
}

/** 将 markdown 按表格拆分为 text / table 段落 */
function splitByTable(content) {
  const lines = content.split('\n')
  const segments = []
  let textLines = []
  let inTable = false
  let tableLines = []

  const flushText = () => {
    const t = textLines.join('\n').trim()
    if (t) segments.push({ type: 'text', raw: t })
    textLines = []
  }
  const flushTable = () => {
    const parsed = parseTableBlock(tableLines.join('\n'))
    if (parsed) segments.push({ type: 'table', ...parsed })
    tableLines = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!inTable) {
        flushText()
        inTable = true
      }
      tableLines.push(trimmed)
    } else {
      if (inTable) {
        flushTable()
        inTable = false
      }
      textLines.push(line)
    }
  }
  if (inTable) flushTable()
  else flushText()
  return segments
}

// #ifdef H5
const rendered = computed(() => {
  const fixed = fixTableSeparators(props.content || '')
  return marked(fixed)
})
// #endif

// #ifndef H5
const segments = computed(() => {
  const fixed = fixTableSeparators(props.content || '')
  return splitByTable(fixed).map(seg => {
    if (seg.type === 'table') return seg
    return { type: 'text', html: marked(seg.raw) }
  }).filter(seg => seg.type === 'table' || seg.html?.trim())
})
// #endif
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.markdown-body {
  font-size: 28rpx;
  line-height: 1.7;
  color: $on-surface;
  word-break: break-word;

  :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 16rpx 0;
    font-size: 24rpx;
  }

  :deep(th),
  :deep(td) {
    border: 1px solid $outline-variant;
    padding: 12rpx 16rpx;
    text-align: left;
  }

  :deep(th) {
    background-color: $surface-container-low;
    font-weight: 600;
  }

  :deep(tr:nth-child(even) td) {
    background-color: $surface-container-lowest;
  }
}
</style>
