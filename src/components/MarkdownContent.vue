<template>
  <!-- #ifdef H5 -->
  <div class="markdown-body" v-html="rendered" />
  <!-- #endif -->
  <!-- #ifndef H5 -->
  <rich-text :nodes="rendered" class="markdown-body" />
  <!-- #endif -->
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  content: { type: String, default: '' },
})

const rendered = computed(() => marked(props.content || ''))
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.markdown-body {
  font-size: 28rpx;
  line-height: 1.7;
  color: $on-surface;
  word-break: break-word;
}
</style>
