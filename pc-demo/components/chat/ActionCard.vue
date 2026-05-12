<template>
  <div class="mt-3">
    <button
      @click="emit('trigger')"
      class="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg hover:bg-green-100 transition-colors"
    >
      <Bookmark :size="12" />
      新增{{ label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bookmark } from 'lucide-vue-next'

const props = defineProps<{ modal: string }>()
const emit = defineEmits<{ trigger: [] }>()

const LABELS: Record<string, string> = {
  quality_hazard_report: '质量隐患排查',
  construction_diary: '施工日志',
}
const label = computed(() => LABELS[props.modal] ?? props.modal)
</script>
